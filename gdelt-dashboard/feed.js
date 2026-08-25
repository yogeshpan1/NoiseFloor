"use strict";
/* ============================================================================
   NoiseFloor · NFFeed — Live GDELT DOC 2.0 news feed
   • Streams by publishing country + language (EN/HI/ZH)
   • Poster-style thumbnail cards (socialimage w/ gradient fallback + lazy load)
   • Per-headline tone chip (NFSummarize lexicon score)
   • 3-point automated briefing per stream (on-device, extractive)
   • "VIEW FULL COVERAGE" expander per stream (all fetched articles)
   • 7-day date filter: exact UTC-day queries via startdatetime/enddatetime,
     per-session result cache, staggered fetches + explicit HTTP 429 messaging
   ========================================================================== */
(function () {

  const REFRESH_MS = 15 * 60 * 1000;
  const MAX_RECORDS = 20;
  const VISIBLE_CARDS = 6;          // cards shown before "VIEW FULL COVERAGE"
  const DAY_LABELS = ['Today', 'Yesterday', '2 days ago', '3 days ago',
                      '4 days ago', '5 days ago', '6 days ago'];

  const STREAMS = [
    { id: 'in-en', flag: '🇮🇳', region: 'in', label: 'India · English',
      query: '(nepal OR kathmandu) sourcecountry:in sourcelang:english',
      note: 'Indian outlets in English' },
    { id: 'in-hi', flag: '🇮🇳', region: 'in', label: 'India · Hindi',
      query: '(nepal OR kathmandu) sourcelang:hindi',
      note: 'Hindi-language native coverage' },
    { id: 'cn-en', flag: '🇨🇳', region: 'cn', label: 'China · English',
      query: '(nepal OR kathmandu) sourcecountry:cn sourcelang:english',
      note: 'Chinese state/global outlets in English' },
    { id: 'cn-zh', flag: '🇨🇳', region: 'cn', label: 'China · 简体中文',
      query: '(nepal OR 尼泊尔) sourcelang:simplifiedchinese',
      note: 'Simplified Chinese native coverage' },
    { id: 'gl-en', flag: '🌐', region: 'gl', label: 'Global · English',
      query: '(nepal OR kathmandu) sourcelang:english',
      note: 'Worldwide English baseline' }
  ];

  const esc = window.NFEsc || (s => String(s ?? '')
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let host = null;
  let lastFetch = 0;
  let loading = false;
  let dayOffset = null;             // null = latest rolling window; 0..6 = that UTC day
  const sessionCache = new Map();   // `${streamId}:${offset|latest}` -> articles[]

  function toneScore(a) {
    return window.NFSummarize ? NFSummarize.headlineTone(a.title) : 0;
  }

  function toneChip(score) {
    if (score > 1) return '<span class="chip tone-pos feed-tone">POS</span>';
    if (score < -1) return '<span class="chip tone-neg feed-tone">NEG</span>';
    return '<span class="chip tone-neu feed-tone">NEU</span>';
  }

  // ─── UTC day bounds for startdatetime/enddatetime (YYYYMMDDHHMMSS) ─────────
  function dayBounds(offset) {
    const pad2 = n => String(n).padStart(2, '0');
    const stamp = d => d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) +
                       pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds());
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - offset);
    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 0);
    return { start: stamp(start), end: stamp(end) };
  }

  function buildUrl(S) {
    const p = new URLSearchParams({
      query: S.query, mode: 'artlist', maxrecords: String(MAX_RECORDS),
      format: 'json', sort: 'datedesc'
    });
    if (dayOffset !== null) {
      const b = dayBounds(dayOffset);
      p.set('startdatetime', b.start);
      p.set('enddatetime', b.end);
    }
    return 'https://api.gdeltproject.org/api/v2/doc/doc?' + p.toString();
  }

  // ─── Task 1: poster-style article card ──────────────────────────────────────
  function articleCardHtml(a, S) {
    const score = toneScore(a);
    const date = (a.seendate || '').replace(/^(\d{4})(\d{2})(\d{2}).*$/, '$1-$2-$3');
    const img = a.socialimage
      ? `<img src="${esc(a.socialimage)}" alt="" loading="lazy" referrerpolicy="no-referrer"
             onerror="this.onerror=null;this.remove();">`
      : '';
    return `<a class="feed-card" href="${esc(a.url)}" target="_blank" rel="noopener">
      <div class="feed-thumb thumb-${S.region}">
        <span class="feed-thumb-fallback">${esc(a.domain)}</span>
        ${img}
      </div>
      <div class="feed-card-body">
        <div class="feed-card-title">${esc(a.title)}</div>
        <div class="feed-item-meta">
          ${toneChip(score)}
          <span class="feed-domain">${esc(a.domain)}</span>
          <span class="feed-date">${esc(date)}</span>
        </div>
      </div>
    </a>`;
  }

  // ─── Full-coverage list rows reuse the original compact text layout ────────
  function articleRowHtml(a, S) {
    const score = window.NFSummarize ? NFSummarize.headlineTone(a.title) : 0;
    const date = (a.seendate || '').replace(/^(\d{4})(\d{2})(\d{2}).*$/, '$1-$2-$3');
    return `<a class="feed-item" href="${esc(a.url)}" target="_blank" rel="noopener">
      <div class="feed-item-title">${esc(a.title)}</div>
      <div class="feed-item-meta">
        ${toneChip(score)}
        <span class="feed-domain">${esc(a.domain)}</span>
        <span class="feed-tag">${esc(S.label)}</span>
        <span class="feed-date">${esc(date)}</span>
      </div>
    </a>`;
  }


  // ─── Task 3: aggregate tone strip for a selected day/stream ────────────────
  function summaryHtml(arts) {
    const scores = arts.map(toneScore);
    const avg = scores.length ? (scores.reduce((s, x) => s + x, 0) / scores.length) : 0;
    const pos = scores.filter(s => s > 1).length;
    const neg = scores.filter(s => s < -1).length;
    const neu = scores.length - pos - neg;
    const pct = n => Math.round(100 * n / scores.length);
    return `<div class="feed-summary">
      <span class="label-caps">DAY TONE μ</span><b>${avg.toFixed(2)}</b>
      <span class="chip tone-pos">${pct(pos)}% POS</span>
      <span class="chip tone-neu">${pct(neu)}% NEU</span>
      <span class="chip tone-neg">${pct(neg)}% NEG</span>
      <span class="text-xs text-dim">on-device lexicon over ${arts.length} headlines</span>
    </div>`;
  }

  function streamShell(S) {
    const card = document.createElement('div');
    card.className = 'card mb-4';
    card.id = `feed-${S.id}`;
    card.innerHTML = `
      <div class="card-header">
        <div class="flex items-center gap-3">
          <span style="font-size:18px;">${S.flag}</span>
          <div>
            <h3 class="text-sm font-semibold mb-1">${esc(S.label)}</h3>
            <span class="text-xs text-dim">${esc(S.note)}</span>
          </div>
        </div>
        <span style="display:flex; align-items:center; gap:10px;">
          <button class="feed-more-btn" type="button" data-role="more" style="display:none;">VIEW FULL COVERAGE</button>
          <span class="label-caps" data-role="status">LOADING…</span>
        </span>
      </div>
      <div class="briefing-box" data-role="brief">
        <span class="label-caps text-cyan">⚡ AI BRIEFING — 3 POINTS</span>
        <ol data-role="brief-list"><li>Summarising retrieved headlines…</li></ol>
      </div>
      <div data-role="summary"></div>
      <div class="feed-list" data-role="list">
        <div class="feed-empty">Fetching…</div>
      </div>
      <div class="feed-full" data-role="full" style="display:none;"></div>`;
    return card;
  }

  // ─── Render a stream from its article array (fresh fetch or session cache) ──
  function renderStream(card, S, arts) {
    const status = card.querySelector('[data-role="status"]');
    const list = card.querySelector('[data-role="list"]');
    const briefList = card.querySelector('[data-role="brief-list"]');
    const moreBtn = card.querySelector('[data-role="more"]');
    const summarySlot = card.querySelector('[data-role="summary"]');
    const fullPanel = card.querySelector('[data-role="full"]');

    status.textContent = `${arts.length} ARTICLES`;

    if (!arts.length) {
      list.innerHTML = '<div class="feed-empty">No articles found for this stream/window right now.</div>';
      summarySlot.innerHTML = '';
      briefList.innerHTML = '<li>Not enough headlines to summarise.</li>';
      moreBtn.style.display = 'none';
      return;
    }

    list.innerHTML = `<div class="feed-grid">${
      arts.slice(0, VISIBLE_CARDS).map(a => articleCardHtml(a, S)).join('')
    }</div>`;

    // Aggregate strip only for a specific selected day (LATEST keeps the old look)
    summarySlot.innerHTML = dayOffset !== null ? summaryHtml(arts) : '';

    const bullets = window.NFSummarize ? NFSummarize.brief(arts) : [];
    briefList.innerHTML = bullets.length
      ? bullets.map(b => `<li>${esc(b)}</li>`).join('')
      : '<li>Not enough headlines to summarise.</li>';

    // Task 2: expandable full-coverage panel (lazily built once per render)
    moreBtn.style.display = '';
    moreBtn.textContent = 'VIEW FULL COVERAGE';
    fullPanel.style.display = 'none';
    fullPanel.dataset.built = '';
    moreBtn.onclick = () => {
      const opening = fullPanel.style.display === 'none';
      if (opening && !fullPanel.dataset.built) {
        fullPanel.innerHTML =
          `<div class="feed-full-head"><span class="label-caps">FULL COVERAGE — ${arts.length} ARTICLES · ${esc(S.label)}</span></div>` +
          arts.map(a => articleRowHtml(a, S)).join('');
        fullPanel.dataset.built = '1';
      }
      fullPanel.style.display = opening ? '' : 'none';
      moreBtn.textContent = opening ? 'HIDE FULL COVERAGE' : 'VIEW FULL COVERAGE';
    };
  }

  async function fetchStream(S, card) {
    const key = `${S.id}:${dayOffset === null ? 'latest' : dayOffset}`;
    if (sessionCache.has(key)) {           // Task 3: no re-fetch for seen windows
      renderStream(card, S, sessionCache.get(key));
      return;
    }
    const status = card.querySelector('[data-role="status"]');
    const list = card.querySelector('[data-role="list"]');
    const briefList = card.querySelector('[data-role="brief-list"]');
    const url = buildUrl(S);

    try {
      const res = await fetch(url);
      if (res.status === 429) throw Object.assign(new Error('rate-limited'), { rateLimited: true });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const arts = (await res.json()).articles || [];
      sessionCache.set(key, arts);
      renderStream(card, S, arts);
    } catch (err) {
      const msg = err.rateLimited
        ? 'GDELT is rate-limiting us (HTTP 429). The feed auto-retries on next refresh — historical analysis is unaffected.'
        : `Could not reach GDELT (${esc(err.message)}). Check your connection; everything else on this page works offline from cached data.`;
      status.innerHTML = '<span class="text-warning">OFFLINE</span>';
      list.innerHTML = `<div class="feed-error">⚠ ${msg}</div>`;
      briefList.innerHTML = '<li>Unavailable while the stream is offline.</li>';
    }
  }

  async function loadAll(force) {
    if (loading) return;
    if (!force && dayOffset === null && Date.now() - lastFetch < REFRESH_MS) return;
    loading = true;
    // Stagger requests to stay friendly to the DOC API
    for (const [i, S] of STREAMS.entries()) {
      const card = document.getElementById(`feed-${S.id}`);
      if (card) await fetchStream(S, card);
      if (i < STREAMS.length - 1) await sleep(1200);
    }
    lastFetch = Date.now();
    loading = false;
  }

  // ─── Task 3: 7-day selector ─────────────────────────────────────────────────
  function setDay(off) {
    const isLatest = off === 'latest';
    dayOffset = isLatest ? null : Number(off);
    document.querySelectorAll('.day-chip').forEach(b => {
      const bLatest = b.dataset.off === 'latest';
      b.classList.toggle('active', isLatest ? bLatest : (!bLatest && Number(b.dataset.off) === dayOffset));
    });
    loadAll(true);                          // staggered exactly like initial load
  }

  function mount(force) {
    const view = document.getElementById('view-livefeed');
    if (!view) return;

    if (!host || !view.contains(host)) {
      // Append AFTER the intro paragraphs (never before them again)
      host = document.createElement('div');
      host.id = 'nf-feed-host';
      view.appendChild(host);
      for (const S of STREAMS) host.appendChild(streamShell(S));

      // Manual refresh + day-filter toolbar above the streams
      const bar = document.createElement('div');
      bar.className = 'flex items-center gap-4 mb-4 flex-wrap';
      bar.innerHTML = `
        <button class="btn-primary" type="button" data-nf-feed-refresh>
          <span class="material-symbols-outlined" style="font-size:16px;">refresh</span> REFRESH NOW
        </button>
        <div class="feed-dayfilter">
          <span class="label-caps">WINDOW</span>
          <button class="day-chip active" type="button" data-off="latest">LATEST</button>
          ${DAY_LABELS.map((l, i) => `<button class="day-chip" type="button" data-off="${i}">${esc(l.toUpperCase())}</button>`).join('')}
        </div>
        <span class="text-xs text-muted">Streams refresh automatically every 15 minutes. Tone chips &amp; briefings are generated on-device from retrieved titles.</span>`;
      view.insertBefore(bar, host);
      bar.querySelector('[data-nf-feed-refresh]').addEventListener('click', () => loadAll(true));
      bar.querySelector('.feed-dayfilter').addEventListener('click', e => {
        const btn = e.target.closest('.day-chip');
        if (btn && !btn.classList.contains('active')) setDay(btn.dataset.off);
      });
    }

    loadAll(force);
    // Auto-refresh only makes sense for the rolling LATEST window; a selected
    // historical day is immutable and served from the session cache instead.
    if (!mount._timer) mount._timer = setInterval(() => { if (dayOffset === null) loadAll(true); }, REFRESH_MS);
  }

  window.NFFeed = { mount };
})();
