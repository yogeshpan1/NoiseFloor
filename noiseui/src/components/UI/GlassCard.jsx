import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', hover = true, as: Component = motion.div, ...props }) {
  return (
    <Component
      className={`rounded-2xl border border-white/10 bg-bg-card/80 p-6 backdrop-blur-sm ${className}`}
      whileHover={
        hover
          ? { scale: 1.02, borderColor: 'rgba(212,175,55,0.4)', boxShadow: '0 20px 60px -20px rgba(212,175,55,0.25)' }
          : undefined
      }
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      {...props}
    >
      {children}
    </Component>
  );
}
