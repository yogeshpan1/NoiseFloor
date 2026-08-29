// SOURCE: gdelt-dashboard's Data Sources + Methodology views — copy ported verbatim.

export const PIPELINE_STATS = [
  { label: 'Total Records', value: '35.52M', sub: 'Raw events ingested' },
  { label: 'Parquet Files', value: '22,000', sub: 'Columnar source partitions' },
  { label: 'Nepal Filtered', value: '148,180', sub: 'Events in our analysis set' },
  { label: 'Source Uptime', value: '99.98%', sub: 'Operational' },
];

export const PIPELINE_STEPS = [
  { icon: 'public', title: 'Raw GDELT Stream', sub: 'S3/Parquet' },
  { icon: 'description', title: 'PySpark Parsing', sub: 'Tone Extraction' },
  { icon: 'group', title: 'Actor Extraction', sub: 'India/China/Nepal' },
  { icon: 'storage', title: 'Statistical Storage', sub: '8 CSV Outputs' },
];

export const GEOGRAPHIC_REACH = [
  { code: 'SA', label: 'South Asia', density: 'High Density', status: 'ACTIVE' },
  { code: 'EA', label: 'East Asia', density: 'Medium Density', status: 'ACTIVE' },
  { code: 'GW', label: 'Global West', density: 'Sparse/Targeted', status: 'THROTTLED' },
];

export const METHODOLOGY_STEPS = [
  {
    num: '01',
    title: 'Extraction',
    body: '22,000 GDELT parquet files (35.5M events worldwide) are filtered down to every event mentioning Nepal. This leaves 148,180 relevant records.',
  },
  {
    num: '02',
    title: 'Actor Attribution',
    body: "Each record's source country is resolved via GDELT's Actor fields and domain geolocation, separating Indian media from Chinese media from the other 94 nations.",
  },
  {
    num: '03',
    title: 'Tone Aggregation',
    body: 'GDELT scores each article\'s emotional tone from −100 to +100 using NLP sentiment analysis. We average these daily per actor, producing a comparable "mood index".',
  },
  {
    num: '04',
    title: 'Hypothesis Testing',
    body: 'Paired t-tests across crisis windows test whether the India–China tone gap is real (HX-001), stable (HX-002), uncorrelated (HX-003) and drifting (HX-004).',
  },
  {
    num: '05',
    title: 'Spike & Anomaly Detection',
    body: 'Volume spikes are flagged against a 30-day baseline (Sept 9 = 30.99×), and tone anomalies are flagged when |z| > 2 versus each country\'s own 7-day rolling mean.',
  },
  {
    num: '06',
    title: 'Data Structures (DSA layer)',
    body: 'The Date Explorer runs on a hand-built DateIndex: sorted date array + inverted map, queried by binary search in O(log n + k). The Insight Engine adds a TF-IDF-scored inverted index over verified findings for retrieval-style Q&A.',
  },
];

export const CAVEATS = [
  "GDELT's tone score is machine-generated; sarcasm and irony can fool it.",
  'Event counts measure attention, not importance.',
  'Only three crises were sampled — n = 3 for the paired t-test, so p-values are indicative rather than definitive.',
  'Crisis windows are aligned by trigger day; different event durations can bias averages.',
  'The live feed depends on the GDELT DOC API, which occasionally rate-limits (HTTP 429).',
];

export const REPRODUCIBILITY = [
  'backend/build_data.py rebuilds every dataset + asserts locked statistics before shipping.',
  'backend/tests/ contains pytest suites for the pipeline and the DateIndex.',
  'notebook_addendum.ipynb reproduces the reverse-direction stats in Colab.',
];
