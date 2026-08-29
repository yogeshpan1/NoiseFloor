import { motion } from 'framer-motion';
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { NEIGHBOUR_MATRIX } from '../data/regionalLens';
import { fadeInUp, headingReveal, formatTone } from '../utils/helpers';
import { useScrollReveal } from '../hooks/useScrollReveal';
import PendingLens from '../components/UI/PendingLens';
import DataTable from '../components/UI/DataTable';

export default function NeighbourWatchPage() {
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
          Neighbour Watch
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-8 max-w-2xl text-sm text-text-secondary"
        >
          Nepal isn't the only neighbour in the crossfire — India vs China average tone toward
          every country in their South & East Asian neighbourhood.
        </motion.p>

        {NEIGHBOUR_MATRIX == null ? (
          <PendingLens message="Regional-lens dataset not built yet. Once backend/build_extended.py finishes and its output is merged in, this view fills in automatically." />
        ) : (
          <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={fadeInUp} className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
              <h3 className="mb-4 font-serif text-base font-semibold text-text-primary">Tone Toward Each Neighbour</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={NEIGHBOUR_MATRIX}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="subject" stroke="#a0a0b0" fontSize={10} />
                    <YAxis stroke="#a0a0b0" fontSize={11} />
                    <Tooltip formatter={(v) => formatTone(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="india_tone" name="India" fill="#ff4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="china_tone" name="China" fill="#00ffff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
              <h3 className="mb-4 font-serif text-base font-semibold text-text-primary">Attention Share</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={NEIGHBOUR_MATRIX}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" stroke="#a0a0b0" fontSize={10} />
                    <Radar name="India" dataKey="india_vol" stroke="#ff4444" fill="#ff4444" fillOpacity={0.15} />
                    <Radar name="China" dataKey="china_vol" stroke="#00ffff" fill="#00ffff" fillOpacity={0.15} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6 desktop:col-span-2">
              <h3 className="mb-4 font-serif text-base font-semibold text-text-primary">Neighbour Matrix</h3>
              <DataTable
                columns={[
                  { key: 'subject', label: 'Subject' },
                  { key: 'india_tone', label: 'India Tone', align: 'right', render: (v) => formatTone(v) },
                  { key: 'china_tone', label: 'China Tone', align: 'right', render: (v) => formatTone(v) },
                  { key: 'india_vol', label: 'India Attn.', align: 'right' },
                  { key: 'china_vol', label: 'China Attn.', align: 'right' },
                ]}
                rows={NEIGHBOUR_MATRIX}
              />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
