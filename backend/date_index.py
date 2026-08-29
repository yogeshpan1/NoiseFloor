"""
NoiseFloor — Custom Date Index (DSA component)
==============================================

WHY THIS EXISTS (professor feedback / DSA module requirement)
------------------------------------------------------------
The naive date lookup used everywhere before this file was a linear scan:

    rows = [r for r in records if start <= r["event_date"] <= end]   # O(n)

Every query touched every row. With N rows and Q queries, total cost is
O(Q * N). This module replaces that with ONE hand-implemented index
structure built once at load time:

1. SORTED DATE ARRAY  (`self._dates`)
   All distinct dates, sorted ascending, stored in a flat list.
   A date-range [start, end] is answered with two binary searches:
       lo = lower_bound(start)   # first index with date >= start
       hi = upper_bound(end)     # first index with date >  end
   Every date in positions lo..hi-1 is inside the range.

2. INVERTED INDEX  (`self._index`)
   dict: date -> list of row IDs (positions in the original records array)
   built in a single O(n) pass at construction.
   An exact single-date lookup is one hash hit: O(1).

COMPLEXITY (documented for the viva)
------------------------------------
                    build        exact lookup    range query
    -----------------------------------------------------------
    this index      O(n log n)*  O(1) avg        O(log n + k)
    linear scan     O(1)         O(n)            O(n)

    n = number of rows, k = number of matching rows, * = sort dominates;
    the inverted-index pass itself is O(n).
    k << n on typical queries, so range queries are effectively logarithmic.

BEFORE / AFTER (why it's faster than the naive approach)
--------------------------------------------------------
Before: each dashboard filter re-scanned all ~130 daily rows and all ~96
country rows (and would re-scan ALL 35.5M events at full pipeline scale),
even when the answer was a single day.
After: the index is paid for once at load; every subsequent search costs
O(log n + k). See tests/test_date_index.py::test_benchmark_beats_linear
for an empirical before/after timing comparison — the gap widens with
dataset size because binary search grows as log2(n).

Only ONE structure is used deliberately: a single well-justified,
load-bearing index is easier to defend than several decorative ones.

This Python engine mirrors gdelt-dashboard/date_index.js exactly — the
static frontend uses the JS twin so the same algorithm powers the live UI.
"""

from __future__ import annotations

from bisect import bisect_left, bisect_right
from time import perf_counter
from typing import Any, Dict, List, Sequence


class DateIndex:
    """Sorted-date array + inverted index over a list of record dicts.

    Parameters
    ----------
    records : sequence of dicts; each must contain `date_key`.
              The ORIGINAL list order of row IDs is preserved.
    date_key : name of the field holding the ISO date string ("YYYY-MM-DD").
    """

    def __init__(self, records: Sequence[Dict[str, Any]], date_key: str = "event_date"):
        if not isinstance(records, Sequence):
            raise TypeError("records must be a sequence of dicts")
        self._date_key = date_key

        # ---- Inverted index: date -> [row_id, ...]   (single O(n) pass) ----
        self._index: Dict[str, List[int]] = {}
        self._records: List[Dict[str, Any]] = []
        for row_id, rec in enumerate(records):
            d = str(rec[date_key])
            self._index.setdefault(d, []).append(row_id)
            self._records.append(rec)

        # ---- Sorted array of distinct dates ----
        self._dates: List[str] = sorted(self._index.keys())

    # ------------------------------------------------------------------ #
    # Core queries
    # ------------------------------------------------------------------ #
    def exact_lookup(self, date: str) -> List[Dict[str, Any]]:
        """Single-date lookup. O(1) average: one dict hit + slice."""
        return [self._records[i] for i in self._index.get(date, [])]

    def range_query(self, start: str, end: str) -> List[int]:
        """Row IDs whose date is within [start, end] inclusive.

        Two binary searches locate the window: O(log n);
        collecting k row IDs: O(k). Total: O(log n + k).
        """
        if start > end:
            start, end = end, start
        lo = bisect_left(self._dates, start)          # first date >= start
        hi = bisect_right(self._dates, end)           # first date >  end
        row_ids: List[int] = []
        for i in range(lo, hi):
            row_ids.extend(self._index[self._dates[i]])
        return sorted(row_ids)                        # stable chronological order

    def get_rows(self, row_ids: Sequence[int]) -> List[Dict[str, Any]]:
        """Materialise records for row IDs returned by range_query."""
        return [self._records[i] for i in row_ids]

    def range_rows(self, start: str, end: str) -> List[Dict[str, Any]]:
        """Convenience: records within [start, end], chronological order."""
        return self.get_rows(self.range_query(start, end))

    def first_date(self):
        return self._dates[0] if self._dates else None

    def last_date(self):
        return self._dates[-1] if self._dates else None

    def __len__(self) -> int:
        return len(self._records)

    @property
    def num_distinct_dates(self) -> int:
        return len(self._dates)


# ---------------------------------------------------------------------- #
# Benchmark helper — used by the test-suite to prove the BEFORE/AFTER claim
# ---------------------------------------------------------------------- #
def linear_scan(records, start, end):
    """The OLD approach: O(n) full scan per query (kept only for benchmarking)."""
    return [r for r in records if start <= str(r["event_date"]) <= end]


def benchmark(records, queries=200):
    """Time `queries` range lookups both ways. Returns seconds per approach."""
    idx = DateIndex(records)
    n = len(records)

    t0 = perf_counter()
    for q in range(queries):
        i0 = (q * 7) % n
        i1 = min(n - 1, ((q * 13) + 5) % n)
        s = records[min(i0, i1)]["event_date"]
        e = records[max(i0, i1)]["event_date"]
        idx.range_query(s, e)
    indexed = perf_counter() - t0

    t0 = perf_counter()
    for q in range(queries):
        i0 = (q * 7) % n
        i1 = min(n - 1, ((q * 13) + 5) % n)
        s = records[min(i0, i1)]["event_date"]
        e = records[max(i0, i1)]["event_date"]
        linear_scan(records, s, e)
    linear = perf_counter() - t0

    return {"indexed": indexed, "linear": linear}

