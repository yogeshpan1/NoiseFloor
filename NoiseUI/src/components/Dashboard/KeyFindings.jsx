import { motion } from 'framer-motion';
import { KEY_FINDINGS } from '../../data/nepalData';
import { staggerContainer, fadeInUp, headingReveal } from '../../utils/helpers';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import GlassCard from '../UI/GlassCard';

export default function KeyFindings() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-10 text-h2 font-serif font-bold text-text-primary"
        >
          Key Findings
        </motion.h2>
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 gap-6 tablet:grid-cols-2"
        >
          {KEY_FINDINGS.map((finding) => (
            <motion.div key={finding.id} variants={fadeInUp}>
              <GlassCard className="h-full">
                <h3 className="font-serif text-lg font-semibold text-text-primary">{finding.title}</h3>
                <p className="mt-3 text-2xl font-bold tracking-tight text-gold-bright">{finding.stat}</p>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">{finding.body}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
