import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** Wraps the scrollable main content area: native smooth scrolling + reset to top on route change. */
export default function SmoothScroll({ children, className = '' }) {
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    ref.current?.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);

  return (
    <div ref={ref} className={`h-full overflow-y-auto scroll-smooth ${className}`}>
      {children}
    </div>
  );
}
