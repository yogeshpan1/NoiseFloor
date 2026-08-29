import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useScrollReveal } from '../../hooks/useScrollReveal';

export default function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0, duration = 1.6 }) {
  const [ref, isVisible] = useScrollReveal();
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => v.toFixed(decimals));

  // `useScrollReveal`'s `once: true` default means isVisible flips false -> true
  // exactly once, so this doesn't need an extra "already animated" guard — and a
  // ref-based guard here would break under StrictMode's mount/cleanup/remount
  // double-invoke (the animation starts, gets stopped by the synchronous cleanup,
  // then the guard blocks it from ever restarting).
  useEffect(() => {
    if (!isVisible) return undefined;
    const controls = animate(motionValue, value, { duration, ease: [0.4, 0, 0.2, 1] });
    return () => controls.stop();
  }, [isVisible, value, duration, motionValue]);

  return (
    <span ref={ref}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
