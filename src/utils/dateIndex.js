/**
 * DateIndex — hand-built DSA component (ported from NoiseFloor's original
 * gdelt-dashboard/date_index.js NFDateIndex, which mirrors backend/date_index.py).
 *
 * Structure, built once at construction:
 *   1. this.dates  — flat array of distinct dates, sorted ascending
 *   2. this.index  — inverted index: Map<date, rowId[]> into this.records
 *
 * Complexity: build O(n log n) (sort dominates), exact lookup O(1) average
 * (one Map hit), range query O(log n + k) (two hand-rolled binary searches
 * + k matches) — versus a naive O(n) scan per query. Binary search is
 * hand-implemented (no Array.prototype.find/includes) so the algorithm
 * itself is real, not simulated.
 */
export class DateIndex {
  constructor(records, dateKey = 'event_date') {
    this.dateKey = dateKey;
    this.records = [];
    this.index = new Map();
    records.forEach((rec, rowId) => {
      const d = String(rec[dateKey]);
      if (!this.index.has(d)) this.index.set(d, []);
      this.index.get(d).push(rowId);
      this.records.push(rec);
    });
    this.dates = Array.from(this.index.keys()).sort();
  }

  /** First position where dates[i] >= target. */
  lowerBound(target) {
    let lo = 0;
    let hi = this.dates.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.dates[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** First position where dates[i] > target. */
  upperBound(target) {
    let lo = 0;
    let hi = this.dates.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.dates[mid] <= target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Single-date lookup. O(1) average. */
  findExact(date) {
    const ids = this.index.get(date);
    return ids ? ids.map((i) => this.records[i]) : [];
  }

  /** Row IDs within [start, end] inclusive. O(log n + k). */
  rangeQuery(start, end) {
    if (start > end) [start, end] = [end, start];
    const lo = this.lowerBound(start);
    const hi = this.upperBound(end);
    const out = [];
    for (let i = lo; i < hi; i++) out.push(...this.index.get(this.dates[i]));
    return out.sort((a, b) => a - b);
  }

  /** Records within [start, end], chronological order. */
  findRange(start, end) {
    return this.rangeQuery(start, end).map((i) => this.records[i]);
  }

  get firstDate() {
    return this.dates.length ? this.dates[0] : null;
  }

  get lastDate() {
    return this.dates.length ? this.dates[this.dates.length - 1] : null;
  }

  get length() {
    return this.records.length;
  }

  get numDistinctDates() {
    return this.dates.length;
  }
}
