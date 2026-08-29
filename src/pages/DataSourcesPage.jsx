import { motion } from 'framer-motion';
import { PIPELINE_STATS, PIPELINE_STEPS, GEOGRAPHIC_REACH } from '../data/methodology';
import { STATS } from '../data/nepalData';
import { REPORTING_COUNTRIES } from '../data/countries';
import { staggerContainer, fadeInUp, headingReveal, formatTone } from '../utils/helpers';
import { useScrollReveal } from '../hooks/useScrollReveal';
import GlassCard from '../components/UI/GlassCard';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-bg-secondary/95 px-4 py-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-text-secondary">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          Avg tone: {formatTone(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function DataSourcesPage() {
  const [ref, isVisible] = useScrollReveal();
  const top10 = [...REPORTING_COUNTRIES].sort((a, b) => b.eventCount - a.eventCount).slice(0, 10);

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-2 text-h2 font-serif font-bold text-text-primary"
        >
          Data Sources
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-10 max-w-2xl text-sm text-text-secondary"
        >
          Everything on this dashboard is computed from the GDELT Project's public event
          database — a global index of worldwide news media, machine-parsed into actors,
          actions and tone.
        </motion.p>

        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="mb-6 grid grid-cols-2 gap-4 tablet:grid-cols-4"
        >
          {PIPELINE_STATS.map((s) => (
            <motion.div key={s.label} variants={fadeInUp}>
              <GlassCard>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  {s.label}
                </div>
                <div className="mt-2 font-serif text-2xl font-bold text-gold-bright">{s.value}</div>
                <div className="mt-1 text-xs text-text-secondary">{s.sub}</div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={fadeInUp} className="mb-6">
          <GlassCard hover={false}>
            <h3 className="mb-6 font-serif text-lg font-semibold text-text-primary">
              Ingestion Pipeline Architecture
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-4">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={step.title} className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-bg-secondary text-gold">
                      {i + 1}
                    </div>
                    <div className="text-sm font-semibold text-text-primary">{step.title}</div>
                    <div className="font-mono text-xs text-text-secondary">{step.sub}</div>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && <span className="hidden text-gold/40 desktop:inline">&rarr;</span>}
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 gap-6 desktop:grid-cols-2"
        >
          <motion.div variants={fadeInUp}>
            <GlassCard hover={false}>
              <h3 className="mb-4 font-serif text-lg font-semibold text-text-primary">
                Top Source Countries ({STATS.countries} Nations)
              </h3>
              <div className="h-72">
                {isVisible && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top10} layout="vertical" margin={{ left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" stroke="#a0a0b0" fontSize={11} />
                      <YAxis type="category" dataKey="code" stroke="#a0a0b0" fontSize={11} width={40} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar dataKey="avgTone" radius={[0, 4, 4, 0]}>
                        {top10.map((c) => (
                          <Cell key={c.code} fill={c.isPrimary ? (c.code === 'IND' ? '#ff4444' : '#00ffff') : '#d4af37'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <GlassCard hover={false}>
              <h3 className="mb-4 font-serif text-lg font-semibold text-text-primary">Geographic Reach</h3>
              <div className="flex flex-col gap-3">
                {GEOGRAPHIC_REACH.map((r) => (
                  <div key={r.code} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                    <div className="flex items-center gap-4">
                      <span className="rounded bg-bg-secondary px-2 py-1 font-mono text-xs text-text-secondary">
                        {r.code}
                      </span>
                      <div>
                        <div className="text-sm text-text-primary">{r.label}</div>
                        <div className="font-mono text-xs text-text-secondary">{r.density}</div>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                        r.status === 'ACTIVE' ? 'bg-green-500/15 text-green-400' : 'bg-gold/15 text-gold-bright'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
