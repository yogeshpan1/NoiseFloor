import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { QUADCLASS } from '../../data/nepalData';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { headingReveal, fadeInUp, scaleIn } from '../../utils/helpers';

const LABELS = {
  verbalCoop: 'Verbal Cooperation',
  materialCoop: 'Material Cooperation',
  verbalConflict: 'Verbal Conflict',
  materialConflict: 'Material Conflict',
};

const data = Object.keys(LABELS).map((key) => ({
  category: LABELS[key],
  2015: QUADCLASS[2015][key],
  2025: QUADCLASS[2025][key],
}));

export default function QuadClassSection() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-2 text-h2 font-serif font-bold text-text-primary"
        >
          How the Conversation Shifted
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-8 max-w-2xl text-sm text-text-secondary"
        >
          CAMEO QuadClass categorizes every event as cooperative or conflictual, verbal or material.
          Between 2015 and 2025, verbal cooperation gave ground to material conflict.
        </motion.p>
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={scaleIn}
          className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6"
        >
          {isVisible && (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="category" stroke="#a0a0b0" fontSize={11} />
                <YAxis stroke="#a0a0b0" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey={2015}
                  name="2015"
                  fill="#d4af37"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive
                  animationDuration={1100}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey={2025}
                  name="2025"
                  fill="#f4d03f"
                  fillOpacity={0.55}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive
                  animationDuration={1100}
                  animationBegin={200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
    </section>
  );
}
