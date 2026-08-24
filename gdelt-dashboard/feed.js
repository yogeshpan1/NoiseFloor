"use strict";
/* ============================================================================
   NoiseFloor · NFFeed — Live GDELT DOC 2.0 news feed
   • Streams by publishing country + language (EN/HI/ZH)
   • Per-headline tone chip (NFSummarize lexicon score)
   • 3-point automated briefing per stream (on-device, extractive)
   • Appends BELOW the view intro (mount-position bug fixed)
   • Staggered fetches + explicit HTTP 429 messaging
   ========================================================================== */
(function () {

  const REFRESH_MS = 15 * 60 * 1000;
  const MAX_RECORDS = 20;

  const STREAMS = [
    { id: 'in-en', flag: '🇮🇳', label: 'India · English',
      query: '(nepal OR kathmandu) sourcecountry:in sourcelang:english',
      note: 'Indian outlets in English' },
    { id: 'in-hi', flag: '🇮🇳', label: 'India · Hindi',
      query: '(nepal OR kathmandu) sourcelang:hindi',
      note: 'Hindi-language native coverage' },
    { id: 'cn-en', flag: '🇨🇳', label: 'China · English',
      query: '(nepal OR kathmandu) sourcecountry:cn sourcelang:english',
      note: 'Chinese state/global outlets in English' },
    { id: 'cn-zh', flag: '🇨🇳', label: 'China · 简体中文',
      query: '(nepal OR 尼泊尔) sourcelang:simplifiedchinese',
      note: 'Simplified Chinese native coverage' },
    { id: 'gl-en', flag: '🌐', label: 'Global · English',
      query: '(nepal OR kathmandu) sourcelang:english',
      note: 'Worldwide English baseline' }
  ];

  const esc = window.NFEsc || (s => String(s ?? '')
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let host = null;
  let lastFetch = 0;
  let loading = false;

  function toneChip(score) {
    if (score > 1) return '<span class="chip tone-pos feed-tone">POS</span>';
    if (score < -1) return '<span class="chip tone-neg feed-tone">NEG</span>';
    return '<span class="chip tone-neu feed-tone">NEU</span>';
  }

  function articleHtml(a, S) {
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
        <span class="label-caps" data-role="status">LOADING…</span>
      </div>
      <div class="briefing-box" data-role="brief">
        <span class="label-caps text-cyan">⚡ AI BRIEFING — 3 POINTS</span>
        <ol data-role="brief-list"><li>Summarising retrieved headlines…</li></ol>
      </div>
      <div class="feed-list" data-role="list">
        <div class="feed-empty">Fetching…</div>
      </div>`;
    return card;
  }

  async function fetchStream(S, card) {
    const status = card.querySelector('[data-role="status"]');
    const list = card.querySelector('[data-role="list"]');
    const briefList = card.querySelector('[data-role="brief-list"]');
    const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
      encodeURIComponent(S.query) +
      `&mode=artlist&maxrecords=${MAX_RECORDS}&format=json&sort=datedesc`;

    try {
      const res = await fetch(url);
      if (res.status === 429) throw Object.assign(new Error('rate-limited'), { rateLimited: true });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const arts = (await res.json()).articles || [];

      status.textContent = `${arts.length} ARTICLES`;
      list.innerHTML = arts.length
        ? arts.map(a => articleHtml(a, S)).join('')
        : '<div class="feed-empty">No articles in the recent index for this stream right now.</div>';

      const bullets = window.NFSummarize ? NFSummarize.brief(arts) : [];
      briefList.innerHTML = bullets.length
        ? bullets.map(b => `<li>${esc(b)}</li>`).join('')
        : '<li>Not enough headlines to summarise.</li>';
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
    if (!force && Date.now() - lastFetch < REFRESH_MS) return;
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

  function mount(force) {
    const view = document.getElementById('view-livefeed');
    if (!view) return;

    if (!host || !view.contains(host)) {
      // Append AFTER the intro paragraphs (never before them again)
      host = document.createElement('div');
      host.id = 'nf-feed-host';
      view.appendChild(host);
      for (const S of STREAMS) host.appendChild(streamShell(S));

      // Manual refresh button above the streams
      const bar = document.createElement('div');
      bar.className = 'flex items-center gap-4 mb-4 flex-wrap';
      bar.innerHTML = `
        <button class="btn-primary" type="button" data-nf-feed-refresh>
          <span class="material-symbols-outlined" style="font-size:16px;">refresh</span> REFRESH NOW
        </button>
        <span class="text-xs text-muted">Streams refresh automatically every 15 minutes. Tone chips &amp; briefings are generated on-device from retrieved titles.</span>`;
      view.insertBefore(bar, host);
      bar.querySelector('[data-nf-feed-refresh]').addEventListener('click', () => loadAll(true));
    }

    loadAll(force);
    if (!mount._timer) mount._timer = setInterval(() => loadAll(true), REFRESH_MS);
  }

  window.NFFeed = { mount };
})();
