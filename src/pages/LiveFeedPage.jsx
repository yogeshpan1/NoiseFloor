import { useState } from 'react';
import { motion } from 'framer-motion';
import { SECTIONS, SECTION_GAP_MS } from '../utils/liveFeedConfig';
import { fadeInUp, headingReveal, staggerContainer } from '../utils/helpers';
import { useScrollReveal } from '../hooks/useScrollReveal';
import LiveFeedSection from '../components/Dashboard/LiveFeedSection';

const DAY_LABELS = ['Today', 'Yesterday', '2 days ago', '3 days ago', '4 days ago', '5 days ago', '6 days ago'];

export default function LiveFeedPage() {
  const [ref, isVisible] = useScrollReveal();
  const [dayOffset, setDayOffset] = useState(null); // null = rolling latest window
  const [nonce, setNonce] = useState(0); // bump to remount sections with a fresh stagger schedule

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-2 text-h2 font-serif font-bold text-text-primary"
        >
          Live News Feed — Four Perspectives
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-6 max-w-3xl text-sm text-text-secondary"
        >
          Real headlines indexed by GDELT's global news index — India→Nepal, China→Nepal, Nepal→India&China
          and World→Nepal. Each section: an on-device tone reading per headline and a 3-point briefing.
          Auto-refreshes every 15 minutes.
        </motion.p>

        <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={fadeInUp} className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Window</span>
          <button
            type="button"
            onClick={() => { setDayOffset(null); setNonce((n) => n + 1); }}
            className={`min-h-[32px] rounded-lg px-3 py-1 text-xs font-medium ${dayOffset === null ? 'bg-gold/15 text-gold-bright' : 'bg-white/5 text-text-secondary'}`}
          >
            LATEST
          </button>
          {DAY_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => { setDayOffset(i); setNonce((n) => n + 1); }}
              className={`min-h-[32px] rounded-lg px-3 py-1 text-xs font-medium ${dayOffset === i ? 'bg-gold/15 text-gold-bright' : 'bg-white/5 text-text-secondary'}`}
            >
              {label.toUpperCase()}
            </button>
          ))}
        </motion.div>

        <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={staggerContainer} className="flex flex-col gap-6">
          {SECTIONS.map((section, i) => (
            <motion.div key={`${section.id}-${nonce}`} variants={fadeInUp}>
              <LiveFeedSection section={section} initialDelayMs={i * SECTION_GAP_MS} dayOffset={dayOffset} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
