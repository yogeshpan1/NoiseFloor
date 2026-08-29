/**
 * NoiseUI Insight Engine — DSA showcase #2 (ported from the original
 * gdelt-dashboard/insights.js). A hand-built inverted index + TF-IDF
 * retrieval engine, grounded strictly in this project's own verified
 * findings. Answers quote retrieved passages verbatim — never generated.
 */

export const CORPUS = [
  {
    id: 'spike',
    title: 'Sept 9 2025 volume spike',
    text: 'On 2025-09-09 GDELT logged 2,370 Nepal events in a single day — a 30.99x jump over the 30-day baseline of 76.47 events/day.',
    tags: ['spike', 'september', 'protest', 'volume', 'genz', '2025'],
  },
  {
    id: 'oli',
    title: 'Political sequence: Oli resigns, Karki sworn in',
    text: 'PM K.P. Sharma Oli resigned on September 9 as protests peaked; former chief justice Sushila Karki was sworn in to lead an interim government on September 12. Two distinct causal events on two distinct dates.',
    tags: ['oli', 'karki', 'resign', 'interim', 'government', 'september'],
  },
  {
    id: 'hx1',
    title: 'HX-001 — the India-China tone gap is structural',
    text: 'Across all three crises India averages -2.33 vs China -0.48: a 1.85-point structural gap. Welch t-test t=-13.95 (n=3), p=0.0051 — the null of equal tone is rejected.',
    tags: ['hypothesis', 'gap', 'ttest', 'significant', 'hx1', 'tone'],
  },
  {
    id: 'hx2',
    title: 'HX-002 — India is stable across a decade',
    text: 'India’s mean tone barely moves between crisis windows (-2.26 earthquake, -2.43 blockade, -2.30 Gen-Z). Regression gives p=0.8094 — indistinguishable from a flat line.',
    tags: ['india', 'stable', 'stability', 'decade', 'change', 'hx2'],
  },
  {
    id: 'hx3',
    title: 'HX-003 — parallel disconnected narratives',
    text: 'Daily India-tone and China-tone correlate at Pearson r=-0.0235 (p=0.824): statistically independent. The two media systems react to different triggers about the same country.',
    tags: ['correlation', 'narrative', 'daily', 'react', 'hx3'],
  },
  {
    id: 'hx4',
    title: 'HX-004 — China drifts negative',
    text: 'China’s tone erodes crisis by crisis: -0.29 (Earthquake) -> -0.45 (Blockade) -> -0.71 (Gen-Z). Downward trend significant at p=0.015.',
    tags: ['china', 'drift', 'negative', 'secular', 'hx4', 'trend'],
  },
  {
    id: 'bhutan',
    title: 'Finding: the Bhutan anomaly',
    text: 'Of 96 countries covering Nepal only Bhutan shows a positive average tone (+1.64). India sits at -3.25 and China at -0.61 in the all-time country table.',
    tags: ['bhutan', 'positive', 'neighbour', 'countries', 'anomaly'],
  },
  {
    id: 'eq',
    title: '2015 Earthquake window',
    text: 'During the 2015 Earthquake window India averaged -2.2623 tone over 61 active days (1,277 events); China averaged -0.2866 over 60 days (1,849 events). Gap: +1.98.',
    tags: ['earthquake', '2015', 'disaster', 'window', 'quake'],
  },
  {
    id: 'bl',
    title: '2015 Blockade window',
    text: 'During the 2015 Blockade India averaged -2.4345 over 95 days (859 events); China -0.4450 over 90 days (1,366 events). Gap: +1.99 — the widest of the three crises.',
    tags: ['blockade', 'border', '2015', 'fuel', 'window'],
  },
  {
    id: 'gz',
    title: '2025 Gen-Z protest window',
    text: 'In the Gen-Z window India averaged -2.2958 (568 events) while China averaged -0.7109 (368 events). India produced 24,503 events in the broader period with a 30.99x single-day spike.',
    tags: ['genz', '2025', 'protest', 'youth', 'september'],
  },
  {
    id: 'quad',
    title: 'Behaviour mix shift 2015 vs 2025',
    text: 'CAMEO QuadClass shares moved from Verbal Cooperation 62.65% (2015) to 56.10% (2025), while Material Conflict rose from 14.11% to 17.70%. Cooperation recedes as physical conflict rises.',
    tags: ['quadclass', 'conflict', 'cooperation', 'behaviour', 'cameo'],
  },
  {
    id: 'scale',
    title: 'Dataset scale',
    text: 'The pipeline ingested 35.52 million GDELT events from 22,000 parquet files and filtered 148,180 Nepal-relevant records published by 96 countries.',
    tags: ['dataset', 'records', 'million', 'parquet', 'scale', 'gdelt'],
  },
  {
    id: 'dsa',
    title: 'Data structures: DateIndex',
    text: 'The Date Explorer queries through a hand-built DateIndex: a sorted date array plus inverted map answered by binary search in O(log n + k), replacing the naive O(n) scan. Complexity is displayed live with each query.',
    tags: ['dsa', 'binary', 'search', 'index', 'complexity', 'dateindex', 'structure'],
  },
  {
    id: 'tone',
    title: 'What the tone score means',
    text: 'GDELT scores every article from -100 to +100 using NLP sentiment analysis; NoiseFloor averages these daily per actor to build a comparable mood index.',
    tags: ['tone', 'score', 'sentiment', 'average', 'meaning'],
  },
  {
    id: 'anom',
    title: 'Anomaly detection method',
    text: 'A day is flagged anomalous when its tone deviates more than 2 standard deviations from that country’s own trailing 7-day rolling mean; volume spikes are flagged against a 30-day baseline.',
    tags: ['anomaly', 'zscore', 'spike', 'detection', 'sigma'],
  },
];

