import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUpIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import WorldMap from '../WorldMap';
import { REPORTING_COUNTRIES, REGION_AGGREGATES } from '../../data/countries';
import { EVENT_LOG } from '../../data/nepalData';
import { formatTone, fadeInUp, headingReveal, scaleIn } from '../../utils/helpers';
import { useStore } from '../../store/useStore';
import GlassCard from '../UI/GlassCard';

const COLUMNS = [
  { key: 'name', label: 'Country' },
  { key: 'avgTone', label: 'Avg Tone' },
  { key: 'eventCount', label: 'Events' },
];

function rowClasses(country) {
  if (country.code === 'IND') return 'bg-india/10';
  if (country.code === 'CHN') return 'bg-china/10';
  if (country.isAnomaly) return 'bg-gold/10';
  return '';
}

export default function CountryComparison() {
  const [sortKey, setSortKey] = useState('eventCount');
  const [sortDir, setSortDir] = useState('desc');
  const selectedCountry = useStore((s) => s.selectedCountry);
  const setSelectedCountry = useStore((s) => s.setSelectedCountry);

  const sorted = useMemo(() => {
    const rows = [...REPORTING_COUNTRIES];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [sortKey, sortDir]);

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const detail = REPORTING_COUNTRIES.find((c) => c.code === selectedCountry);
  const relatedEvents = detail
    ? EVENT_LOG.filter((e) => e.detail.toLowerCase().includes(detail.name.toLowerCase()))
    : [];

  return (
    <div className="flex flex-col gap-8 px-6 py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <motion.h2
          initial="hidden"
          animate="visible"
          variants={headingReveal}
          className="mb-2 text-h2 font-serif font-bold text-text-primary"
        >
          Country Comparison
        </motion.h2>
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="mb-8 max-w-2xl text-sm text-text-secondary"
        >
          {REPORTING_COUNTRIES.length} countries reported on Nepal between 2015 and 2025 (plus{' '}
          {REGION_AGGREGATES.length} GDELT regional aggregates, not shown on the map). Click a country
          to see its detail. India and China are outlined in their brand colors; Bhutan — the sole
          positive-tone outlier at meaningful sample size — is outlined in gold.
        </motion.p>

        <WorldMap />

        <AnimatePresence>
          {detail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="mt-6 overflow-hidden"
            >
              <GlassCard hover={false} className="relative">
                <button
                  type="button"
                  onClick={() => setSelectedCountry(null)}
                  aria-label="Close country detail"
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                <h3 className="font-serif text-xl font-semibold text-text-primary">{detail.name}</h3>
                <div className="mt-3 flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-text-secondary">Average Tone</p>
                    <p className="text-2xl font-bold text-gold-bright">{formatTone(detail.avgTone)}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Total Events</p>
                    <p className="text-2xl font-bold text-text-primary">{detail.eventCount}</p>
                  </div>
                </div>
                {relatedEvents.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-text-secondary">
                      Referenced in the verified event log
                    </p>
                    <ul className="space-y-1 text-sm text-text-secondary">
                      {relatedEvents.map((e) => (
                        <li key={e.date}>
                          <span className="text-gold-bright">{e.date}</span> — {e.event}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={scaleIn}
          className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-bg-card"
        >
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-text-secondary">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="flex min-h-[44px] items-center gap-1 hover:text-text-primary"
                    >
                      {col.label}
                      {sortKey === col.key &&
                        (sortDir === 'asc' ? (
                          <ChevronUpIcon className="h-3 w-3" />
                        ) : (
                          <ChevronDownIcon className="h-3 w-3" />
                        ))}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((country, i) => (
                <motion.tr
                  key={country.code}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.015, 0.6), ease: [0.4, 0, 0.2, 1] }}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`min-h-[44px] cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5 ${rowClasses(country)}`}
                >
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {country.name}
                    {country.isPrimary && (
                      <span className={country.code === 'IND' ? 'ml-2 text-india' : 'ml-2 text-china'}>
                        ●
                      </span>
                    )}
                    {country.isAnomaly && <span className="ml-2 text-gold">●</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{formatTone(country.avgTone)}</td>
                  <td className="px-4 py-3 text-text-secondary">{country.eventCount}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}
