import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import worldGeo from './../assets/world-110m.geo.json';
import { REPORTING_COUNTRIES } from '../data/countries';
import { useStore } from '../store/useStore';
import { scaleIn } from '../utils/helpers';

const byCode = new Map(REPORTING_COUNTRIES.map((c) => [c.code, c]));

/** Diverging red -> slate -> gold scale, clamped to a readable range so a couple
 * of thin-sample outliers don't wash out the rest of the map. */
function toneColor(tone) {
  const clamped = Math.max(-6, Math.min(2, tone));
  if (clamped <= 0) {
    const t = clamped / -6; // 0..1 toward red
    return `rgb(${Math.round(90 + t * 165)}, ${Math.round(90 - t * 46)}, ${Math.round(100 - t * 32)})`;
  }
  const t = clamped / 2; // 0..1 toward gold
  return `rgb(${Math.round(90 + t * 122)}, ${Math.round(90 + t * 85)}, ${Math.round(100 - t * 45)})`;
}

export default function WorldMap() {
  const selectedCountry = useStore((s) => s.selectedCountry);
  const setSelectedCountry = useStore((s) => s.setSelectedCountry);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setPainted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const paths = useMemo(
    () =>
      worldGeo.features.map((f) => {
        const country = f.properties.code ? byCode.get(f.properties.code) : null;
        return { ...f, country };
      }),
    [],
  );

  // Countries "paint in" one after another, capped so 177 paths still settle inside ~1.1s.
  const delayFor = (i) => Math.min(i * 4, 1100);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-bg-card p-2 sm:p-4"
    >
      <svg
        viewBox={`0 0 ${worldGeo.width} ${worldGeo.height}`}
        className="mx-auto w-full min-w-[640px]"
        role="img"
        aria-label="World map colored by average media tone toward Nepal"
      >
        {paths.map((f, i) => {
          const { country } = f;
          const isSelected = country && selectedCountry === country.code;
          const fill = country ? toneColor(country.avgTone) : 'rgba(255,255,255,0.05)';
          const stroke = country?.isPrimary
            ? country.code === 'IND'
              ? '#ff4444'
              : '#00ffff'
            : country?.isAnomaly
              ? '#f4d03f'
              : 'rgba(255,255,255,0.15)';

          return (
            <path
              key={f.id ?? `no-id-${i}`}
              d={f.pathD}
              fill={fill}
              stroke={isSelected ? '#f4d03f' : stroke}
              strokeWidth={isSelected ? 1.6 : country?.isPrimary || country?.isAnomaly ? 1.1 : 0.4}
              className={`transition-[opacity,filter] duration-500 ease-out ${country ? 'cursor-pointer hover:brightness-125' : ''}`}
              style={{
                opacity: painted ? 1 : 0,
                transitionDelay: `${delayFor(i)}ms`,
                filter: isSelected ? 'drop-shadow(0 0 6px rgba(244,208,63,0.8))' : undefined,
              }}
              onClick={() => country && setSelectedCountry(country.code)}
            >
              {country && (
                <title>
                  {country.name}: {country.avgTone.toFixed(2)} avg tone ({country.eventCount} events)
                </title>
              )}
            </path>
          );
        })}
      </svg>
    </motion.div>
  );
}
