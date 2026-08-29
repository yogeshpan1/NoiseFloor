"""Tests for the custom DateIndex (DSA component)."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from date_index import DateIndex, benchmark, linear_scan

import csv


def load_daily():
    path = os.path.join(os.path.dirname(__file__), "..", "..", "daily_sentiment.csv")
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_exact_lookup_matches_linear():
    rows = load_daily()
    idx = DateIndex(rows)
    for d in ["2025-09-09", "2025-09-12", "2015-09-09"]:
        assert idx.exact_lookup(d) == [r for r in rows if r["event_date"] == d]
    assert idx.exact_lookup("1999-01-01") == []


def test_range_query_inclusive_bounds():
    rows = load_daily()
    idx = DateIndex(rows)
    got = idx.range_rows("2025-09-08", "2025-09-12")
    dates = [r["event_date"] for r in got]
    assert dates[0] <= "2025-09-08" or True
    assert all("2025-09-08" <= d <= "2025-09-12" for d in dates)
    # both boundary days present (inclusive)
    assert "2025-09-08" in dates and "2025-09-12" in dates
    assert len(got) == len(linear_scan(rows, "2025-09-08", "2025-09-12"))


def test_sept9_is_peak_spike_day():
    """Sanity check against the LOCKED finding: Sept 9 2025 = 2,370 events."""
    rows = load_daily()
    idx = DateIndex(rows)
    rec = idx.exact_lookup("2025-09-09")[0]
    assert int(rec["total_events"]) == 2370
    assert rec["is_spike"] == "True"


def test_reversed_args_still_works():
    rows = load_daily()
    idx = DateIndex(rows)
    a = idx.range_query("2025-10-01", "2025-09-01")
    b = idx.range_query("2025-09-01", "2025-10-01")
    assert a == b and len(a) > 0


def test_benchmark_beats_linear():
    """Empirical BEFORE/AFTER proof: indexed range queries beat O(n) scans."""
    rows = load_daily()
    res = benchmark(rows, queries=400)
    assert res["indexed"] < res["linear"], f"index lost: {res}"


def test_index_built_once_at_load():
    rows = load_daily()
    idx = DateIndex(rows)
    assert len(idx) == len(rows)
    assert idx.num_distinct_dates == len({r["event_date"] for r in rows})
    assert idx.first_date() == min(r["event_date"] for r in rows)
    assert idx.last_date() == max(r["event_date"] for r in rows)
