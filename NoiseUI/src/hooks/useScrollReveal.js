import { useEffect, useRef, useState } from 'react';

/**
 * IntersectionObserver-based scroll reveal. Returns [ref, isVisible].
 * Fires once by default (mirrors Framer Motion's whileInView + viewport once) so
 * reveals don't re-trigger on every scroll direction change.
 */
export function useScrollReveal({ threshold = 0.15, once = true } = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || isVisible) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once, isVisible]);

  return [ref, isVisible];
}
