/*
 * NoiseFloor — Live News Feed module
 * ----------------------------------
 * Pulls REAL articles straight from the GDELT DOC 2.0 API
 * (https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) and renders two
 * sections requested for the project:
 *
 *   A. "World -> Nepal": what Indian & Chinese media are publishing about
 *      Nepal right now — INCLUDING native-language coverage
 *      (Hindi via sourcelang:hindi, Simplified Chinese via
 *      sourcelang:simplifiedchinese).
 *   B. "Nepal -> World": what Nepali media (sourcecountry:np) are publishing
 *      about India and China.
 *
 * Auto-refreshes every 15 minutes (REFRESH_MS). GDELT's index lags real
 * time by ~15 minutes anyway, so this cadence matches the data pipeline.
 *
 * NOTE ON DATA SOURCE: these are live article records from GDELT's global
 * news index — nothing is invented client-side. If the API is unreachable,
 * the UI shows an explicit error state instead of fake rows.
 */
"use strict";

window.NFFeed = (() => {
  const REFRESH_MS = 15 * 60 * 1000; // 15 minutes
  const API = "https://api.gdeltproject.org/api/v2/doc/doc";

  const FEEDS = {
    world_to_nepal: [
      { id: "in-en", label: "India · English", color: "#FF3333",
        query: "(nepal OR kathmandu) sourcecountry:in sourcelang:english" },
      { id: "in-hi", label: "India · हिन्दी (Hindi)", color: "#FF7755",
        query: "(nepal OR kathmandu) sourcecountry:in sourcelang:hindi" },
      { id: "cn-en", label: "China · English", color: "#00FFFF",
        query: "(nepal OR kathmandu) sourcecountry:cn sourcelang:english" },
      { id: "cn-zh", label: "China · 中文 (Chinese)", color: "#00BBBB",
        query: "(nepal OR kathmandu) sourcecountry:cn sourcelang:simplifiedchinese" }
    ],
    nepal_to_world: [
      { id: "np-india", label: "Nepal → India", color: "#FFBF00",
        query: "(india OR delhi) sourcecountry:np" },
      { id: "np-china", label: "Nepal → China", color: "#FFDF80",
        query: "(china OR beijing) sourcecountry:np" }
    ]
  };

  function buildUrl(query, maxrecords) {
    return `${API}?query=${encodeURIComponent(query)}&mode=artlist` +
           `&maxrecords=${maxrecords}&format=json&sort=datedesc&timespan=3d`;
  }

  async function fetchFeed(feed) {
    const res = await fetch(buildUrl(feed.query, 25));
    if (!res.ok) throw new Error("GDELT API HTTP " + res.status);
    const json = await res.json();
    return json.articles || [];
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderArticles(el, articles, err) {
    if (err) {
      el.innerHTML = `<div class="feed-error">⚠ Feed unavailable (${escapeHtml(err.message)}).` +
        ` GDELT may be rate-limiting — will retry on next cycle.</div>`;
      return;
    }
    if (!articles.length) {
      el.innerHTML = `<div class="feed-empty">No indexed articles in this stream in the last 3 days.</div>`;
      return;
    }
    el.innerHTML = articles.map(a => `
      <a class="feed-item" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">
        <div class="feed-item-title">${escapeHtml(a.title)}</div>
        <div class="feed-item-meta">
          <span class="feed-domain">${escapeHtml(a.domain)}</span>
          ${a.sourcecountry ? `<span class="feed-tag">${escapeHtml(a.sourcecountry)}</span>` : ""}
          ${a.language ? `<span class="feed-tag">${escapeHtml(a.language)}</span>` : ""}
          <span class="feed-date">${escapeHtml((a.seendate || "").replace("T", " ").replace("Z", " UTC"))}</span>
        </div>
      </a>`).join("");
  }

  /* ---------- mounting & auto-refresh (15 min) ---------- */

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  async function refreshAll() {
    let first = true;
    for (const groupKey of Object.keys(FEEDS)) {
      for (const feed of FEEDS[groupKey]) {
        const el = document.getElementById("feed-" + feed.id);
        if (!el) continue;
        // GDELT rate-limits bursts (HTTP 429): space requests ~3s apart
        if (!first) await sleep(3000);
        first = false;
        try { renderArticles(el, await fetchFeed(feed), null); }
        catch (e) { renderArticles(el, [], e); }
      }
    }
    const statusEl = document.getElementById("feed-status");
    if (statusEl) statusEl.textContent =
      "Last refreshed: " + new Date().toLocaleTimeString() + " · auto-refreshes every 15 min";
  }

  function mount() {
    const host = document.getElementById("view-livefeed");
    if (!host || host.dataset.feedMounted) return;
    host.dataset.feedMounted = "1";

    const groupsHtml = Object.keys(FEEDS).map(gk => `
      <h3 class="text-sm font-semibold mt-6 mb-2">${gk === "world_to_nepal"
        ? "A · India &amp; China media covering Nepal (incl. native language)"
        : "B · Nepali media covering India &amp; China"}</h3>
      <div class="grid-2" id="feed-${gk}">
        ${FEEDS[gk].map(f => `
          <div class="card">
            <div class="card-header" style="justify-content: flex-start; gap:8px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${f.color};display:inline-block;"></span>
              <span class="label-caps">${f.label}</span>
            </div>
            <div class="card-body feed-list" id="feed-${f.id}">
              <div class="feed-empty">Loading…</div>
            </div>
          </div>`).join("")}
      </div>`).join("");

    const controls = document.createElement("div");
    controls.className = "flex items-center gap-4 mb-4";
    controls.innerHTML = `
      <span class="material-symbols-outlined text-cyan">rss_feed</span>
      <span class="text-sm">Live GDELT DOC-index headlines</span>
      <span class="chip text-success">AUTO-REFRESH · 15 MIN</span>
      <button id="feed-refresh-btn" class="btn-primary" style="padding:4px 12px;font-size:11px;">REFRESH NOW</button>
      <span id="feed-status" class="text-xs text-muted"></span>`;
    host.prepend(controls);
    host.insertAdjacentHTML("beforeend", groupsHtml);

    document.getElementById("feed-refresh-btn")
      .addEventListener("click", () => refreshAll());

    refreshAll();
    setInterval(refreshAll, REFRESH_MS);
  }

  return { mount, REFRESH_MS };
})();
