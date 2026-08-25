"use strict";
/* ============================================================================
   NoiseFloor · NFGeoViews — renders the three Regional Lens views
     • Neighbour Watch  (DATA.neighbour_matrix)
     • Cross-Reactions  (DATA.cross_reaction)
     • Nepal Dividend   (DATA.dividend)
   Data comes from backend/build_extended.py via data_bundle.js.
   Views degrade gracefully ("data pending") when the cache is absent.
   ========================================================================== */
(function () {

  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const P = {
    india: cssVar('--accent-india'),
    china: cssVar('--accent-china'),
    ok: cssVar('--accent-success'),
    warn: cssVar('--accent-warning'),
    dim: cssVar('--text-dim')
  };
  const rgba = (hex, a) => {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return isNaN(n) ? `rgba(136,136,136,${a})` : `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const esc = window.NFEsc || (s => String(s ?? ''));

  const grid = { color: 'rgba(44,44,53,0.55)', tickColor: 'rgba(44,44,53,0.55)' };
  const tooltipDefaults = {
    backgroundColor: '#121217', borderColor: '#2C2C35', borderWidth: 1,
    titleColor: '#F4F4F5', bodyColor: '#A1A1AA',
    titleFont: { family: "'JetBrains Mono', monospace", size: 10, weight: 'bold' },
    bodyFont: { family: "'JetBrains Mono', monospace", size: 10 },
    padding: 10, displayColors: true, intersect: false, mode: 'index'
  };

  function toneBg(t) {
    const clamped = Math.max(-10, Math.min(10, t || 0));
    const alpha = Math.min(0.85, Math.abs(clamped) / 8 + 0.06);
    return clamped < 0 ? rgba(P.india, alpha) : rgba(P.ok, alpha);
  }

  function pending(ids, msg) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const box = el.closest('.chart-container') || el;
      box.innerHTML = `<div class="feed-empty" style="display:flex;align-items:center;justify-content:center;height:100%;text-align:center;">${esc(msg)}</div>`;
    });
  }

  const PENDING_MSG = 'Regional-lens dataset not built yet. Run backend/build_extended.py --refresh once, then rebuild data_bundle.js - this view fills in automatically.';


  // ─── NEIGHBOUR WATCH ─────────────────────────────────────────────────────
  function neighbours() {
    if (neighbours._done) return;
    const rows = window.GDELT_DATA && GDELT_DATA.neighbour_matrix;
    if (!rows || !rows.length) {
      pending(['chart-nb-bars', 'chart-nb-radar'], PENDING_MSG);
      const tbl = document.getElementById('nb-matrix');
      if (tbl) tbl.innerHTML = `<tbody><tr><td class="text-muted text-xs">${esc(PENDING_MSG)}</td></tr></tbody>`;
      return;
    }
    neighbours._done = true;

    const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const indTones = rows.map(r => r.india_tone).filter(v => v != null);
    const chnTones = rows.map(r => r.china_tone).filter(v => v != null);
    const setTxt = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setTxt('nb-kpi-india', mean(indTones).toFixed(2));
    setTxt('nb-kpi-china', mean(chnTones).toFixed(2));

    let best = null;
    for (const r of rows) {
      for (const k of ['india_tone', 'china_tone']) {
        if (r[k] != null && (!best || r[k] > best.v)) best = { v: r[k], who: r.subject };
      }
    }
    setTxt('nb-kpi-best', best ? best.who : '—');

    new Chart(document.getElementById('chart-nb-bars'), {
      type: 'bar',
      data: {
        labels: rows.map(r => r.subject.toUpperCase()),
        datasets: [
          { label: 'India', data: rows.map(r => r.india_tone), backgroundColor: rgba(P.india, 0.75), borderRadius: 4 },
          { label: 'China', data: rows.map(r => r.china_tone), backgroundColor: rgba(P.china, 0.75), borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true } }, tooltip: tooltipDefaults },
        scales: { y: { grid, title: { display: true, text: 'Avg tone (12 mo)', color: P.dim } }, x: { grid: { display: false } } }
      }
    });

    const indTotal = rows.reduce((a, r) => a + (r.india_vol || 0), 0) || 1;
    const chnTotal = rows.reduce((a, r) => a + (r.china_vol || 0), 0) || 1;
    new Chart(document.getElementById('chart-nb-radar'), {
      type: 'radar',
      data: {
        labels: rows.map(r => r.subject.toUpperCase()),
        datasets: [
          { label: 'India', data: rows.map(r => 100 * (r.india_vol || 0) / indTotal),
            borderColor: P.india, backgroundColor: rgba(P.india, 0.15), borderWidth: 2, pointRadius: 3 },
          { label: 'China', data: rows.map(r => 100 * (r.china_vol || 0) / chnTotal),
            borderColor: P.china, backgroundColor: rgba(P.china, 0.15), borderWidth: 2, pointRadius: 3 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true } }, tooltip: tooltipDefaults },
        scales: { r: { grid, angleLines: grid, ticks: { backdropColor: 'transparent', color: P.dim } } }
      }
    });

    const tbl = document.getElementById('nb-matrix');
    tbl.innerHTML = `
      <thead><tr><th>Subject</th>
        <th style="text-align:right;">India Tone</th><th style="text-align:right;">China Tone</th>
        <th style="text-align:right;">Gap (CHN-IND)</th>
        <th style="text-align:right;">India Attn.</th><th style="text-align:right;">China Attn.</th></tr></thead>
      <tbody>${rows.map(r => `
        <tr style="${r.subject === 'nepal' ? `background:${rgba(P.china, 0.05)};` : ''}">
          <td class="font-bold">${esc(r.subject)}</td>
          <td class="heat-cell font-bold" style="background:${toneBg(r.india_tone)};color:#F4F4F5;">${r.india_tone == null ? '-' : r.india_tone.toFixed(2)}</td>
          <td class="heat-cell font-bold" style="background:${toneBg(r.china_tone)};color:#F4F4F5;">${r.china_tone == null ? '-' : r.china_tone.toFixed(2)}</td>
          <td class="heat-cell font-bold" style="color:${(r.china_tone - r.india_tone) >= 0 ? P.ok : P.india};">${(r.india_tone == null || r.china_tone == null) ? '-' : (r.china_tone - r.india_tone).toFixed(2)}</td>
          <td class="hm-cell text-muted">${r.india_vol == null ? '-' : r.india_vol.toFixed(2)}</td>
          <td class="hm-cell text-muted">${r.china_vol == null ? '-' : r.china_vol.toFixed(2)}</td>
        </tr>`).join('')}</tbody>`;
  }


  // ─── CROSS-REACTIONS ─────────────────────────────────────────────────────
  function crossreact() {
    if (crossreact._done) return;
    const cr = window.GDELT_DATA && GDELT_DATA.cross_reaction;
    const need = ['in_china', 'in_base', 'cn_india', 'cn_base'];
    if (!cr || !need.every(k => cr[k] && cr[k].series && cr[k].series.length)) {
      pending(['chart-cr-lines'], PENDING_MSG);
      return;
    }
    crossreact._done = true;

    const setTxt = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setTxt('cr-kpi-in-china', cr.in_china.avg_tone == null ? '-' : cr.in_china.avg_tone.toFixed(2));
    setTxt('cr-kpi-in-base', cr.in_base.avg_tone == null ? '-' : cr.in_base.avg_tone.toFixed(2));
    setTxt('cr-kpi-cn-india', cr.cn_india.avg_tone == null ? '-' : cr.cn_india.avg_tone.toFixed(2));
    const delta = (cr.in_china.avg_tone != null && cr.in_base.avg_tone != null)
      ? (cr.in_china.avg_tone - cr.in_base.avg_tone) : null;
    setTxt('cr-kpi-delta', delta == null ? '-' : (delta > 0 ? '+' : '') + delta.toFixed(2));

    const line = (key, label, color, dashed) => ({
      label,
      data: cr[key].series.map(p => p.value),
      borderColor: color, backgroundColor: 'transparent',
      borderWidth: 2, tension: 0.3, pointRadius: 0,
      borderDash: dashed ? [5, 4] : undefined
    });

    new Chart(document.getElementById('chart-cr-lines'), {
      type: 'line',
      data: {
        labels: cr.in_base.series.map(p => p.date),
        datasets: [
          line('in_base', 'India · baseline Nepal', P.india, false),
          line('in_china', 'India · re: China in Nepal', P.india, true),
          line('cn_base', 'China · baseline Nepal', P.china, false),
          line('cn_india', 'China · re: India in Nepal', P.china, true)
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true } }, tooltip: tooltipDefaults },
        scales: { y: { grid, title: { display: true, text: 'Avg tone', color: P.dim } },
                  x: { grid: { color: 'rgba(44,44,53,0.35)' }, ticks: { maxTicksLimit: 12 } } }
      }
    });
  }

  // ─── NEPAL DIVIDEND ──────────────────────────────────────────────────────
  // Curated ledger of publicly documented engagement (indicative figures).
  const LEDGER = [
    { donor: 'India', item: 'Post-earthquake reconstruction pledge at the 2015 donor conference (~USD 1 bn: grant + Line of Credit)', src: 'MEA India / GoI press' },
    { donor: 'India', item: 'Motihari-Amlekhgunj cross-border petroleum pipeline (first in South Asia)', src: 'Public reporting' },
    { donor: 'India', item: 'Jaynagar-Bijalpura-Bardibas rail link & Terai (Postal) road package', src: 'Public reporting' },
    { donor: 'India', item: 'Exim Bank Lines of Credit for infrastructure (cumulative multi-billion USD)', src: 'Exim Bank India' },
    { donor: 'China', item: 'Belt & Road MOU signed (2017) - Trans-Himalayan Multi-Dimensional Connectivity', src: 'Public reporting' },
    { donor: 'China', item: 'Pokhara International Airport (EXIM Bank of China loan; CAMC build)', src: 'Public reporting' },
    { donor: 'China', item: 'Grants-in-aid programme & annual humanitarian assistance packages', src: 'Public reporting' },
    { donor: 'China', item: 'Cross-border railway feasibility study (Kerung-Kathmandu)', src: 'Joint statements' }
  ];

  function dividend() {
    if (dividend._done) return;
    const dv = window.GDELT_DATA && GDELT_DATA.dividend;
    const tbl = document.getElementById('dv-projects');
    if (!tbl) return;

    tbl.innerHTML = `
      <thead><tr><th>Donor</th><th>Documented engagement</th><th>Source</th></tr></thead>
      <tbody>${LEDGER.map(r => `
        <tr>
          <td class="font-bold ${r.donor === 'India' ? 'text-india' : 'text-china'}">${r.donor}</td>
          <td class="text-xs">${esc(r.item)}</td>
          <td class="text-xs text-dim font-mono">${esc(r.src)}</td>
        </tr>`).join('')}</tbody>`;

    if (!dv || !dv.india || !dv.china ||
        (dv.india.attention_avg == null && dv.china.attention_avg == null)) {
      pending(['chart-dv-volume', 'chart-dv-tone'], PENDING_MSG);
      return;
    }
    dividend._done = true;

    const setTxt = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setTxt('dv-kpi-ind-vol', dv.india.attention_avg == null ? '-' : dv.india.attention_avg.toFixed(2));
    setTxt('dv-kpi-chn-vol', dv.china.attention_avg == null ? '-' : dv.china.attention_avg.toFixed(2));
    setTxt('dv-kpi-ind-tone', dv.india.tone_avg == null ? '-' : dv.india.tone_avg.toFixed(2));
    setTxt('dv-kpi-chn-tone', dv.china.tone_avg == null ? '-' : dv.china.tone_avg.toFixed(2));

    new Chart(document.getElementById('chart-dv-volume'), {
      type: 'line',
      data: {
        labels: (dv.india.volume_series || []).map(p => p.date),
        datasets: [
          { label: 'India aid/investment attention', data: (dv.india.volume_series || []).map(p => p.value),
            borderColor: P.india, backgroundColor: rgba(P.india, 0.08), fill: true,
            borderWidth: 2, tension: 0.35, pointRadius: 0 },
          { label: 'China aid/investment attention', data: (dv.china.volume_series || []).map(p => p.value),
            borderColor: P.china, backgroundColor: rgba(P.china, 0.08), fill: true,
            borderWidth: 2, tension: 0.35, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 10, usePointStyle: true } }, tooltip: tooltipDefaults },
        scales: { y: { grid, title: { display: true, text: 'Coverage intensity', color: P.dim } },
                  x: { grid: { color: 'rgba(44,44,53,0.35)' }, ticks: { maxTicksLimit: 10 } } }
      }
    });

    new Chart(document.getElementById('chart-dv-tone'), {
      type: 'bar',
      data: {
        labels: ['India as giver', 'China as giver'],
        datasets: [{
          label: 'Avg tone of coverage',
          data: [dv.india.tone_avg, dv.china.tone_avg],
          backgroundColor: [rgba(P.india, 0.7), rgba(P.china, 0.7)],
          borderRadius: 6, barPercentage: 0.4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltipDefaults },
        scales: { y: { grid, title: { display: true, text: 'Avg tone (12 mo)', color: P.dim } },
                  x: { grid: { display: false } } }
      }
    });

    initDvSim(dv);
  }

  // ─── Nepal Dividend · scenario simulator ───────────────────────────────────
  // Proportional what-if: scale each donor's aid attention up/down and watch
  // the projected coverage share rebalance. Illustrative, clearly labelled.
  function initDvSim(dv) {
    const sInd = document.getElementById('dv-sim-ind');
    const sChn = document.getElementById('dv-sim-chn');
    if (!sInd || !sChn || sInd.dataset.bound) return;
    sInd.dataset.bound = '1';

    const baseInd = Math.max(0.1, (dv && dv.india && dv.india.attention_avg) || 1);
    const baseChn = Math.max(0.1, (dv && dv.china && dv.china.attention_avg) || 1);
    const baseShare = baseInd / (baseInd + baseChn);

    const update = () => {
      const pInd = +sInd.value, pChn = +sChn.value;
      const projInd = baseInd * (1 + pInd / 100);
      const projChn = baseChn * (1 + pChn / 100);
      const shareInd = projInd / (projInd + projChn);

      document.getElementById('dv-sim-ind-val').textContent = (pInd >= 0 ? '+' : '') + pInd + '%';
      document.getElementById('dv-sim-chn-val').textContent = (pChn >= 0 ? '+' : '') + pChn + '%';
      document.getElementById('dv-sim-share').textContent =
        `India ${(shareInd * 100).toFixed(0)}% · China ${((1 - shareInd) * 100).toFixed(0)}%`;
      document.getElementById('dv-sim-bar-ind').style.width = (shareInd * 100).toFixed(1) + '%';
      document.getElementById('dv-sim-bar-chn').style.width = ((1 - shareInd) * 100).toFixed(1) + '%';

      const shift = (shareInd - baseShare) * 100;
      let verdict;
      if (Math.abs(shift) < 2) {
        verdict = 'With these surges the coverage balance stays essentially where it is today — the narrative contest remains ' +
          (baseShare > 0.5 ? 'India-led' : 'China-led') + ' in volume terms.';
      } else if (shift > 0) {
        verdict = `A ${Math.abs(shift).toFixed(0)}-point swing toward Indian coverage. Watch the tone chart: volume leadership ` +
          `only helps the narrative if the framing stays warm — India's aid tone is ${dv && dv.india && dv.india.tone_avg != null ? dv.india.tone_avg.toFixed(2) : 'n/a'}.`;
      } else {
        verdict = `A ${Math.abs(shift).toFixed(0)}-point swing toward Chinese coverage. Volume leadership ` +
          `only helps the narrative if the framing stays warm — China's aid tone is ${dv && dv.china && dv.china.tone_avg != null ? dv.china.tone_avg.toFixed(2) : 'n/a'}.`;
      }
      document.getElementById('dv-sim-verdict').textContent = verdict;
    };

    sInd.addEventListener('input', update);
    sChn.addEventListener('input', update);
    update();
  }

  window.NFGeoViews = {
    initView(viewId) {
      if (viewId === 'neighbours') neighbours();
      else if (viewId === 'crossreact') crossreact();
      else if (viewId === 'dividend') dividend();
    }
  };
})();
