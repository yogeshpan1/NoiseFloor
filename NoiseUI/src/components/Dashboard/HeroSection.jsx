import { motion } from 'framer-motion';
import { useMousePosition } from '../../hooks/useMousePosition';
import AnimatedCounter from '../UI/AnimatedCounter';
import AnimatedNepalMap from './AnimatedNepalMap';
import { STATS } from '../../data/nepalData';
import { fadeInUp } from '../../utils/helpers';

const STAT_CARDS = [
  { label: 'Articles Analyzed', value: 35.5, decimals: 1, suffix: 'M' },
  { label: 'Reporting Countries', value: STATS.countries, suffix: '' },
  { label: 'Major Crises', value: STATS.crises, suffix: '' },
];

// The map draws itself in first (~2.4s), then the story content cascades in on top
// of it — a deliberate "arriving at Nepal" beat right as the dashboard mounts.
const heroContainer = {
  hidden: {},
  visible: { transition: { delayChildren: 1.5, staggerChildren: 0.15 } },
};

export default function HeroSection() {
  const { x, y } = useMousePosition();

  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center sm:py-28">
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 w-[140vw] max-w-[1400px] -translate-x-1/2 -translate-y-1/2"
        animate={{ x: x * 16, y: y * 16 }}
        transition={{ type: 'tween', duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <AnimatedNepalMap className="w-full" />
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={heroContainer}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <motion.h1
          variants={fadeInUp}
          className="text-h1 font-serif font-black tracking-tight text-gold-gradient"
        >
          NoiseFloor
        </motion.h1>
        <motion.p variants={fadeInUp} className="max-w-2xl text-body text-text-secondary">
          How the world watches Nepal <span className="text-gold">|</span> 2015&ndash;2025
        </motion.p>

        <motion.div
          variants={fadeInUp}
          className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {STAT_CARDS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-bg-card/60 px-6 py-5 backdrop-blur-sm"
            >
              <div className="font-serif text-3xl font-bold text-gold-bright sm:text-4xl">
                <AnimatedCounter value={stat.value} decimals={stat.decimals || 0} suffix={stat.suffix} />
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.15em] text-text-secondary">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
