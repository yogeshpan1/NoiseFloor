import { motion } from 'framer-motion';
import { DID_YOU_KNOW } from '../../data/nepalData';
import { staggerContainer, scaleIn, headingReveal } from '../../utils/helpers';
import { useScrollReveal } from '../../hooks/useScrollReveal';

export default function DidYouKnow() {
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
          Did You Know?
        </motion.h2>
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 gap-6 tablet:grid-cols-2"
        >
          {DID_YOU_KNOW.map((item) => (
            <motion.div
              key={item.id}
              variants={scaleIn}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-bg-card to-bg-secondary p-6"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/10 blur-2xl" />
              <h3 className="relative font-serif text-lg font-semibold text-gold-bright">{item.title}</h3>
              <motion.p
                initial={{ opacity: 0, scale: 0.6 }}
                animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.35, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="relative mt-2 text-3xl font-black text-text-primary"
              >
                {item.stat}
              </motion.p>
              <p className="relative mt-3 text-sm leading-relaxed text-text-secondary">{item.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
