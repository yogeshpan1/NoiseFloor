import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { INDIA_CHINA_DAILY, INCIDENTS } from '../../data/nepalData';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { headingReveal, scaleIn, fadeInUp, staggerContainer } from '../../utils/helpers';

const INCIDENT_LABELS = ['2015 Earthquake', '2015 Blockade', '2025 Gen-Z Protest'];

function buildIncidentBars() {
  return INCIDENT_LABELS.map((label) => {
    const india = INCIDENTS.find((i) => i.label === label && i.country === 'India');
    const china = INCIDENTS.find((i) => i.label === label && i.country === 'China');
    return { label, India: india?.avgTone ?? null, China: china?.avgTone ?? null };
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The daily series crosses a calendar-year boundary (Nov 2024 -> Nov 2025); an
// MM-DD-only tick would show the axis appearing to jump backwards in time once
// the year rolls over, so ticks always carry a 2-digit year for clarity.
function formatAxisDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${MONTHS[Number(m) - 1]} ${d} '${y.slice(2)}`;
}

function CustomTooltip({ active, payload, label }) {
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

export default function ChartsSection() {
  const [ref, isVisible] = useScrollReveal();
  const [hidden, setHidden] = useState({});
  const incidentBars = useMemo(() => buildIncidentBars(), []);

  const toggleSeries = (dataKey) => {
    setHidden((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
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
          The Coverage Gap
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-10 max-w-2xl text-sm text-text-secondary"
        >
          India's coverage of Nepal runs consistently more negative than China's — day after day, across
          a full year of overlapping reporting. Click a legend item to isolate a series.
        </motion.p>

        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
        >
          <motion.div variants={scaleIn} className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Daily Tone — India vs China
            </h3>
            {isVisible && (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={INDIA_CHINA_DAILY} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="event_date"
                    stroke="#a0a0b0"
                    fontSize={11}
                    tickFormatter={formatAxisDate}
                    interval={Math.ceil(INDIA_CHINA_DAILY.length / 8)}
                  />
                  <YAxis stroke="#a0a0b0" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    onClick={(e) => toggleSeries(e.dataKey)}
                    wrapperStyle={{ cursor: 'pointer', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="india_tone"
                    name="India"
                    stroke="#ff4444"
                    strokeWidth={2}
                    dot={false}
                    hide={hidden.india_tone}
                    connectNulls
                    isAnimationActive
                    animationDuration={1800}
                    animationEasing="ease-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="china_tone"
                    name="China"
                    stroke="#00ffff"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    hide={hidden.china_tone}
                    connectNulls
                    isAnimationActive
                    animationDuration={1800}
                    animationBegin={250}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div
            variants={scaleIn}
            className="mt-6 rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6"
          >
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Average Tone by Incident
            </h3>
            {isVisible && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incidentBars} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" stroke="#a0a0b0" fontSize={11} />
                  <YAxis stroke="#a0a0b0" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    onClick={(e) => toggleSeries(e.dataKey)}
                    wrapperStyle={{ cursor: 'pointer', fontSize: 12 }}
                  />
                  <Bar
                    dataKey="India"
                    fill="#ff4444"
                    hide={hidden.India}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="China"
                    fill="#00ffff"
                    hide={hidden.China}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive
                    animationDuration={1000}
                    animationBegin={200}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
