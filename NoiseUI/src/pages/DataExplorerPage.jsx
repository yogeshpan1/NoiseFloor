import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DAILY_SENTIMENT, INDIA_CHINA_DAILY, INCIDENTS, TIMELINE_ALIGNED,
} from '../data/nepalData';
import { REPORTING_COUNTRIES } from '../data/countries';
import { fadeInUp, headingReveal } from '../utils/helpers';
import { useScrollReveal } from '../hooks/useScrollReveal';
import GlassCard from '../components/UI/GlassCard';
import DataTable from '../components/UI/DataTable';

const DATASETS = {
  daily: { label: 'Daily Sentiment', rows: DAILY_SENTIMENT },
  india_china: { label: 'India vs China Daily', rows: INDIA_CHINA_DAILY },
  countries: { label: 'Reporting Countries', rows: REPORTING_COUNTRIES },
  incidents: { label: 'Incident Summary', rows: INCIDENTS },
  aligned: { label: 'Aligned Timeline', rows: TIMELINE_ALIGNED },
};

function columnsFor(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0])
    .filter((k) => k !== 'latLon')
    .map((k) => ({
      key: k,
      label: k,
      align: typeof rows[0][k] === 'number' ? 'right' : 'left',
    }));
}

export default function DataExplorerPage() {
  const [ref, isVisible] = useScrollReveal();
  const [datasetKey, setDatasetKey] = useState('daily');

  const dataset = DATASETS[datasetKey];
  const columns = useMemo(() => columnsFor(dataset.rows), [dataset]);

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-2 text-h2 font-serif font-bold text-text-primary"
        >
          Data Explorer
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-8 max-w-2xl text-sm text-text-secondary"
        >
          Browse every raw dataset behind this dashboard, search across all columns, and export
          exactly what's shown as CSV.
        </motion.p>

        <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={fadeInUp}>
          <GlassCard hover={false}>
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(DATASETS).map(([key, d]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDatasetKey(key)}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    datasetKey === key
                      ? 'bg-gold/15 text-gold-bright'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <DataTable
              key={datasetKey}
              columns={columns}
              rows={dataset.rows}
              searchable
              exportFilename={`noiseui-${datasetKey}.csv`}
            />
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
