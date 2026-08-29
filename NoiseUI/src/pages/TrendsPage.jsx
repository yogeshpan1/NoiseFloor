import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { DAILY_SENTIMENT, INDIA_CHINA_DAILY, ANOMALIES } from '../data/nepalData';
import { REPORTING_COUNTRIES } from '../data/countries';
import { fadeInUp, headingReveal, staggerContainer, formatTone } from '../utils/helpers';
import { pearsonR } from '../utils/stats';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useStore } from '../store/useStore';
import DataTable from '../components/UI/DataTable';
import { downloadCSV, toCSV } from '../utils/csv';

function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weeklyAggregate(rows) {
  const groups = new Map();
  for (const r of rows) {
    const wk = isoWeek(r.event_date);
    if (!groups.has(wk)) groups.set(wk, { week: wk, india: [], china: [] });
    const g = groups.get(wk);
    if (r.india_tone != null) g.india.push(r.india_tone);
    if (r.china_tone != null) g.china.push(r.china_tone);
  }
  const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  return [...groups.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((g) => ({ event_date: g.week, india_tone: mean(g.india), china_tone: mean(g.china) }));
}

function toneToColor(t) {
  if (t == null) return undefined;
  const clamped = Math.max(-10, Math.min(10, t));
  const alpha = Math.min(0.85, Math.abs(clamped) / 8 + 0.08);
  return clamped < 0 ? `rgba(255,68,68,${alpha})` : `rgba(74,222,128,${alpha})`;
}

function ToneTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-bg-secondary/95 px-4 py-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-text-secondary">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatTone(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function TrendsPage() {
  const [ref, isVisible] = useScrollReveal();
  const [granularity, setGranularity] = useState('daily');
  const dateFilter = useStore((s) => s.dateFilter);

  const filteredDaily = useMemo(
    () =>
      dateFilter
        ? INDIA_CHINA_DAILY.filter((r) => r.event_date >= dateFilter.start && r.event_date <= dateFilter.end)
        : INDIA_CHINA_DAILY,
    [dateFilter],
  );

  const toneRows = useMemo(
    () => (granularity === 'weekly' ? weeklyAggregate(filteredDaily) : filteredDaily),
    [granularity, filteredDaily],
  );

  const volumeRows = useMemo(
    () => [...DAILY_SENTIMENT].sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [],
  );

  const scatterPoints = useMemo(
    () =>
      DAILY_SENTIMENT.filter((r) => r.avg_tone != null).map((r) => ({
        x: r.total_events,
        y: r.avg_tone,
        spike: r.is_spike === true,
      })),
    [],
  );

  const pearson = useMemo(() => {
    const rows = DAILY_SENTIMENT.filter((r) => r.avg_tone != null);
    const xs = rows.map((r) => Math.log10(Math.max(1, r.total_events)));
    const ys = rows.map((r) => r.avg_tone);
    return pearsonR(xs, ys);
  }, []);

  const heatmapRows = useMemo(
    () =>
      [...REPORTING_COUNTRIES].sort((a, b) => b.eventCount - a.eventCount).slice(0, 40).map((c) => ({
        ...c,
        neighbour: c.isNeighbor ? 'NEIGHBOUR' : '',
      })),
    [],
  );

  const anomalyRows = useMemo(
    () => [
      ...ANOMALIES.india.map((a) => ({ ...a, series: 'India' })),
      ...ANOMALIES.china.map((a) => ({ ...a, series: 'China' })),
      ...ANOMALIES.overall.map((a) => ({ ...a, series: 'Overall' })),
    ],
    [],
  );

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-2 text-h2 font-serif font-bold text-text-primary"
        >
          Trends & Anomalies
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-10 max-w-2xl text-sm text-text-secondary"
        >
          Tone and volume over time, how they (don't) correlate, and every day either country's
          coverage deviated more than 2σ from its own rolling mean.
        </motion.p>

        <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={staggerContainer} className="flex flex-col gap-6">
          <motion.div variants={fadeInUp}>
            <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-text-primary">Tone Over Time</h3>
                  {dateFilter && (
                    <p className="mt-0.5 text-[10px] font-mono text-gold-bright">
                      Narrowed to {dateFilter.start} → {dateFilter.end} (set from Date Explorer)
                    </p>
                  )}
                </div>
                <div className="flex gap-1 rounded-lg bg-white/5 p-1">
                  {['daily', 'weekly'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGranularity(g)}
                      className={`min-h-[28px] rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        granularity === g ? 'bg-gold/20 text-gold-bright' : 'text-text-secondary'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-72">
                {isVisible && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={toneRows} margin={{ left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="event_date" stroke="#a0a0b0" fontSize={10} tick={{ fontSize: 10 }} minTickGap={30} />
                      <YAxis stroke="#a0a0b0" fontSize={11} />
                      <Tooltip content={<ToneTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="india_tone" name="India" stroke="#ff4444" strokeWidth={2} dot={false} isAnimationActive />
                      <Line type="monotone" dataKey="china_tone" name="China" stroke="#00ffff" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
              <h3 className="mb-4 font-serif text-lg font-semibold text-text-primary">Volume Over Time (log)</h3>
              <div className="h-64">
                {isVisible && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={volumeRows} margin={{ left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="event_date" stroke="#a0a0b0" fontSize={10} minTickGap={30} />
                      <YAxis scale="log" domain={['auto', 'auto']} stroke="#a0a0b0" fontSize={11} allowDataOverflow />
                      <Tooltip content={<ToneTooltip />} />
                      <Line type="monotone" dataKey="total_articles" name="Articles/day" stroke="#f4d03f" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
              <h3 className="mb-1 font-serif text-lg font-semibold text-text-primary">Volume × Tone</h3>
              <p className="mb-4 text-xs text-text-secondary">
                Pearson r(log volume, tone) = <strong className="text-gold-bright">{pearson.toFixed(3)}</strong> — volume
                and sentiment are largely independent.
              </p>
              <div className="h-56">
                {isVisible && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" dataKey="x" scale="log" domain={['auto', 'auto']} stroke="#a0a0b0" fontSize={10} name="events" />
                      <YAxis type="number" dataKey="y" stroke="#a0a0b0" fontSize={10} name="tone" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ToneTooltip />} />
                      <Scatter data={scatterPoints} fill="#a0a0b0">
                        {scatterPoints.map((p, i) => (
                          <Cell key={i} fill={p.spike ? '#ff4444' : 'rgba(160,160,176,0.5)'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold text-text-primary">
                  Country Tone Heatmap (top 40 by volume)
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    downloadCSV('noiseui-daily-sentiment.csv', toCSV(DAILY_SENTIMENT, Object.keys(DAILY_SENTIMENT[0] || {}).map((k) => ({ key: k, label: k }))))
                  }
                  className="min-h-[36px] rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gold-bright hover:border-gold/40"
                >
                  Export daily CSV
                </button>
              </div>
              <DataTable
                columns={[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Country' },
                  { key: 'eventCount', label: 'Events', align: 'right', render: (v) => v.toLocaleString() },
                  { key: 'avgTone', label: 'Avg Tone', align: 'right', render: (v) => formatTone(v) },
                ]}
                rows={heatmapRows}
                colorScale={{ key: 'avgTone', fn: toneToColor }}
              />
            </div>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
              <h3 className="mb-4 font-serif text-lg font-semibold text-text-primary">
                Anomaly Log (|z| &gt; 2 vs 7-day rolling mean)
              </h3>
              <DataTable
                columns={[
                  { key: 'series', label: 'Series' },
                  { key: 'event_date', label: 'Date' },
                  { key: 'tone', label: 'Tone', align: 'right', render: (v) => formatTone(v) },
                  { key: 'rolling_mean', label: 'Rolling μ', align: 'right', render: (v) => formatTone(v) },
                  { key: 'z', label: 'z', align: 'right' },
                ]}
                rows={anomalyRows}
                searchable
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
