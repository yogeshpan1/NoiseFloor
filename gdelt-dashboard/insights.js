"use strict";
/* ============================================================================
   NoiseFloor · NFInsights — verified-answer search over the project's own data
   A hand-built retrieval engine (inverted index + TF-IDF), fully client-side and grounded ONLY in verified
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

  // ─── Conversational layer ──────────────────────────────────────────────────
  // Makes the retrieval engine behave like a chat partner: greeting/thanks
  // handling, "tell me more" pagination through the last ranking, and
  // clickable follow-up chips after every grounded answer.
  const FOLLOWUP_RE = /^(more|tell me more|go on|continue|explain more|more details?|elaborate|next)\b/i;
  const GREET_RE = /^(hi|hii+|hello|hey|namaste|namaskar|good\s*(morning|afternoon|evening))\b/i;
  const THANKS_RE = /^(thank(s| you)|dhanyabad|thx|great|awesome|nice work)\b/i;
  let lastRanking = [];   // full ranked hit list for the last real question
  let lastShown = 0;      // passages already revealed to the reader
  let lastTopic = '';     // the question that produced lastRanking

  const chip = (label, ask) =>
    `<button class="suggestion-chip" type="button" data-ask="${esc(ask)}" style="margin:8px 6px 0 0;">${esc(label)}</button>`;

  const suggestionChips = (n = 3) => SUGGESTIONS.slice(0, n).map(s => chip(s, s)).join('');

  function bindChips(row) {
    row.querySelectorAll('[data-ask]').forEach(b =>
      b.addEventListener('click', () => {
        const inp = document.getElementById('ins-query');
        if (inp) inp.value = b.dataset.ask;
        answer(b.dataset.ask);
      }));
  }

  // Next-unseen passages from the current ranking, offered as follow-ups.
  function followChips(fromIdx) {
    return lastRanking.slice(fromIdx).slice(0, 2)
      .map(h => chip('→ ' + h.passage.title, 'Tell me more about: ' + h.passage.title))
      .join('');
  }

  const passageHtml = h =>
    `<p class="text-sm text-muted" style="margin-top:10px;">${esc(h.passage.text)}</p>
     <div class="insight-source">SOURCE · ${esc(h.passage.title)} · relevance ${(h.score * 100).toFixed(0)}</div>`;

  function answer(query) {
    const area = document.getElementById('ins-answer-area');
    if (!area || !INDEX || !query.trim()) return;
    const q = query.trim();

    // User bubble (right side)
    const userRow = document.createElement('div');
    userRow.className = 'nf-chat-row user';
    userRow.innerHTML = `<div class="nf-chat-bubble">${esc(q)}</div>`;
    area.appendChild(userRow);

    // Assistant bubble with typing indicator, then grounded retrieval
    const botRow = document.createElement('div');
    botRow.className = 'nf-chat-row bot';
    botRow.innerHTML = `<div class="nf-chat-bubble typing"><span></span><span></span><span></span></div>`;
    area.appendChild(botRow);
    area.scrollTop = area.scrollHeight;

    setTimeout(() => {
      let html = '';

      if (GREET_RE.test(q)) {
        html = `<div class="nf-chat-bubble">
          <p class="text-sm text-muted" style="margin:0;">Namaste 🙏 I'm grounded strictly in the verified NoiseFloor
          dataset — three crisis windows, four hypothesis tests, 96 source countries and every logged event date.
          What would you like to know?</p>${suggestionChips()}</div>`;

      } else if (THANKS_RE.test(q)) {
        html = `<div class="nf-chat-bubble">
          <p class="text-sm text-muted" style="margin:0;">Anytime. Dig deeper on the last topic, or start a new thread:</p>
          ${lastRanking.length ? followChips(0) || suggestionChips() : suggestionChips()}</div>`;

      } else if (FOLLOWUP_RE.test(q) && lastRanking.length) {
        const next = lastRanking.slice(lastShown, lastShown + 3);
        if (next.length) {
          lastShown += next.length;
          html = `<div class="nf-chat-bubble">
            <span class="label-caps text-success">MORE ON “${esc(lastTopic)}” — passage${next.length > 1 ? 's' : ''} ${lastShown - next.length + 1}–${lastShown} of ${lastRanking.length}</span>
            ${next.map(passageHtml).join('')}
            ${followChips(lastShown) || `<p class="text-xs text-dim" style="margin-top:10px;">That's the full verified record for this topic — ask a new question for anything else.</p>`}</div>`;
        } else {
          html = `<div class="nf-chat-bubble">
            <p class="text-sm text-muted" style="margin:0;">That's everything the verified corpus holds on
            “${esc(lastTopic)}”. Try one of these instead:</p>${suggestionChips()}</div>`;
        }

      } else {
        const hits = retrieve(q, CORPUS);
        if (!hits.length) {
          html = `<div class="nf-chat-bubble"><span class="text-warning font-mono text-xs">NO MATCH</span>
            <p class="text-sm text-muted" style="margin-top:8px;">Nothing in the verified NoiseFloor corpus matches that —
            I only answer from this project's data, never invent facts. Try one of these:</p>${suggestionChips()}</div>`;
        } else {
          lastRanking = retrieve(q, CORPUS, 99);   // keep the full ranking for "tell me more"
          lastShown = hits.length;
          lastTopic = q;
          html = `<div class="nf-chat-bubble">
            <span class="label-caps text-success">ANSWER — grounded in ${hits.length} retrieved passage${hits.length > 1 ? 's' : ''}</span>
            ${hits.map(passageHtml).join('')}
            ${followChips(lastShown)}</div>`;
        }
      }

      botRow.innerHTML = html;
      bindChips(botRow);
      area.scrollTop = area.scrollHeight;
    }, 450 + Math.random() * 400);   // small human-ish delay
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
