import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useStore } from '../../store/useStore';
import ProgressBar from './ProgressBar';

const LINES = [
  'Between two superpowers...',
  '...a small nation watches the world watch it.',
  '35.5 million news articles.',
  '10 years of stories.',
  'One truth emerges.',
  'Welcome to NoiseFloor.',
];

export default function TypewriterStory() {
  const textRef = useRef(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const setPreloaderProgress = useStore((s) => s.setPreloaderProgress);
  const preloaderProgress = useStore((s) => s.preloaderProgress);
  const setAppPhase = useStore((s) => s.setAppPhase);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      const master = gsap.timeline({
        onComplete: () => {
          setPreloaderProgress(100);
          gsap.delayedCall(0.6, () => setAppPhase('globe'));
        },
      });

      const perLineProgress = 100 / LINES.length;

      LINES.forEach((line, i) => {
        const state = { chars: 0 };
        const holdTime = reducedMotion ? 0.05 : 1.1;

        master.to(state, {
          chars: line.length,
          duration: reducedMotion ? 0.05 : Math.min(3.2, 0.065 * line.length),
          ease: 'none',
          onUpdate: () => {
            setLineIndex(i);
            setDisplayText(line.slice(0, Math.round(state.chars)));
            setPreloaderProgress(i * perLineProgress + (state.chars / line.length) * perLineProgress);
          },
        });
        master.to({}, { duration: holdTime });
        if (i < LINES.length - 1) {
          master.to(textRef.current, {
            opacity: 0,
            duration: reducedMotion ? 0.05 : 0.3,
            onComplete: () => setDisplayText(''),
          });
          master.to(textRef.current, { opacity: 1, duration: reducedMotion ? 0.05 : 0.3 });
        }
      });
    });

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFinalLine = lineIndex === LINES.length - 1;

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-10 px-6 text-center">
      <p
        ref={textRef}
        className={`font-serif tracking-[0.02em] text-gold-gradient ${
          isFinalLine
            ? 'text-[clamp(1.75rem,7vw,3.5rem)] font-bold'
            : 'text-[clamp(1.1rem,4.5vw,2.25rem)] font-medium italic'
        }`}
        style={{ minHeight: '3em' }}
      >
        {displayText}
        <span className="animate-pulse text-gold">|</span>
      </p>
      <ProgressBar progress={preloaderProgress} />
    </div>
  );
}
