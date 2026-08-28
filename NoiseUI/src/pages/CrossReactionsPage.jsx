import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CROSS_REACTION } from '../data/regionalLens';
import { fadeInUp, headingReveal, formatTone } from '../utils/helpers';
import { useScrollReveal } from '../hooks/useScrollReveal';
import GlassCard from '../components/UI/GlassCard';
import PendingLens from '../components/UI/PendingLens';

export default function CrossReactionsPage() {
  const [ref, isVisible] = useScrollReveal();
  const cr = CROSS_REACTION;

  const chartData =
    cr &&
    cr.in_base.series.map((p, i) => ({
      date: p.date,
      in_base: p.value,
      in_china: cr.in_china.series[i]?.value,
      cn_base: cr.cn_base.series[i]?.value,
      cn_india: cr.cn_india.series[i]?.value,
    }));

  const delta = cr && cr.in_china.avg_tone != null && cr.in_base.avg_tone != null
    ? cr.in_china.avg_tone - cr.in_base.avg_tone
    : null;

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-2 text-h2 font-serif font-bold text-text-primary"
        >
          Cross-Reactions
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-8 max-w-2xl text-sm text-text-secondary"
        >
          A threat-framing detector: tone of Indian coverage that mentions China's activities in
          Nepal, versus India's own Nepal baseline — and the symmetric Chinese side.
        </motion.p>

        {cr == null ? (
          <PendingLens message="Regional-lens dataset not built yet. Once backend/build_extended.py finishes and its output is merged in, this view fills in automatically." />
        ) : (
          <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={fadeInUp} className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 tablet:grid-cols-4">
              {[
                ['India · re: China', cr.in_china.avg_tone],
                ['India · baseline', cr.in_base.avg_tone],
                ['China · re: India', cr.cn_india.avg_tone],
                ['Delta (cross − baseline)', delta],
              ].map(([label, v]) => (
                <GlassCard key={label}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</div>
                  <div className="mt-2 font-mono text-xl font-bold text-gold-bright">{v == null ? '—' : formatTone(v)}</div>
                </GlassCard>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
              <h3 className="mb-4 font-serif text-base font-semibold text-text-primary">Cross-Coverage Tone Timelines</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#a0a0b0" fontSize={10} minTickGap={30} />
                    <YAxis stroke="#a0a0b0" fontSize={11} />
                    <Tooltip formatter={(v) => formatTone(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="in_base" name="India · baseline Nepal" stroke="#ff4444" dot={false} />
                    <Line type="monotone" dataKey="in_china" name="India · re: China in Nepal" stroke="#ff4444" strokeDasharray="5 4" dot={false} />
                    <Line type="monotone" dataKey="cn_base" name="China · baseline Nepal" stroke="#00ffff" dot={false} />
                    <Line type="monotone" dataKey="cn_india" name="China · re: India in Nepal" stroke="#00ffff" strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
