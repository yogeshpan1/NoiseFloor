import { useEffect } from 'react';
import { useStore } from '../store/useStore';

function computeBreakpoint(width) {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Single source of truth for the responsive breakpoint. Mounted once in App.jsx
 * so only one resize listener runs; every component reads useStore(s => s.breakpoint).
 */
export function useResponsive() {
  const breakpoint = useStore((s) => s.breakpoint);
  const setBreakpoint = useStore((s) => s.setBreakpoint);

  useEffect(() => {
    const update = () => setBreakpoint(computeBreakpoint(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [setBreakpoint]);

  return breakpoint;
}
