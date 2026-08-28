import { motion } from 'framer-motion';
import { METHODOLOGY_STEPS, CAVEATS, REPRODUCIBILITY } from '../data/methodology';
import { staggerContainer, fadeInUp, headingReveal } from '../utils/helpers';
import { useScrollReveal } from '../hooks/useScrollReveal';
import GlassCard from '../components/UI/GlassCard';

function BulletBox({ title, items }) {
  return (
    <GlassCard hover={false}>
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </span>
      <ul className="flex flex-col gap-2 text-xs leading-relaxed text-text-secondary">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

export default function MethodologyPage() {
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
          Methodology
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-10 max-w-2xl text-sm text-text-secondary"
        >
          A beginner-friendly guide to how we collect data and calculate the results — plus the
          caveats that keep us honest.
        </motion.p>

        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 gap-6 desktop:grid-cols-[3fr_2fr]"
        >
          <motion.div variants={fadeInUp}>
            <GlassCard hover={false}>
              <h3 className="mb-6 font-serif text-lg font-semibold text-text-primary">
                Pipeline, step by step
              </h3>
              <div className="flex flex-col gap-5">
                {METHODOLOGY_STEPS.map((step) => (
                  <div key={step.num} className="flex gap-4">
                    <span className="font-serif text-2xl font-bold text-gold/40">{step.num}</span>
                    <div>
                      <h4 className="mb-1 text-sm font-semibold text-text-primary">{step.title}</h4>
                      <p className="text-xs leading-relaxed text-text-secondary">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeInUp} className="flex flex-col gap-6">
            <BulletBox title="Caveats & limitations" items={CAVEATS} />
            <BulletBox title="Reproducibility" items={REPRODUCIBILITY} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
