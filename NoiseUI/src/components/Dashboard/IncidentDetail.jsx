import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { INCIDENTS, EVENT_LOG, TIMELINE_ALIGNED } from '../../data/nepalData';
import { formatTone, staggerContainer, fadeInUp, scaleIn } from '../../utils/helpers';
import GlassCard from '../UI/GlassCard';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-bg-secondary/95 px-4 py-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 text-text-secondary">Day {label} relative to start</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toFixed(2)}
        </p>
      ))}
    </div>
  );
}

export default function IncidentDetail({ incidentId, periodLabel, eventLogDateRange, heroIcon: Icon }) {
  const india = INCIDENTS.find((i) => i.id === incidentId && i.country === 'India');
  const china = INCIDENTS.find((i) => i.id === incidentId && i.country === 'China');
  const timeline = TIMELINE_ALIGNED.filter((r) => r.period === periodLabel);
  const events = EVENT_LOG.filter((e) => e.date >= eventLogDateRange[0] && e.date <= eventLogDateRange[1]);

  return (
    <div className="px-6 py-16 sm:py-20">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="mx-auto max-w-5xl"
      >
        <motion.div variants={fadeInUp} className="mb-8 flex items-center gap-4">
          {Icon && <Icon className="h-10 w-10 text-gold" />}
          <h1 className="text-h1 font-serif font-bold text-text-primary">{india.label}</h1>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-4"
        >
          <motion.div variants={scaleIn}>
            <GlassCard>
              <p className="text-xs uppercase tracking-wide text-text-secondary">India Avg Tone</p>
              <p className="mt-1 text-2xl font-bold text-india">{formatTone(india.avgTone)}</p>
            </GlassCard>
          </motion.div>
          <motion.div variants={scaleIn}>
            <GlassCard>
              <p className="text-xs uppercase tracking-wide text-text-secondary">China Avg Tone</p>
              <p className="mt-1 text-2xl font-bold text-china">{formatTone(china.avgTone)}</p>
            </GlassCard>
          </motion.div>
          <motion.div variants={scaleIn}>
            <GlassCard>
              <p className="text-xs uppercase tracking-wide text-text-secondary">India Events</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{india.totalEvents}</p>
            </GlassCard>
          </motion.div>
          <motion.div variants={scaleIn}>
            <GlassCard>
              <p className="text-xs uppercase tracking-wide text-text-secondary">China Events</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{china.totalEvents}</p>
            </GlassCard>
          </motion.div>
        </motion.div>

        {timeline.length > 0 && (
          <motion.div variants={fadeInUp} className="mb-10 rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Tone Over Time (days since start)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeline} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="days_since_start" stroke="#a0a0b0" fontSize={11} />
                <YAxis stroke="#a0a0b0" fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="avg_tone"
                  name="Avg Tone"
                  stroke="#f4d03f"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                  animationDuration={1800}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {events.length > 0 && (
          <motion.div variants={fadeInUp}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Verified Timeline
            </h3>
            <motion.ol variants={staggerContainer} className="space-y-4 border-l border-white/10 pl-6">
              {events.map((e) => (
                <motion.li key={e.date} variants={fadeInUp} className="relative">
                  <span className="absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-bright">{e.date}</p>
                  <p className="mt-1 font-medium text-text-primary">{e.event}</p>
                  <p className="mt-1 text-sm text-text-secondary">{e.detail}</p>
                  {e.sourceUrl && (
                    <a
                      href={e.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold"
                    >
                      {e.sourceName}
                    </a>
                  )}
                </motion.li>
              ))}
            </motion.ol>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
