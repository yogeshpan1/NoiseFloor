import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DAILY_SENTIMENT, INDIA_CHINA_DAILY, EVENT_LOG } from '../data/nepalData';
import { DateIndex } from '../utils/dateIndex';
import { fadeInUp, headingReveal, formatTone } from '../utils/helpers';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useStore } from '../store/useStore';
import GlassCard from '../components/UI/GlassCard';

function ToneTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-bg-secondary/95 px-4 py-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-text-secondary">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function DateExplorerPage() {
  const [ref, isVisible] = useScrollReveal();
  const dateFilter = useStore((s) => s.dateFilter);
  const setDateFilter = useStore((s) => s.setDateFilter);

  const idxDaily = useMemo(() => new DateIndex(DAILY_SENTIMENT), []);
  const idxIc = useMemo(() => new DateIndex(INDIA_CHINA_DAILY), []);

  const [mode, setMode] = useState('range');
  const [start, setStart] = useState('2025-09-01');
  const [end, setEnd] = useState('2025-09-30');
  const [result, setResult] = useState(null);
  const [queryMs, setQueryMs] = useState(0);

  const runSearch = (s = start, e = mode === 'single' ? start : end) => {
    const t0 = performance.now();
    const dailyRows = idxDaily.findRange(s, e);
    const icRows = idxIc.findRange(s, e);
    const dt = performance.now() - t0;
    setQueryMs(dt);

    const totalEvents = dailyRows.reduce((a, r) => a + (r.total_events || 0), 0);
    const toneVals = dailyRows.map((r) => r.avg_tone).filter((v) => v != null);
    const avgTone = toneVals.length ? toneVals.reduce((a, b) => a + b, 0) / toneVals.length : null;
    const spikes = dailyRows.filter((r) => r.is_spike).length;
    const taggedEvents = EVENT_LOG.filter((ev) => ev.date >= s && ev.date <= e);

    setResult({ start: s, end: e, dailyRows, icRows, totalEvents, avgTone, spikes, taggedEvents });
    if (dateFilter) setDateFilter({ start: s, end: e });
  };

  useEffect(() => {
    runSearch();
    // Intentionally run once on mount only — subsequent searches are user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = () => {
    setMode('range');
    setStart('2025-09-08');
    setEnd('2025-09-14');
    runSearch('2025-09-08', '2025-09-14');
  };

  const toggleGlobalFilter = (checked) => {
    if (checked && result) setDateFilter({ start: result.start, end: result.end });
    else setDateFilter(null);
  };

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-2 text-h2 font-serif font-bold text-text-primary"
        >
          Date Explorer
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-8 max-w-2xl text-sm text-text-secondary"
        >
          Pick a single date or a range. Lookups run through a hand-built{' '}
          <span className="font-semibold text-gold-bright">DateIndex</span> — a sorted date array +
          inverted index queried by binary search, O(log n + k) per query instead of a naive O(n) scan.
        </motion.p>

        <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={fadeInUp} className="mb-6">
          <GlassCard hover={false}>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="min-h-[40px] rounded-lg border border-white/10 bg-bg-secondary px-3 text-sm text-text-primary"
                >
                  <option value="single">Single date</option>
                  <option value="range">Date range</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  {mode === 'single' ? 'Date' : 'Start'}
                </label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="min-h-[40px] rounded-lg border border-white/10 bg-bg-secondary px-3 text-sm text-text-primary"
                />
              </div>
              {mode !== 'single' && (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">End</label>
                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="min-h-[40px] rounded-lg border border-white/10 bg-bg-secondary px-3 text-sm text-text-primary"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => runSearch()}
                className="min-h-[40px] rounded-lg bg-gold-gradient px-5 text-sm font-bold text-bg-primary"
              >
                Search
              </button>
              <button
                type="button"
                onClick={applyPreset}
                className="min-h-[40px] rounded-lg border border-white/10 px-4 text-xs font-medium text-text-secondary hover:border-gold/40"
              >
                Sept 2025 spike week
              </button>
              <label className="ml-auto flex min-h-[40px] cursor-pointer items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={!!dateFilter}
                  onChange={(e) => toggleGlobalFilter(e.target.checked)}
                  className="accent-[#d4af37]"
                />
                Narrow Trends & Anomalies to this window
              </label>
            </div>
            {result && (
              <p className="mt-4 font-mono text-xs text-text-secondary">
                binary search over {idxDaily.numDistinctDates} sorted dates (~2·⌈log₂
                {idxDaily.numDistinctDates}⌉ ≈ {Math.ceil(2 * Math.log2(Math.max(idxDaily.numDistinctDates, 2)))} steps)
                {' '}+ {result.dailyRows.length} matches · {queryMs.toFixed(2)} ms — vs O({idxDaily.length}) full scan per query
              </p>
            )}
          </GlassCard>
        </motion.div>

        {result && (
          <>
            <motion.div
              initial="hidden"
              animate={isVisible ? 'visible' : 'hidden'}
              variants={fadeInUp}
              className="mb-6 grid grid-cols-2 gap-4 tablet:grid-cols-4"
            >
              {[
                ['Matching Days', result.dailyRows.length],
                ['Total Events', result.totalEvents.toLocaleString()],
                ['Avg Tone (All)', formatTone(result.avgTone ?? 0)],
                ['Spike Days', result.spikes],
              ].map(([label, value]) => (
                <GlassCard key={label}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-gold-bright">{value}</div>
                </GlassCard>
              ))}
            </motion.div>

            <motion.div
              initial="hidden"
              animate={isVisible ? 'visible' : 'hidden'}
              variants={fadeInUp}
              className="mb-6 grid grid-cols-1 gap-6 desktop:grid-cols-2"
            >
              <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
                <h3 className="mb-4 font-serif text-base font-semibold text-text-primary">Daily Tone & Volume</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={result.dailyRows} margin={{ left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="event_date" stroke="#a0a0b0" fontSize={9} minTickGap={20} />
                      <YAxis yAxisId="tone" stroke="#a0a0b0" fontSize={10} />
                      <YAxis yAxisId="events" orientation="right" stroke="#a0a0b0" fontSize={10} />
                      <Tooltip content={<ToneTooltip />} />
                      <Bar yAxisId="events" dataKey="total_events" name="Events" fill="rgba(0,255,255,0.25)" />
                      <Line yAxisId="tone" type="monotone" dataKey="avg_tone" name="Avg Tone" stroke="#f4d03f" strokeWidth={2} dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
                <h3 className="mb-4 font-serif text-base font-semibold text-text-primary">India vs China Tone</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.icRows} margin={{ left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="event_date" stroke="#a0a0b0" fontSize={9} minTickGap={20} />
                      <YAxis stroke="#a0a0b0" fontSize={10} />
                      <Tooltip content={<ToneTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="india_tone" name="India" stroke="#ff4444" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="china_tone" name="China" stroke="#00ffff" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={fadeInUp}>
              <GlassCard hover={false} className="overflow-x-auto">
                <h3 className="mb-4 font-serif text-base font-semibold text-text-primary">Tagged Events in Window</h3>
                {result.taggedEvents.length ? (
                  <table className="w-full min-w-[500px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-text-secondary">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Event</th>
                        <th className="py-2 pr-4">Source</th>
                        <th className="py-2">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.taggedEvents.map((ev) => (
                        <tr key={ev.date} className="border-b border-white/5 last:border-0">
                          <td className="py-3 pr-4 font-mono text-xs text-text-secondary">{ev.date}</td>
                          <td className="py-3 pr-4 text-text-primary">
                            <div className="font-semibold">{ev.event}</div>
                            <div className="text-xs text-text-secondary">{ev.detail}</div>
                          </td>
                          <td className="py-3 pr-4 text-xs">
                            {ev.sourceUrl ? (
                              <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-china hover:underline">
                                {ev.sourceName}
                              </a>
                            ) : (
                              <span className="text-text-secondary">{ev.sourceName}</span>
                            )}
                          </td>
                          <td className={`py-3 text-xs ${ev.verified ? 'text-green-400' : 'text-gold'}`}>
                            {ev.verified ? 'verified' : 'unverified'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-text-secondary">No tagged events in this window.</p>
                )}
              </GlassCard>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}
