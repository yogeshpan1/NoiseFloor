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
  const CARDS_PER_PAGE = 4;         // carousel page size
  const SLIDE_MS = 5000;            // auto-slide interval
  const DAY_LABELS = ['Today', 'Yesterday', '2 days ago', '3 days ago',
                      '4 days ago', '5 days ago', '6 days ago'];

  // Each perspective MERGES one or more DOC queries (e.g. English + Hindi),
  // de-duplicates by URL and sorts newest-first before rendering.
  const SECTIONS = [
    {
      id: 'in2np', flag: '🇮🇳', title: 'India → Nepal', region: 'in',
      note: 'How Indian media houses are narrating Nepal right now (English + Hindi)',
      streams: [
        { id: 'in-en', label: 'IN · EN', query: '(nepal OR kathmandu) sourcecountry:in sourcelang:english' },
        { id: 'in-hi', label: 'IN · HI', query: '(nepal OR kathmandu) sourcelang:hindi' }
      ]
    },
    {
      id: 'cn2np', flag: '🇨🇳', title: 'China → Nepal', region: 'cn',
      note: 'Chinese state and global outlets on Nepal (English + 简体中文)',
      streams: [
        { id: 'cn-en', label: 'CN · EN', query: '(nepal OR kathmandu) sourcecountry:CH sourcelang:english' },
        { id: 'cn-zh', label: 'CN · ZH', query: '(nepal OR 尼泊尔) sourcelang:simplifiedchinese' }
      ]
    },
    {
      id: 'np2ic', flag: '🇳🇵', title: 'Nepal → India & China', region: 'np',
      note: 'Nepali media houses reporting on both neighbours (the reverse gaze)',
      streams: [
        { id: 'np-en', label: 'NP · EN', query: '(india OR china OR indian OR chinese) sourcecountry:np sourcelang:english' }
      ]
    },
    {
      id: 'gl2np', flag: '🌐', title: 'World → Nepal', region: 'gl',
      note: 'Worldwide English baseline — how the rest of the world frames Nepal',
      streams: [
        { id: 'gl-en', label: 'GL · EN', query: '(nepal OR kathmandu) sourcelang:english' }
      ]
    }
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
        <span class="feed-domain-badge">${esc(a.domain)}</span>
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
  function articleRowHtml(a, tagLabel) {
    const score = window.NFSummarize ? NFSummarize.headlineTone(a.title) : 0;
    const date = (a.seendate || '').replace(/^(\d{4})(\d{2})(\d{2}).*$/, '$1-$2-$3');
    return `<a class="feed-item" href="${esc(a.url)}" target="_blank" rel="noopener">
      <div class="feed-item-title">${esc(a.title)}</div>
      <div class="feed-item-meta">
        ${toneChip(score)}
        <span class="feed-domain">${esc(a.domain)}</span>
        <span class="feed-tag">${esc(tagLabel)}</span>
        <span class="feed-date">${esc(date)}</span>
      </div>
    </a>`;
  }


  // ─── Section-level aggregate tone strip ────────────────────────────────────
  function summaryHtml(arts) {
    const scores = arts.map(toneScore);
    const avg = scores.length ? (scores.reduce((s, x) => s + x, 0) / scores.length) : 0;
    const pos = scores.filter(s => s > 1).length;
    const neg = scores.filter(s => s < -1).length;
    const neu = scores.length - pos - neg;
    const pct = n => scores.length ? Math.round(100 * n / scores.length) : 0;
    return `<div class="feed-summary">
      <span class="label-caps">SECTION TONE μ</span><b>${avg.toFixed(2)}</b>
      <span class="chip tone-pos">${pct(pos)}% POS</span>
      <span class="chip tone-neu">${pct(neu)}% NEU</span>
      <span class="chip tone-neg">${pct(neg)}% NEG</span>
      <span class="text-xs text-dim">on-device lexicon over ${arts.length} headlines</span>
    </div>`;
  }

  function sectionShell(S) {
    const card = document.createElement('div');
    card.className = 'card mb-4 nf-section';
    card.id = `feed-${S.id}`;
    card.innerHTML = `
      <div class="card-header">
        <div class="flex items-center gap-3">
          <span style="font-size:18px;">${S.flag}</span>
          <div>
            <h3 class="text-sm font-semibold mb-1">${esc(S.title)}</h3>
            <span class="text-xs text-dim">${esc(S.note)}</span>
          </div>
        </div>
        <span style="display:flex; align-items:center; gap:10px;">
          <button class="feed-more-btn" type="button" data-role="more" style="display:none;">VIEW FULL COVERAGE</button>
          <span class="label-caps" data-role="status">LOADING…</span>
        </span>
      </div>
      <div data-role="summary"></div>
      <div class="briefing-box" data-role="brief">
        <span class="label-caps text-cyan">⚡ AI BRIEFING — 3 POINTS</span>
        <ol data-role="brief-list"><li>Summarising retrieved headlines…</li></ol>
      </div>
      <div class="nf-carousel" data-role="carousel">
        <div class="nf-track" data-role="track">
          <div class="feed-empty" style="width:100%;">Fetching…</div>
        </div>
        <button class="nf-arrow nf-arrow-prev" data-role="prev" type="button" aria-label="Previous page">
          <span class="material-symbols-outlined" style="font-size:18px;">chevron_left</span>
        </button>
        <button class="nf-arrow nf-arrow-next" data-role="next" type="button" aria-label="Next page">
          <span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span>
        </button>
      </div>
      <div class="nf-dots" data-role="dots" style="display:none;"></div>
      <div class="feed-full" data-role="full" style="display:none;"></div>`;
    return card;
  }

  // ─── Carousel engine: pages of CARDS_PER_PAGE cards, auto-slide, dots ──────
  function buildCarousel(card, S, arts) {
    const carousel = card.querySelector('[data-role="carousel"]');
    const track = card.querySelector('[data-role="track"]');
    const dotsBox = card.querySelector('[data-role="dots"]');

    const pages = [];
    for (let i = 0; i < arts.length; i += CARDS_PER_PAGE) {
      pages.push(`<div class="nf-page">${
        arts.slice(i, i + CARDS_PER_PAGE).map(a => articleCardHtml(a, S)).join('')
      }</div>`);
    }
    track.innerHTML = pages.join('');
    track.style.width = `${pages.length * 100}%`;

    if (pages.length <= 1) {
      dotsBox.style.display = 'none';
      const p = card.querySelector('[data-role="prev"]'), n = card.querySelector('[data-role="next"]');
      if (p) p.style.display = 'none';
      if (n) n.style.display = 'none';
      return;
    }

    dotsBox.style.display = '';
    dotsBox.innerHTML = pages.map((_, i) =>
      `<button class="nf-dot${i === 0 ? ' active' : ''}" type="button" aria-label="Page ${i + 1}"></button>`).join('');

    let page = 0;
    let timer = null;

    const go = p => {
      page = (p + pages.length) % pages.length;
      track.style.transform = `translateX(-${page * (100 / pages.length)}%)`;
      dotsBox.querySelectorAll('.nf-dot').forEach((d, i) => d.classList.toggle('active', i === page));
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const play = () => { stop(); timer = setInterval(() => go(page + 1), SLIDE_MS); };

    dotsBox.querySelectorAll('.nf-dot').forEach((d, i) =>
      d.addEventListener('click', () => { go(i); play(); }));

    // Edge arrows
    const prevBtn = card.querySelector('[data-role="prev"]');
    const nextBtn = card.querySelector('[data-role="next"]');
    if (prevBtn) prevBtn.addEventListener('click', () => { go(page - 1); play(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { go(page + 1); play(); });

    // Touch / pointer swipe (a >40px horizontal drag flips the page; smaller
    // movements still fall through to the article link)
    let dragX = null;
    carousel.addEventListener('pointerdown', e => { dragX = e.clientX; stop(); });
    carousel.addEventListener('pointerup', e => {
      if (dragX === null) return;
      const dx = e.clientX - dragX;
      dragX = null;
      if (Math.abs(dx) > 40) go(page + (dx < 0 ? 1 : -1));
      play();
    });
    carousel.addEventListener('pointercancel', () => { dragX = null; play(); });

    // Pause while the reader is looking at (or keyboard-navigating) this section
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', play);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', play);

    go(0);
    play();
  }

  // ─── Render one perspective section from merged articles ───────────────────
  function renderSection(card, S, arts) {
    const status = card.querySelector('[data-role="status"]');
    const briefList = card.querySelector('[data-role="brief-list"]');
    const moreBtn = card.querySelector('[data-role="more"]');
    const summarySlot = card.querySelector('[data-role="summary"]');
    const fullPanel = card.querySelector('[data-role="full"]');

    status.textContent = `${arts.length} ARTICLES`;

    if (!arts.length) {
      card.querySelector('[data-role="track"]').innerHTML =
        '<div class="feed-empty" style="width:100%;">No articles found for this perspective/window right now.</div>';
      summarySlot.innerHTML = '';
      briefList.innerHTML = '<li>Not enough headlines to summarise.</li>';
      moreBtn.style.display = 'none';
      return;
    }

    summarySlot.innerHTML = summaryHtml(arts);
    buildCarousel(card, S, arts);

    const bullets = window.NFSummarize ? NFSummarize.brief(arts) : [];
    briefList.innerHTML = bullets.length
      ? bullets.map(b => `<li>${esc(b)}</li>`).join('')
      : '<li>Not enough headlines to summarise.</li>';

    moreBtn.style.display = '';
    moreBtn.textContent = 'VIEW FULL COVERAGE';
    fullPanel.style.display = 'none';
    fullPanel.dataset.built = '';
    moreBtn.onclick = () => {
      const opening = fullPanel.style.display === 'none';
      if (opening && !fullPanel.dataset.built) {
        fullPanel.innerHTML =
          `<div class="feed-full-head"><span class="label-caps">FULL COVERAGE — ${arts.length} ARTICLES · ${esc(S.title)}</span></div>` +
          arts.map(a => articleRowHtml(a, a._tag || '')).join('');
        fullPanel.dataset.built = '1';
      }
      fullPanel.style.display = opening ? '' : 'none';
      moreBtn.textContent = opening ? 'HIDE FULL COVERAGE' : 'VIEW FULL COVERAGE';
    };
  }

  async function fetchOne(S, streamDef) {
    const key = `${streamDef.id}:${dayOffset === null ? 'latest' : dayOffset}`;
    if (sessionCache.has(key)) return sessionCache.get(key);   // no re-fetch for seen windows
    const res = await fetch(buildUrl(streamDef));
    if (res.status === 429) throw Object.assign(new Error('rate-limited'), { rateLimited: true });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const arts = ((await res.json()).articles || []).map(a => ({ ...a, _tag: streamDef.label }));
    sessionCache.set(key, arts);
    return arts;
  }

  async function loadSection(S, card) {
    try {
      // Stagger multi-query sections (EN + HI / EN + ZH) to stay API-friendly
      const results = [];
      for (const [i, sd] of S.streams.entries()) {
        results.push(await fetchOne(S, sd));
        if (i < S.streams.length - 1) await sleep(900);
      }
      // Merge → dedupe by URL → newest first
      const seen = new Set();
      const merged = results.flat()
        .filter(a => a && a.url && !seen.has(a.url) && seen.add(a.url))
        .sort((a, b) => String(b.seendate || '').localeCompare(String(a.seendate || '')));
      renderSection(card, S, merged);
    } catch (err) {
      const status = card.querySelector('[data-role="status"]');
      const track = card.querySelector('[data-role="track"]');
      const briefList = card.querySelector('[data-role="brief-list"]');
      const msg = err.rateLimited
        ? 'GDELT is rate-limiting us (HTTP 429). The feed auto-retries on next refresh — historical analysis is unaffected.'
        : `Could not reach GDELT (${esc(err.message)}). Check your connection; everything else on this page works offline from cached data.`;
      status.innerHTML = '<span class="text-warning">OFFLINE</span>';
      track.innerHTML = `<div class="feed-error" style="width:100%;">⚠ ${msg}</div>`;
      briefList.innerHTML = '<li>Unavailable while the stream is offline.</li>';
    }
  }

  async function loadAll(force) {
    if (loading) return;
    if (!force && dayOffset === null && Date.now() - lastFetch < REFRESH_MS) return;
    loading = true;
    for (const [i, S] of SECTIONS.entries()) {
      const card = document.getElementById(`feed-${S.id}`);
      if (card) await loadSection(S, card);
      if (i < SECTIONS.length - 1) await sleep(1200);
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
      for (const S of SECTIONS) host.appendChild(sectionShell(S));

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
