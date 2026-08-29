import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DIVIDEND_EXTENDED } from '../../data/regionalLens';
import { DIVIDEND_LEDGER } from '../../data/nepalData';
import { staggerContainer, fadeInUp, headingReveal } from '../../utils/helpers';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import GlassCard from '../UI/GlassCard';
import RangeSlider from '../UI/RangeSlider';
import PendingLens from '../UI/PendingLens';

function ScenarioSimulator() {
  const [pInd, setPInd] = useState(0);
  const [pChn, setPChn] = useState(0);
  const dv = DIVIDEND_EXTENDED;

  const baseInd = Math.max(0.1, dv?.india?.attention_avg || 1);
  const baseChn = Math.max(0.1, dv?.china?.attention_avg || 1);
  const baseShare = baseInd / (baseInd + baseChn);

  const { shareInd, verdict } = useMemo(() => {
    const projInd = baseInd * (1 + pInd / 100);
    const projChn = baseChn * (1 + pChn / 100);
    const share = projInd / (projInd + projChn);
    const shift = (share - baseShare) * 100;
    let v;
    if (Math.abs(shift) < 2) {
      v = `With these surges the coverage balance stays essentially where it is today — the narrative contest remains ${baseShare > 0.5 ? 'India-led' : 'China-led'} in volume terms.`;
    } else if (shift > 0) {
      v = `A ${Math.abs(shift).toFixed(0)}-point swing toward Indian coverage. Volume leadership only helps the narrative if the framing stays warm — India's aid tone is ${dv?.india?.tone_avg != null ? dv.india.tone_avg.toFixed(2) : 'n/a'}.`;
    } else {
      v = `A ${Math.abs(shift).toFixed(0)}-point swing toward Chinese coverage. Volume leadership only helps the narrative if the framing stays warm — China's aid tone is ${dv?.china?.tone_avg != null ? dv.china.tone_avg.toFixed(2) : 'n/a'}.`;
    }
    return { shareInd: share, verdict: v };
  }, [pInd, pChn, baseInd, baseChn, baseShare, dv]);

  const disabled = dv == null;

  return (
    <GlassCard hover={false}>
      <h3 className="font-serif text-lg font-semibold text-text-primary">Scenario Simulator</h3>
      <p className="mt-1 text-xs text-text-secondary">
        Scale each donor's baseline aid-coverage attention up or down and watch the projected
        share rebalance. Illustrative, not predictive.
      </p>
      <div className="mt-6 flex flex-col gap-5">
        <RangeSlider
          label="India coverage surge"
          value={pInd}
          onChange={setPInd}
          min={-50}
          max={50}
          step={5}
          formatValue={(n) => `${n}%`}
          disabled={disabled}
          disabledReason="Waiting for the regional-lens dataset."
        />
        <RangeSlider
          label="China coverage surge"
          value={pChn}
          onChange={setPChn}
          min={-50}
          max={50}
          step={5}
          formatValue={(n) => `${n}%`}
          disabled={disabled}
          disabledReason="Waiting for the regional-lens dataset."
        />
      </div>

      {disabled ? (
        <div className="mt-6">
          <PendingLens
            compact
            message="Simulator inactive — it needs the 12-month aid-coverage baselines from the regional-lens dataset (being built; this fills in automatically)."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-white/5">
            <div className="bg-india transition-all" style={{ width: `${(shareInd * 100).toFixed(1)}%` }} />
            <div className="bg-china transition-all" style={{ width: `${((1 - shareInd) * 100).toFixed(1)}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs font-mono">
            <span className="text-india">India {(shareInd * 100).toFixed(0)}%</span>
            <span className="text-china">China {((1 - shareInd) * 100).toFixed(0)}%</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">{verdict}</p>
        </>
      )}
    </GlassCard>
  );
}

export default function NepalDividendSection() {
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
          Nepal Dividend
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-10 max-w-2xl text-sm text-text-secondary"
        >
          Aid and investment attention & framing — a curated ledger of documented India/China
          assistance to Nepal, plus a scenario simulator for how coverage volume could shift.
        </motion.p>

        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 gap-6 desktop:grid-cols-[3fr_2fr]"
        >
          <motion.div variants={fadeInUp}>
            <GlassCard hover={false} className="overflow-x-auto">
              <h3 className="mb-4 font-serif text-lg font-semibold text-text-primary">
                Documented Engagement Ledger
              </h3>
              <table className="w-full min-w-[500px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-text-secondary">
                    <th className="py-2 pr-4">Donor</th>
                    <th className="py-2 pr-4">Documented engagement</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {DIVIDEND_LEDGER.map((row, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className={`py-3 pr-4 align-top font-semibold ${row.donor === 'India' ? 'text-india' : 'text-china'}`}>
                        {row.donor}
                      </td>
                      <td className="py-3 pr-4 align-top text-text-primary">{row.item}</td>
                      <td className="py-3 align-top font-mono text-xs text-text-secondary">{row.src}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <ScenarioSimulator />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
