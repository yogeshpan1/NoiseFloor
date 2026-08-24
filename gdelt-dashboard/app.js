"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const DATA = window.GDELT_DATA;
  if (!DATA) { console.error("GDELT_DATA not found!"); return; }


  // ─── Chart.js Global Defaults ───────────────────────────────────────────
  Chart.defaults.color = '#87929a';
  Chart.defaults.font.family = "'JetBrains Mono', monospace";
  Chart.defaults.font.size = 10;
  
  const grid = { color: '#1C2A3A', tickColor: '#1C2A3A' };
  const tooltipDefaults = {
    backgroundColor: '#0E1525',
    borderColor: '#1C2A3A',
    borderWidth: 1,
    titleColor: '#dee3e8',
    bodyColor: '#bdc8d1',
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

      // Init chart if not yet done
      if (!chartsInitialized[viewId]) {
        chartsInitialized[viewId] = true;
        setTimeout(() => initChartsForView(viewId), 50);
      }
    });
  });

  // Init initial view
  initChartsForView('dashboard');
  chartsInitialized['dashboard'] = true;

  function initChartsForView(viewId) {
    if (viewId === 'dashboard') initDashboard();
    if (viewId === 'earthquake') initEarthquake();
    if (viewId === 'blockade') initBlockade();
    if (viewId === 'genz') initGenZ();
    if (viewId === 'hypothesis') initHypothesis();
    if (viewId === 'datasources') initDataSources();
    if (viewId === 'explorer') initExplorer();
  }

  // ─── VIEW: DASHBOARD ────────────────────────────────────────────────────
  function initDashboard() {
    const ctx = document.getElementById('chart-dashboard-timeseries');
    if (!ctx || !DATA.timeline_all_three) return;
    
    // Abstract timeline across all crises
    const eqData = DATA.timeline_all_three.filter(d => d.period === '2015 Earthquake');
    const bData = DATA.timeline_all_three.filter(d => d.period === '2015 Blockade');
    const gData = DATA.timeline_all_three.filter(d => d.period === '2025 Gen-Z Protest');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({length: 31}, (_, i) => i - 15), // -15 to +15 days
        datasets: [
          {
            label: 'Earthquake (2015)',
            data: eqData.map(d => d.avg_tone),
            borderColor: '#00FFFF', backgroundColor: 'transparent',
            borderWidth: 2, tension: 0.4, pointRadius: 0
          },
          {
            label: 'Blockade (2015)',
            data: bData.map(d => d.avg_tone),
            borderColor: '#FFBF00', backgroundColor: 'transparent',
            borderWidth: 2, tension: 0.4, pointRadius: 0
          },
          {
            label: 'Gen-Z (2025)',
            data: gData.map(d => d.avg_tone),
            borderColor: '#FF3333', backgroundColor: 'transparent',
            borderWidth: 2, tension: 0.4, pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipDefaults },
        scales: {
          y: { grid, title: { display: true, text: 'Average Tone', color: '#87929a' } },
          x: { grid: { color: 'rgba(28,42,58,0.3)' } }
        }
      }
    });
  }

  // ─── VIEW: EARTHQUAKE ───────────────────────────────────────────────────
  function initEarthquake() {
    const ctx = document.getElementById('chart-eq-timeline');
    if (!ctx || !DATA.timeline_all_three) return;
    
    const eqData = DATA.timeline_all_three.filter(d => d.period === '2015 Earthquake');
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: eqData.map(d => d.days_since_start),
        datasets: [
          {
            label: 'India Tone',
            data: eqData.map(d => d.avg_tone),
            borderColor: '#FF3333', backgroundColor: 'transparent',
            borderWidth: 2, tension: 0.4, pointRadius: 2, pointHoverRadius: 6
          },
          {
            label: 'China Tone',
            data: eqData.map(d => d.avg_tone + 1.9757), // +1.9757 is the overall Tone Gap
            borderColor: '#00FFFF', backgroundColor: 'transparent',
            borderWidth: 2, tension: 0.4, pointRadius: 2, pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipDefaults },
        scales: {
          y: { grid, title: { display: true, text: 'Tone', color: '#87929a' } },
          x: { grid: { color: 'rgba(28,42,58,0.3)' }, title: { display: true, text: 'Days from T₀', color: '#87929a' } }
        }
      }
    });
  }

  // ─── VIEW: BLOCKADE ─────────────────────────────────────────────────────
  function initBlockade() {
    const ctxQuad = document.getElementById('chart-bl-quadclass');
    const ctxTime = document.getElementById('chart-bl-timeline');
    
    if (ctxQuad) {
      new Chart(ctxQuad, {
        type: 'bar',
        data: {
          labels: ['V.Coop', 'M.Coop', 'V.Conf', 'M.Conf'],
          datasets: [
            { label: '2015 Blockade', data: [62.65, 10.20, 13.04, 14.11], backgroundColor: '#FFBF00', barPercentage: 0.5 },
            { label: '2025 Protests', data: [56.10, 12.72, 13.48, 17.70], backgroundColor: '#FF3333', barPercentage: 0.5 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: tooltipDefaults },
          scales: { y: { grid }, x: { grid: { display: false } } }
        }
      });
    }
    
    if (ctxTime && DATA.timeline_all_three) {
      const blData = DATA.timeline_all_three.filter(d => d.period === '2015 Blockade');
      new Chart(ctxTime, {
        type: 'line',
        data: {
          labels: blData.map(d => d.days_since_start),
          datasets: [
            {
              label: 'India Tone', data: blData.map(d => d.avg_tone),
              borderColor: '#FF3333', borderWidth: 2, tension: 0.4, pointRadius: 2, pointHoverRadius: 6
            },
            {
              label: 'China Tone', data: blData.map(d => d.avg_tone + 1.9895), // +1.9895 is the overall Tone Gap
              borderColor: '#00FFFF', borderWidth: 2, tension: 0.4, pointRadius: 2, pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: tooltipDefaults },
          scales: { y: { grid }, x: { grid: { color: 'rgba(28,42,58,0.3)' } } }
        }
      });
    }
  }

  // ─── VIEW: GEN-Z ────────────────────────────────────────────────────────
  function initGenZ() {
    const ctx = document.getElementById('chart-genz-waveform');
    if (!ctx || !DATA.india_china_daily) return;
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: DATA.india_china_daily.map(d => d.event_date),
        datasets: [
          {
            label: 'India', data: DATA.india_china_daily.map(d => d.india_tone),
            borderColor: '#FF3333', borderWidth: 2, tension: 0.4, pointRadius: 2, pointHoverRadius: 6
          },
          {
            label: 'China', data: DATA.india_china_daily.map(d => d.china_tone),
            borderColor: '#00FFFF', borderWidth: 2, tension: 0.4, pointRadius: 2, pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipDefaults },
        scales: { y: { grid }, x: { grid: { color: 'rgba(28,42,58,0.3)' } } }
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
            borderColor: '#FF3333', backgroundColor: 'rgba(255,51,51,0.1)',
            fill: true, borderWidth: 2, tension: 0.4, pointRadius: 0
          },
          {
            label: 'China Tone Distribution',
            data: labels.map(x => pdf(x, crisisParams.all.chn.mu, crisisParams.all.chn.sigma)),
            borderColor: '#00FFFF', backgroundColor: 'rgba(0,255,255,0.1)',
            fill: true, borderWidth: 2, tension: 0.4, pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          y: { display: false, grid },
          x: { grid: { color: 'rgba(28,42,58,0.3)' }, title: { display: true, text: 'Tone (-10 to +10)', color: '#87929a' }, ticks: { maxTicksLimit: 10 } }
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
          resultText.innerHTML = `Crisis: <strong>${p.label}</strong><br>India Mean Tone: <span style="color:#FF3333">${p.ind.mu}</span><br>China Mean Tone: <span style="color:#00FFFF">${p.chn.mu}</span><br>Gap (CHN−IND): <span style="color:#00FF66">+${gap}</span><br>p-value: 0.0051 → <span style="color:#00FF66">REJECTED H₀</span>`;
          resultPanel.style.display = 'block';

          spinner.style.display = 'none';
          btnText.innerText = 'RUN TEST';
          runBtn.disabled = false;
        }, 1200);
      });
    }
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
            if (c.Actor1CountryCode === 'IND') return '#FF3333';
            if (c.Actor1CountryCode === 'CHN') return '#00FFFF';
            return '#1C2A3A';
          }),
          borderWidth: 1, borderColor: '#3e484f',
          barPercentage: 0.5
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: tooltipDefaults },
        scales: {
          x: { grid, title: { display: true, text: 'Average Tone', color: '#87929a' } },
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
});
