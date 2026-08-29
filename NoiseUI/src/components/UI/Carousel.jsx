import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * Auto-sliding, paged carousel. `items` is pre-chunked into pages by the
 * caller (see LiveFeedSection) so page size can vary per viewport without
 * this component knowing about breakpoints.
 */
export default function Carousel({ pages, interval = 5000, renderPage }) {
  const [rawPage, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragX = useRef(null);

  useEffect(() => {
    if (paused || pages.length <= 1) return undefined;
    const id = setInterval(() => setPage((p) => (p + 1) % pages.length), interval);
    return () => clearInterval(id);
  }, [paused, pages.length, interval]);

  if (!pages.length) return null;

  // Clamp during render (not via a reset effect) for when `pages` shrinks
  // out from under the current page index, e.g. a Live Feed refresh that
  // returns fewer articles.
  const page = rawPage % pages.length;
  const go = (delta) => setPage((p) => (p + delta + pages.length) % pages.length);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={(e) => {
        dragX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (dragX.current == null) return;
        const dx = e.clientX - dragX.current;
        dragX.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {renderPage(pages[page])}
        </motion.div>
      </AnimatePresence>

      {pages.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => go(-1)}
            className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-x-3 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-bg-primary/80 text-text-primary opacity-0 backdrop-blur transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-[620px]:opacity-100"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => go(1)}
            className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 translate-x-3 items-center justify-center rounded-full border border-white/10 bg-bg-primary/80 text-text-primary opacity-0 backdrop-blur transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-[620px]:opacity-100"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          <div className="mt-4 flex justify-center gap-1.5">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Page ${i + 1}`}
                onClick={() => setPage(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === page ? 'w-5 bg-gold-bright' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
