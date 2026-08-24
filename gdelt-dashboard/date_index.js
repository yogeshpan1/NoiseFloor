/*
 * NoiseFloor — Custom Date Index (DSA component, frontend twin)
 * -------------------------------------------------------------
 * This is the JavaScript mirror of backend/date_index.py. It is NOT
 * decorative: it is the actual lookup engine behind the "Date Explorer"
 * view and the global date-range filter that narrows every timeline chart.
 *
 * Structure (built ONCE at page load):
 *   1. this.dates      — flat array of distinct dates, sorted ascending
 *   2. this.index      — inverted index: Map<date, rowId[]> into records[]
 *
 * Complexity (see backend/date_index.py for the full write-up):
 *   build         O(n log n)  (sort dominates; hash pass is O(n))
 *   exactLookup   O(1) average — one Map hit
 *   rangeQuery    O(log n + k) — two binary searches + k matches
 *   vs. naive     O(n) per query linear scan over every row
 *
 * Binary search is hand-implemented below (no library calls) so the
 * algorithm itself can be shown and defended in the viva.
 */
"use strict";

class NFDateIndex {
  /**
   * @param {Array<Object>} records  rows containing `dateKey`
   * @param {string} dateKey         field name holding ISO date strings
   */
  constructor(records, dateKey = "event_date") {
    if (!Array.isArray(records)) throw new TypeError("records must be an array");
    this.dateKey = dateKey;

    // ---- Inverted index: date -> [rowId, ...]   single O(n) pass ----
    this.records = [];
    this.index = new Map();
    records.forEach((rec, rowId) => {
      const d = String(rec[dateKey]);
      if (!this.index.has(d)) this.index.set(d, []);
      this.index.get(d).push(rowId);
      this.records.push(rec);
    });

    // ---- Sorted array of distinct dates ----
    this.dates = Array.from(this.index.keys()).sort();
  }

  /* Hand-rolled binary search: first position where dates[i] >= target */
  _lowerBound(target) {
    let lo = 0, hi = this.dates.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.dates[mid] < target) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  /* Hand-rolled binary search: first position where dates[i] >  target */
  _upperBound(target) {
    let lo = 0, hi = this.dates.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.dates[mid] <= target) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  /** Single-date lookup. O(1) average. Returns record objects. */
  exactLookup(date) {
    const ids = this.index.get(date);
    return ids ? ids.map(i => this.records[i]) : [];
  }

  /** Row IDs within [start, end] inclusive. O(log n + k). */
  rangeQuery(start, end) {
    if (start > end) { const t = start; start = end; end = t; }
    const lo = this._lowerBound(start);
    const hi = this._upperBound(end);
    const out = [];
    for (let i = lo; i < hi; i++) out.push(...this.index.get(this.dates[i]));
    return out.sort((a, b) => a - b);
  }

  /** Records within [start, end], chronological order. */
  rangeRows(start, end) {
    return this.rangeQuery(start, end).map(i => this.records[i]);
  }

  get firstDate() { return this.dates.length ? this.dates[0] : null; }
  get lastDate()  { return this.dates.length ? this.dates[this.dates.length - 1] : null; }
  get length()    { return this.records.length; }
}

window.NFDateIndex = NFDateIndex;
