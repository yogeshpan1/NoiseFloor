import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { CRISIS_PARAMS, HYPOTHESIS_RESULTS } from '../data/nepalData';
import { pdf, welchTTest } from '../utils/stats';
import { fadeInUp, headingReveal } from '../utils/helpers';
import { useScrollReveal } from '../hooks/useScrollReveal';
import GlassCard from '../components/UI/GlassCard';
import RangeSlider from '../components/UI/RangeSlider';

const X_POINTS = Array.from({ length: 100 }, (_, i) => (i - 50) / 10);

function buildCurve(mu, sigma) {
  return X_POINTS.map((x) => ({ x, y: pdf(x, mu, sigma) }));
}

export default function HypothesisEnginePage() {
  const [ref, isVisible] = useScrollReveal();
  const [crisisKey, setCrisisKey] = useState('all');
  const [shiftInd, setShiftInd] = useState(0);
  const [shiftChn, setShiftChn] = useState(0);
  const [tested, setTested] = useState(false);

  const params = CRISIS_PARAMS[crisisKey];
  const indMu = params.ind.mu + shiftInd;
  const chnMu = params.chn.mu + shiftChn;

  const chartData = useMemo(() => {
    const indCurve = buildCurve(indMu, params.ind.sigma);
    const chnCurve = buildCurve(chnMu, params.chn.sigma);
    return X_POINTS.map((x, i) => ({ x: x.toFixed(1), india: indCurve[i].y, china: chnCurve[i].y }));
  }, [indMu, chnMu, params]);

  const welch = useMemo(
    () =>
      welchTTest({
        indMu, indSd: params.ind.sigma, nInd: params.nInd,
        chnMu, chnSd: params.chn.sigma, nChn: params.nChn,
      }),
    [indMu, chnMu, params],
  );

  const significant = welch.p < 0.05;

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-2 text-h2 font-serif font-bold text-text-primary"
        >
          Hypothesis Engine
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-8 max-w-2xl text-sm text-text-secondary"
        >
          Model each actor's tone as a Gaussian distribution and run a live two-sample test for
          the India–China gap. Pick a crisis window and drag the what-if sliders.
        </motion.p>

        <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={fadeInUp} className="grid grid-cols-1 gap-6 desktop:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-bg-card p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-text-primary">Tone Probability Density</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-india"><span className="h-2 w-2 rounded-full bg-india" /> India</span>
                <span className="flex items-center gap-1.5 text-china"><span className="h-2 w-2 rounded-full bg-china" /> China</span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="x" stroke="#a0a0b0" fontSize={10} interval={9} />
                  <YAxis hide />
                  <ReferenceLine x={indMu.toFixed(1)} stroke="#ff4444" strokeDasharray="4 3" />
                  <ReferenceLine x={chnMu.toFixed(1)} stroke="#00ffff" strokeDasharray="4 3" />
                  <Line type="monotone" dataKey="india" stroke="#ff4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="china" stroke="#00ffff" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <GlassCard hover={false}>
            <h3 className="mb-4 font-serif text-lg font-semibold text-text-primary">Test Console</h3>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Crisis Window</label>
            <select
              value={crisisKey}
              onChange={(e) => setCrisisKey(e.target.value)}
              className="mb-4 min-h-[40px] w-full rounded-lg border border-white/10 bg-bg-secondary px-3 text-sm text-text-primary"
            >
              {Object.entries(CRISIS_PARAMS).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>

            <div className="mb-5 flex flex-col gap-4">
              <RangeSlider label="India mean shift" value={shiftInd} onChange={setShiftInd} min={-2} max={2} step={0.1} />
              <RangeSlider label="China mean shift" value={shiftChn} onChange={setShiftChn} min={-2} max={2} step={0.1} />
            </div>

            <button
              type="button"
              onClick={() => setTested(true)}
              className="min-h-[44px] w-full rounded-lg bg-gold-gradient text-sm font-bold uppercase tracking-wide text-bg-primary"
            >
              Run Test
            </button>

            {tested && (
              <div className="mt-4 rounded-xl border border-white/10 bg-bg-secondary p-4 font-mono text-xs leading-relaxed text-text-secondary">
                <p>Crisis: <strong className="text-text-primary">{params.label}</strong></p>
                <p>India Mean Tone: <span className="text-india">{indMu.toFixed(2)}</span> · China Mean Tone: <span className="text-china">{chnMu.toFixed(2)}</span></p>
                <p>Gap (CHN−IND): <span className="text-green-400">{(chnMu - indMu).toFixed(2)}</span></p>
                <p>
                  Welch t = {welch.t.toFixed(2)} · p ≈ {welch.p < 0.0001 ? '< 0.0001' : welch.p.toFixed(4)} →{' '}
                  <span className={significant ? 'font-bold text-green-400' : 'font-bold text-gold'}>
                    {significant ? 'REJECT H₀' : 'FAIL TO REJECT H₀'}
                  </span>
                  {significant ? ' — the gap is statistically real' : ' — no detectable difference'}
                </p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={fadeInUp} className="mt-6">
          <GlassCard hover={false} className="overflow-x-auto">
            <h3 className="mb-4 font-serif text-lg font-semibold text-text-primary">Statistical Results Matrix</h3>
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-text-secondary">
                  <th className="py-2 pr-4">Hyp. ID</th>
                  <th className="py-2 pr-4">Null Hypothesis (H₀)</th>
                  <th className="py-2 pr-4 text-right">t-stat</th>
                  <th className="py-2 pr-4 text-right">p-value</th>
                  <th className="py-2 text-right">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {HYPOTHESIS_RESULTS.map((h) => (
                  <tr key={h.id} className="border-b border-white/5 last:border-0">
                    <td className="py-3 pr-4 font-mono font-bold text-china">{h.id}</td>
                    <td className="py-3 pr-4 text-text-primary">{h.nullHypothesis}</td>
                    <td className="py-3 pr-4 text-right font-mono text-text-secondary">{h.tStat}</td>
                    <td className="py-3 pr-4 text-right font-mono text-text-secondary">{h.pValue}</td>
                    <td className="py-3 text-right">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                          h.verdict === 'REJECTED'
                            ? 'bg-india/15 text-india'
                            : h.verdict === 'CONFIRMED'
                              ? 'bg-green-500/15 text-green-400'
                              : 'bg-white/10 text-text-secondary'
                        }`}
                      >
                        {h.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
