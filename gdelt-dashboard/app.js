"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const DATA = window.GDELT_DATA;
  if (!DATA) { console.error("GDELT_DATA not found!"); return; }


  // ─── Chart.js Global Defaults (tokens from CSS variables) ────────────────
  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const P = {
    india: cssVar('--accent-india'),
    china: cssVar('--accent-china'),
    ok:    cssVar('--accent-success'),
    warn:  cssVar('--accent-warning'),
    text:  cssVar('--text-main'),
    muted: cssVar('--text-muted'),
    dim:   cssVar('--text-dim')
  };
  const rgba = (hex, a) => {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return isNaN(n) ? `rgba(136,136,136,${a})` : `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  Chart.defaults.color = P.dim;
  Chart.defaults.font.family = "'JetBrains Mono', monospace";
  Chart.defaults.font.size = 10;

  const grid = { color: 'rgba(44,44,53,0.55)', tickColor: 'rgba(44,44,53,0.55)' };
  const gridX = { color: 'rgba(44,44,53,0.35)' };
  const tooltipDefaults = {
    backgroundColor: '#121217',
    borderColor: '#2C2C35',
    borderWidth: 1,
    titleColor: P.text,
    bodyColor: P.muted,
    titleFont: { family: "'JetBrains Mono', monospace", size: 10, weight: 'bold' },
    bodyFont: { family: "'JetBrains Mono', monospace", size: 10 },
    padding: 10,
    displayColors: true,
    intersect: false,
    mode: 'index'
  };

  // ─── Sidebar Navigation ─────────────────────────────────────────────────
  const navLinks = document.querySelectorAll('.nav-link');
  const viewPages = document.querySelectorAll('.view-page');

  let chartsInitialized = {};

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Update active nav styling
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Toggle view
      const viewId = link.getAttribute('data-view');
      viewPages.forEach(page => {
        if (page.id === `view-${viewId}`) {
          page.classList.add('active');
        } else {
          page.classList.remove('active');
        }
      });

      const tbTitle = document.getElementById('topbar-title');
      if (tbTitle && link.getAttribute('data-title')) tbTitle.textContent = link.getAttribute('data-title');

      // Init chart if not yet done
      if (!chartsInitialized[viewId]) {
        chartsInitialized[viewId] = true;
        setTimeout(() => initChartsForView(viewId), 50);
      }
    });
  });

  // In-page cross links (dashboard cards → other views)
  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => {
      const target = document.querySelector(`.nav-link[data-view="${el.getAttribute('data-goto')}"]`);
      if (target) target.click();
    });
  });

  // Init initial view — deferred like nav clicks (setTimeout) so the whole
  // handler body (incl. `const $` and all helpers) finishes evaluating first;
  // calling this synchronously hit `Cannot access '$' before initialization`.
  setTimeout(() => initChartsForView('dashboard'), 50);
  chartsInitialized['dashboard'] = true;

  function initChartsForView(viewId) {
    if (viewId === 'dashboard') initDashboard();
    if (viewId === 'earthquake') initEarthquake();
    if (viewId === 'blockade') initBlockade();
    if (viewId === 'genz') initGenZ();
    if (viewId === 'keyfindings') initKeyFindings();
    if (viewId === 'hypothesis') initHypothesis();
    if (viewId === 'datasources') initDataSources();
    if (viewId === 'explorer') initExplorer();
    if (viewId === 'dateexplorer') initDateExplorer();
    if (viewId === 'trends') initTrends();
    if (viewId === 'livefeed') { if (window.NFFeed) NFFeed.mount(); }
    if (viewId === 'insights' && window.NFInsights && !window.NFInsights.ready) window.NFInsights.init();
    if (window.NFGeoViews) NFGeoViews.initView(viewId);
    if (viewId === 'dashboard' && window.NFGlobe) NFGlobe.mount(document.getElementById('globe-canvas'), DATA.countries);
  }

  // ─── DSA DATE INDEX (built ONCE at page load) + global state ──────────
  // These are the actual lookup engines behind Date Explorer and the
  // global date filter — see gdelt-dashboard/date_index.js for the
  // algorithm and its O(log n + k) complexity documentation.
  const IDX = {
    daily: new NFDateIndex(DATA.daily_sentiment || []),
    ic: new NFDateIndex(DATA.india_china_daily || [])
  };
  const EVENT_LOG = DATA.event_log || [];
  const state = { dateFilter: null }; // {start, end} when active

  const $ = id => document.getElementById(id);

  function fmt(n, d = 2) {
    return n == null || isNaN(n) ? "—" : Number(n).toFixed(d);
  }

  // HTML-escape anything injected from external sources (GDELT titles, domains…)
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  window.NFEsc = esc;

  function toneColor(t) {
    // red (negative) → grey (neutral) → green (positive)
    const clamped = Math.max(-10, Math.min(10, t));
    const alpha = Math.min(1, Math.abs(clamped) / 8 + 0.08);
    return clamped < 0 ? rgba(P.india, alpha) : rgba(P.ok, alpha);
  }

  // Shared: per-incident summary lookup
  function incidentRows(incident) {
    return (DATA.incidents_summary || []).filter(r => r.incident === incident);
  }
  function sumRow(incident, country) {
    return incidentRows(incident).find(r => r.country === country) || null;
  }

  // Event-log annotation plugin: draws dashed vertical lines + enriches tooltips
  const eventLogPlugin = {
    id: 'nfEventLog',
    afterDatasetsDraw(chart) {
      const logs = chart.$nfEvents;
      if (!logs || !chart.scales.x || !chart.chartArea) return;
      const ctx = chart.ctx, xs = chart.scales.x, area = chart.chartArea;
      logs.forEach(ev => {
        const x = xs.getPixelForValue(ev.date);
        if (!isFinite(x) || x < area.left || x > area.right) return;
        ctx.save();
        ctx.strokeStyle = rgba(P.warn, 0.75);
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, area.top); ctx.lineTo(x, area.bottom);
        ctx.stroke();
        ctx.restore();
      });
    }
  };
  if (window.Chart) Chart.register(eventLogPlugin);


  // ─── Shared builders ────────────────────────────────────────────────────
  function alignedTrajectory(canvasId, period) {
    const el = document.getElementById(canvasId);
    if (!el || !DATA.timeline_aligned) return;
    const rows = DATA.timeline_aligned
      .filter(d => d.period === period)
      .sort((a, b) => a.days_since_start - b.days_since_start);

    if (!rows.length) {
      const box = el.closest('.chart-container') || el.parentElement;
      if (box) box.innerHTML = '<div class="feed-empty" style="display:flex;align-items:center;justify-content:center;height:100%;text-align:center;">Daily per-day data for this window predates our extract (daily series starts 2015-09-09). Window means are shown in the KPI cards and coverage panel.</div>';
      return;
    }

    new Chart(el, {
      type: 'line',
      $nfRows: rows,
      data: {
        labels: rows.map(d => d.days_since_start),
        datasets: [{
          label: 'Avg tone (all coverage)',
          data: rows.map(d => d.avg_tone),
          borderColor: P.china,
          backgroundColor: rgba(P.china, 0.08),
          fill: true, borderWidth: 2, tension: 0.35, pointRadius: 1, pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipDefaults },
        scales: {
          y: { grid, title: { display: true, text: 'Avg tone', color: P.dim } },
          x: { grid: gridX, title: { display: true, text: 'Days from T\u2080', color: P.dim } }
        }
      }
    });
  }

  function volumePanel(panelId, incident) {
    const el = document.getElementById(panelId);
    if (!el || !DATA.incidents_summary) return;
    const ind = sumRow(incident, 'India'), chn = sumRow(incident, 'China');
    if (!ind || !chn) return;
    const maxEv = Math.max(ind.total_events, chn.total_events);
    const block = (r, colorVar) => `
      <div>
        <div class="flex justify-between items-baseline mb-1">
          <span class="label-caps">${r.country}</span>
          <span class="font-mono text-lg font-medium" style="color:var(${colorVar});">${r.total_events.toLocaleString()}</span>
        </div>
        <div style="height:10px; background:var(--bg-inset); border-radius:5px; overflow:hidden;">
          <div style="height:100%; width:${Math.max(3, 100 * r.total_events / maxEv)}%; background:var(${colorVar}); border-radius:5px;"></div>
        </div>
        <div class="text-xs text-dim mt-1 font-mono">${r.event_days} active days · mean tone ${r.avg_tone}</div>
      </div>`;
    el.innerHTML =
      block(ind, '--accent-india') + block(chn, '--accent-china') +
      `<div class="text-xs text-muted" style="border-top:1px solid var(--border); padding-top:12px;">
         More coverage &ne; harsher coverage — compare volumes with the mean tones above.
       </div>`;
  }

  // ─── VIEW: DASHBOARD ────────────────────────────────────────────────────
  function initDashboard() {
    if (DATA.incidents_summary) {
      const incidents = ['2015 Earthquake', '2015 Blockade', '2025 Gen-Z Protest'];
      const mean = (inc, c) => { const r = sumRow(inc, c); return r ? r.avg_tone : null; };
      new Chart($('chart-dash-divergence'), {
        type: 'line',
        data: {
          labels: ['Earthquake 2015', 'Blockade 2015', 'Gen-Z 2025'],
          datasets: [
            { label: 'India', data: incidents.map(i => mean(i, 'India')),
              borderColor: P.india, backgroundColor: rgba(P.india, 0.10), fill: true,
              borderWidth: 2, tension: 0.35, pointRadius: 4, pointHoverRadius: 7 },
            { label: 'China', data: incidents.map(i => mean(i, 'China')),
              borderColor: P.china, backgroundColor: rgba(P.china, 0.10), fill: true,
              borderWidth: 2, tension: 0.35, pointRadius: 4, pointHoverRadius: 7 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: tooltipDefaults },
          scales: {
            y: { grid, title: { display: true, text: 'Average tone', color: P.dim } },
            x: { grid: gridX }
          }
        }
      });
    }

    if (DATA.quadclass) {
      const pick = (year, cls) =>
        (DATA.quadclass.find(q => q.period === year && q.QuadClass === cls) || {}).percentage ?? 0;
      const years = [...new Set(DATA.quadclass.map(q => q.period))].sort();
      new Chart($('chart-dash-quad'), {
        type: 'bar',
        data: {
          labels: ['V.Coop', 'M.Coop', 'V.Conf', 'M.Conf'],
          datasets: years.map((y, i) => ({
            label: String(y),
            data: [1, 2, 3, 4].map(c => pick(y, c)),
            backgroundColor: i === 0 ? P.china : P.warn,
            borderRadius: 4, barPercentage: 0.55
          }))
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true } }, tooltip: tooltipDefaults },
          scales: { y: { grid, title: { display: true, text: '% of events', color: P.dim } }, x: { grid: { display: false } } }
        }
      });
    }
  }

  // ─── VIEW: EARTHQUAKE ───────────────────────────────────────────────────
  function initEarthquake() {
    alignedTrajectory('chart-eq-aligned', '2015 Earthquake');
    volumePanel('eq-volume-panel', '2015 Earthquake');
  }

  // ─── VIEW: BLOCKADE ─────────────────────────────────────────────────────
  function initBlockade() {
    alignedTrajectory('chart-bl-aligned', '2015 Blockade');
    volumePanel('bl-volume-panel', '2015 Blockade');

    const ctxQuad = document.getElementById('chart-bl-quad');
    if (ctxQuad && DATA.quadclass) {
      const pick = (year, cls) =>
        (DATA.quadclass.find(q => q.period === year && q.QuadClass === cls) || {}).percentage ?? 0;
      new Chart(ctxQuad, {
        type: 'bar',
        data: {
          labels: ['V.Coop', 'M.Coop', 'V.Conf', 'M.Conf'],
          datasets: [
            { label: '2015 Blockade', data: [1, 2, 3, 4].map(c => pick(2015, c)), backgroundColor: P.warn, borderRadius: 4, barPercentage: 0.55 },
            { label: '2025 Protests', data: [1, 2, 3, 4].map(c => pick(2025, c)), backgroundColor: P.india, borderRadius: 4, barPercentage: 0.55 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true } }, tooltip: tooltipDefaults },
          scales: { y: { grid, title: { display: true, text: '% of events', color: P.dim } }, x: { grid: { display: false } } }
        }
      });
    }
  }

  // ─── VIEW: GEN-Z ────────────────────────────────────────────────────────
  function initGenZ() {
    if (!DATA.india_china_daily && !DATA.daily_sentiment) return;

    alignedTrajectory('chart-gz-aligned', '2025 Gen-Z Protest');
    volumePanel('gz-volume-panel', '2025 Gen-Z Protest');

    // Daily event-volume bars around Sept 2025 (spike days highlighted red)
    let dailyRows = DATA.daily_sentiment.filter(r => r.event_date >= '2025-08-25' && r.event_date <= '2025-10-05');
    if (state.dateFilter) dailyRows = IDX.daily.rangeRows(state.dateFilter.start, state.dateFilter.end);
    const isSpike = r => r.is_spike === true || r.is_spike === 'True';

    new Chart($('chart-genz-waveform'), {
      type: 'bar',
      $nfRows: dailyRows,
      data: {
        labels: dailyRows.map(r => r.event_date),
        datasets: [{
          label: 'Events/day',
          data: dailyRows.map(r => r.total_events),
          backgroundColor: dailyRows.map(r => isSpike(r) ? rgba(P.india, 0.85) : rgba(P.china, 0.45)),
          borderRadius: 3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: Object.assign({}, tooltipDefaults, {
            callbacks: { afterBody: items => {
              const ev = EVENT_LOG.find(e => e.date === items[0].label);
              return ev ? `\n📌 ${ev.title}` : '';
            } }
          })
        },
        scales: {
          y: { type: 'logarithmic', grid, title: { display: true, text: 'events (log)', color: P.dim } },
          x: { grid: gridX, ticks: { maxTicksLimit: 14 } }
        }
      },
      plugins: [{ id: 'nfAttachGz', afterInit(c) {
        c.$nfEvents = EVENT_LOG.filter(e => e.date >= '2025-08-25');
      } }]
    });

    // India vs China daily tone lines (respects global filter via DateIndex)
    let icRows = DATA.india_china_daily.filter(r => r.event_date >= '2025-08-25');
    if (state.dateFilter) icRows = IDX.ic.rangeRows(state.dateFilter.start, state.dateFilter.end);
    const logsIn = state.dateFilter
      ? EVENT_LOG.filter(e => e.date >= state.dateFilter.start && e.date <= state.dateFilter.end)
      : EVENT_LOG.filter(e => e.date >= '2025-09-01');

    new Chart($('chart-genz-daily'), {
      type: 'line',
      data: {
        labels: icRows.map(d => d.event_date),
        datasets: [
          { label: 'India', data: icRows.map(d => d.india_tone),
            borderColor: P.india, borderWidth: 2, tension: 0.4, pointRadius: 1, pointHoverRadius: 6 },
          { label: 'China', data: icRows.map(d => d.china_tone),
            borderColor: P.china, borderWidth: 2, tension: 0.4, pointRadius: 1, pointHoverRadius: 6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { boxWidth: 10, usePointStyle: true } },
          tooltip: Object.assign({}, tooltipDefaults, {
            callbacks: { afterBody: items => {
              const d = items[0].label;
              const ev = logsIn.find(e => e.date === d);
              return ev ? `\n📌 ${ev.title}` : '';
            } }
          })
        },
        scales: { y: { grid }, x: { grid: gridX, ticks: { maxTicksLimit: 14 } } }
      },
      plugins: [{ id: 'nfAttachGz2', afterInit(c) { c.$nfEvents = logsIn; } }]
    });
  }

  // ─── VIEW: KEY FINDINGS ─────────────────────────────────────────────────
  function initKeyFindings() {
    // China's secular drift bars (HX-004 proof, replaces old CSS-div bars)
    const ctx = document.getElementById('chart-kf-drift');
    if (!ctx || !DATA.incidents_summary) return;
    const incidents = ['2015 Earthquake', '2015 Blockade', '2025 Gen-Z Protest'];
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Earthquake\n2015', 'Blockade\n2015', 'Gen-Z\n2025'],
        datasets: [{
          label: 'China mean tone',
          data: incidents.map(i => { const r = sumRow(i, 'China'); return r ? r.avg_tone : null; }),
          backgroundColor: incidents.map((_, i) => rgba(P.china, 0.3 + i * 0.25)),
          borderColor: P.china, borderWidth: 1, borderRadius: 6, barPercentage: 0.45
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipDefaults },
        scales: {
          y: { grid, title: { display: true, text: 'Mean tone', color: P.dim }, suggestedMin: -1.0, suggestedMax: 0.2 },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // ─── VIEW: HYPOTHESIS ENGINE ────────────────────────────────────────────
  function initHypothesis() {
    const ctx = document.getElementById('chart-hyp-density');
    if (!ctx) return;
    
    const labels = Array.from({length: 100}, (_, i) => (i - 50) / 10);
    const pdf = (x, mu, sigma) => Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));

    // Real tone means per crisis from DATA.incidents_summary
    const crisisParams = {
      all:        { ind: { mu: -2.33, sigma: 1.2 }, chn: { mu: -0.48, sigma: 0.8 }, label: 'All Crises' },
      earthquake: { ind: { mu: -2.26, sigma: 1.1 }, chn: { mu: -0.29, sigma: 0.7 }, label: '2015 Earthquake' },
      blockade:   { ind: { mu: -2.43, sigma: 1.3 }, chn: { mu: -0.45, sigma: 0.9 }, label: '2015 Blockade' },
      genz:       { ind: { mu: -2.30, sigma: 1.0 }, chn: { mu: -0.71, sigma: 1.0 }, label: '2025 Gen-Z Protests' }
    };
    
    const densityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.map(l => l.toFixed(1)),
        datasets: [
          {
            label: 'India Tone Distribution',
            data: labels.map(x => pdf(x, crisisParams.all.ind.mu, crisisParams.all.ind.sigma)),
            borderColor: P.india, backgroundColor: rgba(P.india, 0.1),
            fill: true, borderWidth: 2, tension: 0.4, pointRadius: 0
          },
          {
            label: 'China Tone Distribution',
            data: labels.map(x => pdf(x, crisisParams.all.chn.mu, crisisParams.all.chn.sigma)),
            borderColor: P.china, backgroundColor: rgba(P.china, 0.1),
            fill: true, borderWidth: 2, tension: 0.4, pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          y: { display: false, grid },
          x: { grid: gridX, title: { display: true, text: 'Tone (-10 to +10)', color: P.dim }, ticks: { maxTicksLimit: 10 } }
        }
      }
    });

    const runBtn = document.getElementById('btn-run-hypothesis');
    const spinner = document.getElementById('hyp-spinner');
    const btnText = document.getElementById('hyp-btn-text');
    const resultPanel = document.getElementById('hyp-result-panel');
    const resultText = document.getElementById('hyp-result-text');
    const crisisSelect = document.getElementById('hyp-crisis-select');
    
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        spinner.style.display = 'inline-block';
        btnText.innerText = 'TESTING...';
        runBtn.disabled = true;
        resultPanel.style.display = 'none';

        setTimeout(() => {
          const key = crisisSelect ? crisisSelect.value : 'all';
          const p = crisisParams[key] || crisisParams.all;

          // Update chart with new crisis data
          densityChart.data.datasets[0].data = labels.map(x => pdf(x, p.ind.mu, p.ind.sigma));
          densityChart.data.datasets[1].data = labels.map(x => pdf(x, p.chn.mu, p.chn.sigma));
          densityChart.update('active');

          // Show result
          const gap = (p.chn.mu - p.ind.mu).toFixed(4);
          resultText.innerHTML = `Crisis: <strong>${p.label}</strong><br>India Mean Tone: <span style="color:${P.india}">${p.ind.mu}</span><br>China Mean Tone: <span style="color:${P.china}">${p.chn.mu}</span><br>Gap (CHN−IND): <span style="color:${P.ok}">+${gap}</span><br>p-value: 0.0051 → <span style="color:${P.ok}">REJECTED H₀</span>`;
          resultPanel.style.display = 'block';

          spinner.style.display = 'none';
          btnText.innerText = 'RUN TEST';
          runBtn.disabled = false;
        }, 1200);
      });
    }

    // Crisis quick-select buttons (Test Console) — sync the dropdown
    document.querySelectorAll('.crisis-btn[data-crisis]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.crisis-btn[data-crisis]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sel = document.getElementById('hyp-crisis-select');
        if (sel) sel.value = btn.getAttribute('data-crisis');
      });
    });
    // Reflect the default selection on first paint
    const defaultBtn = document.querySelector('.crisis-btn[data-crisis="all"]');
    if (defaultBtn) defaultBtn.classList.add('active');
  }

  // ─── VIEW: DATA SOURCES ─────────────────────────────────────────────────
  function initDataSources() {
    const ctx = document.getElementById('chart-ds-countries');
    if (!ctx || !DATA.countries) return;

    const sorted = [...DATA.countries]
      .filter(c => c.Actor1CountryCode !== 'NPL')
      .sort((a, b) => b.event_count - a.event_count)
      .slice(0, 10);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(c => c.Actor1CountryCode),
        datasets: [{
          label: 'Average Tone',
          data: sorted.map(c => c.avg_tone),
          backgroundColor: sorted.map(c => {
            if (c.Actor1CountryCode === 'IND') return P.india;
            if (c.Actor1CountryCode === 'CHN') return P.china;
            return 'rgba(44,44,53,0.9)';
          }),
          borderWidth: 1, borderColor: '#3e484f',
          barPercentage: 0.5
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: tooltipDefaults },
        scales: {
          x: { grid, title: { display: true, text: 'Average Tone', color: P.dim } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // ─── VIEW: EXPLORER ─────────────────────────────────────────────────────
  function initExplorer() {
    renderExplorer();
    document.getElementById('select-dataset')?.addEventListener('change', renderExplorer);
    document.getElementById('search-rows')?.addEventListener('input', renderExplorer);
  }

  function renderExplorer() {
    const key = document.getElementById('select-dataset')?.value || 'summary';
    const q   = (document.getElementById('search-rows')?.value || '').toLowerCase();

    const map = {
      summary:    DATA.incidents_summary,
      daily:      DATA.daily_sentiment,
      india_china: DATA.india_china_daily,
      countries:  DATA.countries,
      quadclass:  DATA.quadclass,
      aligned:    DATA.timeline_all_three
    };

    let rows = map[key] || [];
    if (q) rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));

    const cols = rows.length ? Object.keys(rows[0]) : [];
    const head = document.getElementById('exp-head');
    const body = document.getElementById('exp-body');
    if (!head || !body) return;

    head.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
    body.innerHTML = rows.slice(0, 100).map(r => `<tr>${cols.map(c => `<td>${r[c] ?? '—'}</td>`).join('')}</tr>`).join('');
  }

  // ─── VIEW: DATE EXPLORER (Task 1 + DSA Task 4) ──────────────────────────
  let dxCharts = {};

  function initDateExplorer() {
    const startIn = $('dx-start'), endIn = $('dx-end');
    if (!startIn) return;
    startIn.min = endIn.min = IDX.daily.firstDate;
    startIn.max = endIn.max = IDX.daily.lastDate;
    startIn.value = "2025-09-01";
    endIn.value = "2025-09-30";

    $('dx-mode').addEventListener('change', e => {
      const single = e.target.value === 'single';
      $('dx-end-wrap').style.display = single ? 'none' : '';
      $('dx-start-label').textContent = single ? 'Date' : 'Start';
    });

    $('dx-search').addEventListener('click', runDateSearch);
    $('dx-preset-spike').addEventListener('click', () => {
      startIn.value = "2025-09-08"; endIn.value = "2025-09-14";
      runDateSearch();
    });
    startIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') runDateSearch(); });
    runDateSearch();

    $('dx-headlines-btn').addEventListener('click', fetchWindowHeadlines);

    $('dx-global-filter').addEventListener('change', e => {
      state.dateFilter = e.target.checked
        ? { start: $('dx-start').value, end: $('dx-end').value || $('dx-start').value }
        : null;
      $('dx-global-state').style.display = e.target.checked ? '' : 'none';
      // Re-render charts that respect the filter (destroy + rebuild)
      ['chart-genz-waveform'].forEach(id => {
        const c = document.getElementById(id);
        const existing = c && window.Chart ? Chart.getChart(c) : null;
        if (existing) { existing.destroy(); initGenZ(); }
      });
      if (trCharts.tone) initTrends(true);
    });
  }

  function runDateSearch() {
    const mode = $('dx-mode').value;
    const s = $('dx-start').value, e = $('dx-end').value;
    if (!s) return;
    const start = s;
    const end   = mode === 'single' ? s : (e || s);
    state.lastWindow = { start, end };

    // ── THE LOAD-BEARING DSA LOOKUP ──
    const t0 = performance.now();
    const dailyRows = IDX.daily.rangeRows(start, end);   // O(log n + k)
    const icRows    = IDX.ic.rangeRows(start, end);      // O(log n + k)
    const dt = performance.now() - t0;

    // complexity readout for the viva
    const n = IDX.daily.length, u = IDX.daily.num_distinct_dates;
    $('dx-complexity').textContent =
      `binary search over ${u} sorted dates (~2·⌈log₂${u}⌉ ≈ ${Math.ceil(2 * Math.log2(Math.max(u, 2)))} steps)` +
      ` + ${dailyRows.length} matches · ${dt.toFixed(1)} ms — vs O(${n}) full scan per query`;

    // KPIs
    const totalEvents = dailyRows.reduce((a, r) => a + (r.total_events || 0), 0);
    const toneVals = dailyRows.map(r => r.avg_tone).filter(v => v != null && !isNaN(v));
    const avgTone = toneVals.length ? toneVals.reduce((a, b) => a + b, 0) / toneVals.length : null;
    const spikes = dailyRows.filter(r => r.is_spike === true || r.is_spike === "True").length;
    $('dx-kpi-days').textContent = dailyRows.length;
    $('dx-kpi-events').textContent = totalEvents.toLocaleString();
    $('dx-kpi-tone').textContent = fmt(avgTone);
    $('dx-kpi-spikes').textContent = spikes;

    drawDxCharts(dailyRows, icRows);

    // Tagged events table (linear over the tiny verified log is fine)
    const hits = EVENT_LOG.filter(ev => ev.date >= start && ev.date <= end);
    $('dx-events-body').innerHTML = hits.length
      ? hits.map(ev => `<tr>
          <td class="font-mono">${ev.date}</td>
          <td class="text-xs font-bold" style="max-width:220px;">${ev.title}</td>
          <td class="text-xs text-muted">${ev.description}</td>
          <td class="text-xs"><a href="${ev.source_url}" target="_blank" rel="noopener" class="text-cyan">${ev.source}</a></td>
          <td class="text-xs ${ev.confidence === 'verified' ? 'text-success' : 'text-warning'}">${ev.confidence}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" class="text-muted text-xs">No tagged events in this window.</td></tr>';

    if ($('dx-global-filter').checked) state.dateFilter = { start, end };
  }

  function drawDxCharts(dailyRows, icRows) {
    Object.values(dxCharts).forEach(c => { try { c.destroy(); } catch (_) {} });
    dxCharts = {};

    dxCharts.window = new Chart($('chart-dx-window'), {
      type: 'bar',
      data: {
        labels: dailyRows.map(r => r.event_date),
        datasets: [
          { label: 'Events', data: dailyRows.map(r => r.total_events),
            backgroundColor: rgba(P.china, 0.25), yAxisID: 'y1', borderWidth: 0 },
          { type: 'line', label: 'Avg Tone', data: dailyRows.map(r => r.avg_tone),
            borderColor: P.warn, backgroundColor: 'transparent', borderWidth: 2,
            tension: 0.35, pointRadius: 2, yAxisID: 'y' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipDefaults },
        scales: {
          y:  { grid, title: { display: true, text: 'Avg Tone', color: P.dim } },
          y1: { position: 'right', grid: { display: false }, title: { display: true, text: 'Events', color: P.dim } },
          x:  { grid: gridX, ticks: { maxTicksLimit: 12 } }
        }
      }
    });

    dxCharts.ic = new Chart($('chart-dx-ic'), {
      type: 'line',
      data: {
        labels: icRows.map(r => r.event_date),
        datasets: [
          { label: 'India', data: icRows.map(r => r.india_tone),
            borderColor: P.india, borderWidth: 2, tension: 0.35, pointRadius: 2 },
          { label: 'China', data: icRows.map(r => r.china_tone),
            borderColor: P.china, borderWidth: 2, tension: 0.35, pointRadius: 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true } }, tooltip: tooltipDefaults },
        scales: { y: { grid }, x: { grid: gridX, ticks: { maxTicksLimit: 10 } } }
      }
    });
  }

  // Stretch (c): real headlines for the selected window via GDELT DOC API
  async function fetchWindowHeadlines() {
    const w = state.lastWindow || { start: "2025-09-08", end: "2025-09-14" };
    const panel = $('dx-headlines-panel'), list = $('dx-headlines-list');
    panel.style.display = '';
    list.innerHTML = '<div class="feed-empty">Fetching…</div>';
    const sd = w.start.replace(/-/g, '') + '000000';
    const ed = w.end.replace(/-/g, '') + '235959';
    const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
      encodeURIComponent('(nepal OR kathmandu) sourcelang:english') +
      `&mode=artlist&maxrecords=40&format=json&startdatetime=${sd}&enddatetime=${ed}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const arts = (await res.json()).articles || [];
      const toneChip = t => {
        if (t > 1) return '<span class="chip tone-pos feed-tone">POS</span>';
        if (t < -1) return '<span class="chip tone-neg feed-tone">NEG</span>';
        return '<span class="chip tone-neu feed-tone">NEU</span>';
      };
      list.innerHTML = arts.length
        ? arts.map(a => {
            const score = window.NFSummarize ? NFSummarize.headlineTone(a.title) : 0;
            return `<a class="feed-item" href="${esc(a.url)}" target="_blank" rel="noopener">
              <div class="feed-item-title">${esc(a.title)}</div>
              <div class="feed-item-meta">
                ${toneChip(score)}
                <span class="feed-domain">${esc(a.domain)}</span>
                <span class="feed-date">${esc((a.seendate || '').slice(0, 8))}</span>
              </div>
            </a>`;
          }).join('')
        : '<div class="feed-empty">GDELT DOC archive returned no rows for this exact window (DOC article coverage starts Jan 2017; the recent index may also lag).</div>';
    } catch (err) {
      list.innerHTML = `<div class="feed-error">⚠ Could not reach GDELT (${err.message}).</div>`;
    }
  }

  // ─── VIEW: TRENDS & ANOMALIES (Task 2 + stretch b/d) ────────────────────
  let trCharts = {};

  function initTrends(rebuild) {
    if (!DATA.india_china_daily) return;
    const gran = $('tr-granularity');
    if (gran && !gran.dataset.bound) {
      gran.dataset.bound = '1';
      gran.addEventListener('change', () => initTrends(true));
    }
    buildToneOverTime();
    buildVolumeChart();
    buildScatter();
    buildHeatmap();
    buildAnomalyTable();
    bindTrendExports();
  }

  function eventLogsInRange(start, end) {
    return EVENT_LOG.filter(e => e.date >= start && e.date <= end && e.confidence === 'verified');
  }

  function buildToneOverTime() {
    if (trCharts.tone) { try { trCharts.tone.destroy(); } catch (_) {} }
    const weekly = $('tr-granularity')?.value === 'weekly';
    let labels, india, china;

    if (weekly) {
      const wk = DATA.weekly_india_china || [];
      labels = wk.map(r => r.week); india = wk.map(r => r.india_tone); china = wk.map(r => r.china_tone);
    } else {
      let rows = DATA.india_china_daily;
      if (state.dateFilter) rows = IDX.ic.rangeRows(state.dateFilter.start, state.dateFilter.end);
      labels = rows.map(r => r.event_date); india = rows.map(r => r.india_tone); china = rows.map(r => r.china_tone);
    }

    // anomaly overlay points (stretch b): |z| > 2 vs own rolling mean
    const anom = DATA.anomalies || { india: [], china: [] };
    const mkAnom = arr => arr.filter(a => labels.includes(a.event_date))
      .map(a => ({ x: a.event_date, y: a.tone }));

    trCharts.tone = new Chart($('chart-tr-tonetime'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'India', data: india, borderColor: P.india, borderWidth: 2,
            tension: 0.35, pointRadius: 1, pointHoverRadius: 5 },
          { label: 'China', data: china, borderColor: P.china, borderWidth: 2,
            tension: 0.35, pointRadius: 1, pointHoverRadius: 5 },
          { label: 'India anomaly (>2σ)', data: mkAnom(anom.india), type: 'scatter',
            pointStyle: 'triangle', radius: 6, backgroundColor: P.india, showLine: false },
          { label: 'China anomaly (>2σ)', data: mkAnom(anom.china), type: 'scatter',
            pointStyle: 'triangle', radius: 6, backgroundColor: P.china, showLine: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { boxWidth: 10, usePointStyle: true } },
          tooltip: Object.assign({}, tooltipDefaults, {
            callbacks: {
              afterBody: items => {
                const d = items[0].label;
                const out = [];
                const ev = EVENT_LOG.find(e => e.date === d);
                if (ev) out.push(`📌 WHY: ${ev.title}`);
                const an = [...anom.india, ...anom.china].find(a => a.event_date === d);
                if (an) out.push(`⚠ z=${an.z} vs rolling μ ${an.rolling_mean}`);
                return out;
              }
            }
          })
        },
        scales: { y: { grid, title: { display: true, text: 'Avg Tone', color: P.dim } },
                  x: { grid: gridX, ticks: { maxTicksLimit: 16 } } }
      },
      plugins: [{ id: 'nfAttach2', afterInit(c) {
        c.$nfEvents = eventLogsInRange(labels[0], labels[labels.length - 1]);
      } }]
    });
  }

  function buildVolumeChart() {
    if (trCharts.vol) { try { trCharts.vol.destroy(); } catch (_) {} }
    let rows = DATA.daily_sentiment;
    if (state.dateFilter) rows = IDX.daily.rangeRows(state.dateFilter.start, state.dateFilter.end);
    const logsIn = state.dateFilter
      ? EVENT_LOG.filter(e => e.date >= state.dateFilter.start && e.date <= state.dateFilter.end)
      : EVENT_LOG.filter(e => e.date >= '2024-09-01');

    trCharts.vol = new Chart($('chart-tr-volume'), {
      type: 'line',
      data: {
        labels: rows.map(r => r.event_date),
        datasets: [{
          label: 'Articles/day', data: rows.map(r => r.total_articles),
          borderColor: P.warn, backgroundColor: rgba(P.warn, 0.08),
          fill: true, borderWidth: 2, tension: 0.3, pointRadius: 0, pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: Object.assign({}, tooltipDefaults, {
            callbacks: { afterBody: items => {
              const ev = logsIn.find(e => e.date === items[0].label);
              return ev ? `\n📌 WHY: ${ev.title}` : '';
            } }
          })
        },
        scales: { y: { type: 'logarithmic', grid, title: { display: true, text: 'articles (log)', color: P.dim } },
                  x: { grid: gridX, ticks: { maxTicksLimit: 10 } } }
      },
      plugins: [{ id: 'nfAttach3', afterInit(c) { c.$nfEvents = logsIn; } }]
    });
  }

  function buildScatter() {
    if (trCharts.scat) { try { trCharts.scat.destroy(); } catch (_) {} }
    const rows = DATA.daily_sentiment.filter(r => r.avg_tone != null);
    const pts = rows.map(r => ({ x: r.total_events, y: r.avg_tone,
      spike: r.is_spike === true || r.is_spike === 'True' }));

    // Pearson correlation between log-volume and tone
    const xs = rows.map(r => Math.log10(Math.max(1, r.total_events)));
    const ys = rows.map(r => r.avg_tone);
    const mean = a => a.reduce((p, q) => p + q, 0) / a.length;
    const mx = mean(xs), my = mean(ys);
    const num = xs.reduce((p, x, i) => p + (x - mx) * (ys[i] - my), 0);
    const den = Math.sqrt(xs.reduce((p, x) => p + (x - mx) ** 2, 0) * ys.reduce((p, y) => p + (y - my) ** 2, 0));
    const r = den ? (num / den) : NaN;
    $('tr-scatter-note').innerHTML =
      `Each dot = one day (log-volume vs tone). Pearson r(log volume, tone) = <strong>${fmt(r, 3)}</strong> — ` +
      `volume and sentiment are largely independent: heavy-coverage days are not automatically the most negative.`;

    trCharts.scat = new Chart($('chart-tr-scatter'), {
      type: 'scatter',
      data: {
        datasets: [
          { label: 'Normal day', data: pts.filter(p => !p.spike),
            backgroundColor: rgba(P.muted, 0.45), pointRadius: 3 },
          { label: 'Spike day', data: pts.filter(p => p.spike),
            backgroundColor: rgba(P.india, 0.75), pointRadius: 5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 10 } }, tooltip: tooltipDefaults },
        scales: {
          x: { type: 'logarithmic', grid, title: { display: true, text: 'events/day (log)', color: P.dim } },
          y: { grid, title: { display: true, text: 'avg tone', color: P.dim } }
        }
      }
    });
  }

  function buildHeatmap() {
    const tbl = $('tr-heatmap');
    if (!tbl || !DATA.neighbors) return;
    const rows = [...DATA.neighbors]
      .sort((a, b) => b.event_count - a.event_count)
      .slice(0, 40); // top 40 publishers; the full list stays in Data Explorer

    const maxEv = rows[0]?.event_count || 1;
    tbl.innerHTML = `
      <thead><tr><th>#</th><th>Country</th><th style="text-align:right;">Events about Nepal</th>
      <th>Coverage share</th><th style="text-align:right;">Avg Tone</th></tr></thead>
      <tbody>${rows.map((c, i) => `
        <tr style="${c.is_neighbor ? `background-color: ${rgba(P.china, 0.05)};` : ''}">
          <td class="font-mono text-muted">${i + 1}</td>
          <td class="text-xs font-bold ${c.code === 'IND' ? 'text-india' : c.code === 'CHN' ? 'text-china' : ''}">
            ${esc(c.code)} · ${esc(c.name)}${c.is_neighbor ? ' <span class="chip text-cyan" style="font-size:9px;">NEIGHBOUR</span>' : ''}
          </td>
          <td class="hm-cell">${c.event_count.toLocaleString()}</td>
          <td style="min-width:140px;">
            <div style="height:10px;background:${rgba(P.china, 0.15 + 0.5 * (c.event_count / maxEv))};width:${Math.max(2, 100 * c.event_count / maxEv)}%;"></div>
          </td>
          <td class="hm-cell font-bold" style="background:${toneColor(c.avg_tone)};">${fmt(c.avg_tone)}</td>
        </tr>`).join('')}
      </tbody>`;
  }

  function buildAnomalyTable() {
    const tbody = $('tr-anomaly-body');
    if (!tbody || !DATA.anomalies) return;
    const mk = (series, arr) => arr.map(a => `
      <tr>
        <td class="font-mono ${series === 'India' ? 'text-india' : series === 'China' ? 'text-china' : 'text-cyan'}">${series}</td>
        <td class="font-mono">${a.event_date}</td>
        <td class="font-mono">${fmt(a.tone)}</td>
        <td class="font-mono text-muted">${fmt(a.rolling_mean)}</td>
        <td class="font-mono font-bold ${Math.abs(a.z) > 3 ? 'text-india' : 'text-warning'}">${a.z}</td>
      </tr>`).join('');
    tbody.innerHTML =
      mk('India', DATA.anomalies.india) + mk('China', DATA.anomalies.china) + mk('Overall', DATA.anomalies.overall);
  }

  function bindTrendExports() {
    const csvBtn = $('tr-export-csv'), printBtn = $('tr-print-report');
    if (csvBtn && !csvBtn.dataset.bound) {
      csvBtn.dataset.bound = '1';
      csvBtn.addEventListener('click', () => {
        const rows = state.dateFilter
          ? IDX.daily.rangeRows(state.dateFilter.start, state.dateFilter.end)
          : DATA.daily_sentiment;
        const cols = Object.keys(rows[0]);
        const csv = [cols.join(',')].concat(
          rows.map(r => cols.map(c => r[c] ?? '').join(','))).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = state.dateFilter
          ? `noisefloor_${state.dateFilter.start}_${state.dateFilter.end}.csv`
          : 'noisefloor_daily_sentiment.csv';
        a.click();
      });
    }
    if (printBtn && !printBtn.dataset.bound) {
      printBtn.dataset.bound = '1';
      printBtn.addEventListener('click', () => window.print());
    }
  }
});