const STOP = new Set(
  'the a an and or of to in on for at by with from as is are was were be it its this that what how why when which who whom do does did'.split(
    ' ',
  ),
);

export function tokenize(s) {
  return String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

export function buildIndex(corpus) {
  const index = {};
  for (const p of corpus) {
    const counts = {};
    for (const t of tokenize(`${p.title} ${p.text} ${p.tags.join(' ')}`)) {
      counts[t] = (counts[t] || 0) + 1;
    }
    p._len = Object.values(counts).reduce((a, b) => a + b, 0);
    for (const [t, n] of Object.entries(counts)) {
      (index[t] = index[t] || {})[p.id] = n;
    }
  }
  return index;
}

// Built once at module scope — the corpus is static, no useMemo needed.
export const INDEX = buildIndex(CORPUS);

export function retrieve(query, corpus = CORPUS, index = INDEX, k = 3) {
  const terms = tokenize(query).filter((t) => index[t]);
  if (!terms.length) return [];
  const N = corpus.length;
  const scores = {};
  for (const t of terms) {
    const postings = index[t];
    const idf = Math.log(1 + N / Object.keys(postings).length);
    for (const [pid, tf] of Object.entries(postings)) {
      const passage = corpus.find((p) => p.id === pid);
      scores[pid] = (scores[pid] || 0) + (tf / (passage?._len || 1)) * idf;
    }
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([pid, score]) => ({ passage: corpus.find((p) => p.id === pid), score }));
}

export const SUGGESTIONS = [
  'How negative was Indian media during the protests?',
  'Is the India China tone gap statistically real?',
  'Which country covers Nepal most positively?',
  'What happened on September 9 2025?',
  'Is China becoming more negative over time?',
  'How large is the dataset?',
];

const GREET_RE = /^(hi|hii+|hello|hey|namaste|namaskar|good\s*(morning|afternoon|evening))\b/i;
const THANKS_RE = /^(thank(s| you)|dhanyabad|thx|great|awesome|nice work)\b/i;
const FOLLOWUP_RE = /^(more|tell me more|go on|continue|explain more|more details?|elaborate|next)\b/i;

export function classifyQuery(q) {
  if (GREET_RE.test(q)) return 'greet';
  if (THANKS_RE.test(q)) return 'thanks';
  if (FOLLOWUP_RE.test(q)) return 'followup';
  return 'question';
}
