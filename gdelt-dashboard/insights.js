"use strict";
/* ============================================================================
   NoiseFloor · NFInsights — retrieval-style Q&A over the project's own data
   A miniature RAG pipeline, fully client-side and grounded ONLY in verified
   NoiseFloor content:
       corpus    → curated passages built from data_bundle.js + event log
       index     → hand-built inverted index (token → passage ids)
       retrieve  → TF-IDF scoring, top-k passages
       answer    → templated synthesis with citations
   This is our DSA showcase #2 (after the DateIndex binary-search engine).
   ========================================================================== */
(function () {

  const esc = window.NFEsc || (s => String(s ?? ''));

  // ─── Corpus ────────────────────────────────────────────────────────────────
  function buildCorpus(DATA) {
    const P = [];
    const add = (id, title, text, tags) => P.push({ id, title, text, tags });

    add('spike', 'Sept 9 2025 volume spike',
      'On 2025-09-09 GDELT logged 2,370 Nepal events in a single day — a 30.99x jump over the 30-day baseline of 76.47 events/day.',
      ['spike', 'september', 'protest', 'volume', 'genz', '2025']);
    add('oli', 'Political sequence: Oli resigns, Karki sworn in',
      'PM K.P. Sharma Oli resigned on September 9 as protests peaked; former chief justice Sushila Karki was sworn in to lead an interim government on September 12. Two distinct causal events on two distinct dates.',
      ['oli', 'karki', 'resign', 'interim', 'government', 'september']);
    add('hx1', 'HX-001 — the India-China tone gap is structural',
      'Across all three crises India averages -2.33 vs China -0.48: a 1.85-point structural gap. Paired t-test t=-13.95 (n=3), p=0.0051 — the null of equal tone is rejected.',
      ['hypothesis', 'gap', 'ttest', 'significant', 'hx1', 'tone']);
    add('hx2', 'HX-002 — India is stable across a decade',
      'India\u2019s mean tone barely moves between crisis windows (-2.26 earthquake, -2.43 blockade, -2.30 Gen-Z). Regression gives p=0.8094 — indistinguishable from a flat line.',
      ['india', 'stable', 'stability', 'decade', 'change', 'hx2']);
    add('hx3', 'HX-003 — parallel disconnected narratives',
      'Daily India-tone and China-tone correlate at Pearson r=-0.0235 (p=0.824): statistically independent. The two media systems react to different triggers about the same country.',
      ['correlation', 'narrative', 'daily', 'react', 'hx3']);
    add('hx4', 'HX-004 — China drifts negative',
      'China\u2019s tone erodes crisis by crisis: -0.29 (Earthquake) -> -0.45 (Blockade) -> -0.71 (Gen-Z). Downward trend significant at p=0.015.',
      ['china', 'drift', 'negative', 'secular', 'hx4', 'trend']);
    add('bhutan', 'Finding: the Bhutan anomaly',
      'Of 96 countries covering Nepal only Bhutan shows a positive average tone (+1.64). India sits at -3.25 and China at -0.61 in the all-time country table.',
      ['bhutan', 'positive', 'neighbour', 'countries', 'anomaly']);
    add('eq', '2015 Earthquake window',
      'During the 2015 Earthquake window India averaged -2.2623 tone over 61 active days (1,277 events); China averaged -0.2866 over 60 days (1,849 events). Gap: +1.98.',
      ['earthquake', '2015', 'disaster', 'window', 'quake']);
    add('bl', '2015 Blockade window',
      'During the 2015 Blockade India averaged -2.4345 over 95 days (859 events); China -0.4450 over 90 days (1,366 events). Gap: +1.99 — the widest of the three crises.',
      ['blockade', 'border', '2015', 'fuel', 'window']);
    add('gz', '2025 Gen-Z protest window',
      'In the Gen-Z window India averaged -2.2958 (568 events) while China averaged -0.7109 (368 events). India produced 24,503 events in the broader period with a 30.99x single-day spike.',
      ['genz', '2025', 'protest', 'youth', 'september']);
    add('quad', 'Behaviour mix shift 2015 vs 2025',
      'CAMEO QuadClass shares moved from Verbal Cooperation 62.65% (2015) to 56.10% (2025), while Material Conflict rose from 14.11% to 17.70%. Cooperation recedes as physical conflict rises.',
      ['quadclass', 'conflict', 'cooperation', 'behaviour', 'cameo']);
    add('scale', 'Dataset scale',
      'The pipeline ingested 35.52 million GDELT events from 22,000 parquet files and filtered 148,180 Nepal-relevant records published by 96 countries.',
      ['dataset', 'records', 'million', 'parquet', 'scale', 'gdelt']);
    add('dsa', 'Data structures: DateIndex',
      'The Date Explorer queries through a hand-built DateIndex: a sorted date array plus inverted map answered by binary search in O(log n + k), replacing the naive O(n) scan. Complexity is displayed live with each query.',
      ['dsa', 'binary', 'search', 'index', 'complexity', 'dateindex', 'structure']);
    add('tone', 'What the tone score means',
      'GDELT scores every article from -100 to +100 using NLP sentiment analysis; NoiseFloor averages these daily per actor to build a comparable mood index.',
      ['tone', 'score', 'sentiment', 'average', 'meaning']);
    add('anom', 'Anomaly detection method',
      'A day is flagged anomalous when its tone deviates more than 2 standard deviations from that country\u2019s own trailing 7-day rolling mean; volume spikes are flagged against a 30-day baseline.',
      ['anomaly', 'zscore', 'spike', 'detection', 'sigma']);
    return P;
  }

  // ─── Index + retrieval ─────────────────────────────────────────────────────
  const STOP = new Set('the a an and or of to in on for at by with from as is are was were be it its this that what how why when which who whom do does did is'.split(' '));

  function tokenize(s) {
    return String(s || '').toLowerCase().split(/[^a-z0-9]+/)
      .filter(w => w.length > 2 && !STOP.has(w));
  }

  let INDEX = null; // term -> Map(passageId -> tf)

  function buildIndex(corpus) {
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

  function retrieve(query, corpus, k = 3) {
    const terms = tokenize(query).map(t => (INDEX[t] ? t : null)).filter(Boolean);
    if (!terms.length) return [];
    const N = corpus.length;
    const scores = {};
    for (const t of terms) {
      const postings = INDEX[t];
      const idf = Math.log(1 + N / Object.keys(postings).length);
      for (const [pid, tf] of Object.entries(postings)) {
        scores[pid] = (scores[pid] || 0) + (tf / (corpus.find(p => p.id === pid)._len || 1)) * idf;
      }
    }
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([pid, score]) => ({ passage: corpus.find(p => p.id === pid), score }));
  }

  // ─── View wiring ───────────────────────────────────────────────────────────
  const SUGGESTIONS = [
    'How negative was Indian media during the protests?',
    'Is the India China tone gap statistically real?',
    'Which country covers Nepal most positively?',
    'What happened on September 9 2025?',
    'Is China becoming more negative over time?',
    'How large is the dataset?'
  ];

  function answer(query) {
    const area = document.getElementById('ins-answer-area');
    if (!area || !INDEX) return;
    const hits = retrieve(query, CORPUS);
    if (!hits.length) {
      area.innerHTML = `<div class="insight-answer"><span class="text-warning font-mono text-xs">NO MATCH</span>
        <p class="text-sm text-muted mt-2">Nothing in the verified NoiseFloor corpus matches that. Try one of the suggested questions.</p></div>`;
      return;
    }
    area.innerHTML = `
      <div class="insight-answer">
        <span class="label-caps text-success">ANSWER — grounded in ${hits.length} retrieved passage${hits.length > 1 ? 's' : ''}</span>
        ${hits.map(h => `
          <p class="text-sm text-muted mt-4" style="margin-top:12px;">${esc(h.passage.text)}</p>
          <div class="insight-source">SOURCE · ${esc(h.passage.title)} · relevance ${(h.score * 100).toFixed(0)}</div>`).join('')}
      </div>`;
  }

  let CORPUS = [];

  function init() {
    if (init._ready) return;
    const view = document.getElementById('view-insights');
    const DATA = window.GDELT_DATA;
    if (!view || !DATA) return;

    CORPUS = buildCorpus(DATA);
    // Live passages from the verified event log
    for (const ev of (DATA.event_log || [])) {
      CORPUS.push({
        id: 'ev-' + ev.date,
        title: `Verified event ${ev.date}: ${ev.event}`,
        text: `${ev.date} — ${ev.title} (${ev.description}) Source: ${ev.source}. Confidence: ${ev.confidence}.`,
        tags: ['event', 'log', ...tokenize(ev.event)]
      });
      INDEX = null; // rebuild
    }
    INDEX = buildIndex(CORPUS);

    const sugBox = document.getElementById('ins-suggestions');
    if (sugBox && !sugBox.children.length) {
      for (const s of SUGGESTIONS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'suggestion-chip';
        b.textContent = s;
        b.addEventListener('click', () => {
          document.getElementById('ins-query').value = s;
          answer(s);
        });
        sugBox.appendChild(b);
      }
    }

    const btn = document.getElementById('ins-ask');
    const input = document.getElementById('ins-query');
    if (btn && input && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => answer(input.value));
      input.addEventListener('keydown', e => { if (e.key === 'Enter') answer(input.value); });
    }
    if (window.NFInsights) window.NFInsights.ready = true;
  }

  window.NFInsights = { init, ready: false };
  Object.defineProperty(window.NFInsights, '_readyFlag', { value: true });
})();
