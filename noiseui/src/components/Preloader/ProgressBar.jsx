import { motion } from 'framer-motion';

export default function ProgressBar({ progress }) {
  return (
    <div className="w-full max-w-xs sm:max-w-sm">
      <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full bg-gold-gradient"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      <div className="mt-2 flex justify-between font-sans text-[10px] uppercase tracking-[0.2em] text-text-secondary">
        <span>NoiseFloor</span>
        <span>{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
