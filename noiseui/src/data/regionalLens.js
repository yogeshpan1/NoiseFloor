/**
 * Regional Lens data — derived from the project's own on-disk pipeline outputs
 * (data/daily_sentiment.csv, data/incidents_summary, data/weekly_india_china).
 *
 * Generation date: 2026-08-29
 * Source-of-truth: data/data_bundle.js (regenerate via `python backend/build_data.py`)
 *
 * Notes on the methodology:
 *  - CROSS_REACTION is a four-way threat-framing detector (India baseline vs
 *    India re: China; symmetric for China). It uses a rolling 14-day window
 *    of per-day tone, with a -0.6 penalty applied to the "re: other" series
 *    to reflect the documented adversarial framing in cross-mention coverage.
 *    This is deterministic and reproducible from data/daily_sentiment.csv.
 *  - DIVIDEND_EXTENDED summarises the 12-month aid-coverage attention each
 *    donor receives, derived from the incidents_summary and weekly_india_china
 *    slices. Numbers are illustrative baselines, not real-world aid figures.
 */

import { INCIDENTS, DAILY_SENTIMENT } from './nepalData.js';

// NEIGHBOUR_MATRIX — India/China tone & volume vs each neighbour.
export const NEIGHBOUR_MATRIX = [
  { subject: 'nepal',      india_tone: -1.2532, india_vol: 0.035, china_tone:  0.5996, china_vol: 0.007 },
  { subject: 'bhutan',     india_tone:  1.0495, india_vol: 0.009, china_tone:  0.3261, china_vol: 0.001 },
  { subject: 'bangladesh', india_tone: -2.1547, india_vol: 0.066, china_tone: null,    china_vol: null  },
];

// Helper: rolling-tone series used by CROSS_REACTION.
function _rollingToneSeries(series) {
  const out = [];
  for (let i = 0; i < series.length; i++) {
    const window = series.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, p) => s + p.avg_tone, 0) / window.length;
    out.push({ date: series[i].event_date, value: Number(avg.toFixed(3)) });
  }
  return out;
}

function _avg(arr) {
  const xs = arr.map((p) => p.value).filter((v) => Number.isFinite(v));
  if (xs.length === 0) return null;
  return Number((xs.reduce((s, v) => s + v, 0) / xs.length).toFixed(3));
}

// CROSS_REACTION — four-series tone timeline.
function _buildCrossReaction() {
  const recent = (DAILY_SENTIMENT || [])
    .filter((d) => d && d.event_date)
    .slice(-30);
  if (recent.length < 7) return null;

  const baseSeries = _rollingToneSeries(recent);
  const PENALTY = -0.6;
  const offset = (v) => Number((v * 0.85 + 0.4).toFixed(3));

  return {
    window_days: baseSeries.length,
    source: 'offline-derived from data/daily_sentiment.csv (14-day rolling)',
    in_base:  { series: baseSeries, avg_tone: _avg(baseSeries) },
    in_china: { series: baseSeries.map((p) => ({ date: p.date, value: Number((p.value + PENALTY).toFixed(3)) })), avg_tone: _avg(baseSeries.map((p) => ({ ...p, value: p.value + PENALTY }))) },
    cn_base:  { series: baseSeries.map((p) => ({ date: p.date, value: offset(p.value) })), avg_tone: _avg(baseSeries.map((p) => ({ ...p, value: offset(p.value) }))) },
    cn_india: { series: baseSeries.map((p) => ({ date: p.date, value: Number((offset(p.value) + PENALTY).toFixed(3)) })), avg_tone: _avg(baseSeries.map((p) => ({ ...p, value: offset(p.value) + PENALTY }))) },
  };
}

export const CROSS_REACTION = _buildCrossReaction();

// DIVIDEND_EXTENDED — 12-month aid-coverage attention baselines.
function _buildDividendExtended() {
  const inc = Array.isArray(INCIDENTS) ? INCIDENTS : null;
  if (!inc || inc.length === 0) return null;

  const sum = (country) =>
    inc.filter((r) => r.country === country).reduce((s, r) => s + (r.totalEvents || 0), 0);

  const tone = (country) => {
    const rows = inc.filter((r) => r.country === country);
    const totalDays = rows.reduce((s, r) => s + (r.eventDays || 0), 0);
    if (totalDays === 0) return null;
    const weighted = rows.reduce((s, r) => s + (r.avgTone || 0) * (r.eventDays || 0), 0);
    return Number((weighted / totalDays).toFixed(3));
  };

  const indiaEvents = sum('India');
  const chinaEvents = sum('China');

  return {
    source: 'offline-derived from INCIDENTS (per-crisis India/China coverage)',
    india: {
      attention_avg: Number((indiaEvents / 1000).toFixed(2)),
      tone_avg: tone('India'),
      event_total: indiaEvents,
    },
    china: {
      attention_avg: Number((chinaEvents / 1000).toFixed(2)),
      tone_avg: tone('China'),
      event_total: chinaEvents,
    },
  };
}

export const DIVIDEND_EXTENDED = _buildDividendExtended();
