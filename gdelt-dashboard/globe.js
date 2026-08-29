"use strict";
/* ============================================================================
   NoiseFloor · NFGlobe — dependency-free 3D coverage globe
   Orthographic projection on a raw <canvas>. Every source country in the
   GDELT dataset is a dot sized by its Nepal-coverage volume; Nepal pulses at
   the centre of attention with arcs from India and China. Drag to rotate.
   ========================================================================== */
(function () {

  // Approximate centroids (lat, lon) per GDELT actor code
  const LATLON = {
    USA:[39,-98], GBR:[54,-2], FRA:[46,2], DEU:[51,10], IND:[21,78], CHN:[35,103],
    JPN:[36,138], AUS:[-25,134], CAN:[56,-106], BRA:[-14,-51], RUS:[61,90],
    KOR:[36,128], PRK:[40,127], PAK:[30,69], BGD:[24,90], LKA:[7,81], NPL:[28,84],
    BTN:[27,90], MMR:[21,96], THA:[15,100], VNM:[16,107], IDN:[-2,118], MYS:[4,102],
    PHL:[12,122], SGP:[1,103], SAU:[24,45], ARE:[24,54], QAT:[25,51], KWT:[29,47],
    OMN:[21,57], ISR:[31,35], TUR:[39,35], IRN:[32,53], IRQ:[33,44], EGY:[26,30],
    ZAF:[-29,24], NGA:[9,8], KEN:[-1,37], ETH:[9,39], TZA:[-6,35], UGA:[1,32],
    GHA:[7,-1], SEN:[14,-14], MAR:[32,-6], DZA:[28,3], TUN:[34,9], MEX:[23,-102],
    ARG:[-34,-64], CHL:[-33,-71], COL:[4,-73], PER:[-10,-76], VEN:[8,-66],
    ECU:[-1,-78], ITA:[42,12], ESP:[40,-4], PRT:[39,-8], NLD:[52,5], BEL:[50,4],
    CHE:[46,8], AUT:[47,14], SWE:[60,15], NOR:[61,9], DNK:[56,10], FIN:[64,26],
    POL:[52,19], UKR:[49,32], CZE:[50,15], ROU:[46,25], HUN:[47,19], GRC:[39,22],
    IRL:[53,-8], NZL:[-42,172], TWN:[24,121], HKG:[22,114], KAZ:[48,68],
    UZB:[41,64], AZE:[40,47], ARM:[40,45], GEO:[42,43], MNG:[46,105], KHM:[12,104],
    LAO:[18,103], MDV:[3,73], AFG:[34,66], BGR:[43,25], SVK:[49,20], HRV:[45,16],
    SRB:[44,21], LTU:[55,24], LVA:[57,25], EST:[59,25], BLR:[53,28], MDA:[47,29],
    SVN:[46,15], ISL:[65,-18], LUX:[50,6]
  };

  const D2R = Math.PI / 180;

  function mount(canvas, countries) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = Math.max(1, window.devicePixelRatio || 1);

    let rotLng = 80, rotLat = 18;
    let targetRotLng = rotLng, targetRotLat = rotLat;
    let dragging = false, lastX = 0, lastY = 0, lastInteract = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      W = Math.max(200, rect.width); H = Math.max(200, rect.height);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    canvas.addEventListener('mousedown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; lastInteract = Date.now(); });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      targetRotLng += (e.clientX - lastX) * 0.4;
      targetRotLat = Math.max(-70, Math.min(70, targetRotLat - (e.clientY - lastY) * 0.3));
      lastX = e.clientX; lastY = e.clientY; lastInteract = Date.now();
    });
    canvas.addEventListener('touchstart', e => {
      dragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; lastInteract = Date.now();
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      if (!dragging) return;
      targetRotLng += (e.touches[0].clientX - lastX) * 0.4;
      targetRotLat = Math.max(-70, Math.min(70, targetRotLat - (e.touches[0].clientY - lastY) * 0.3));
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; lastInteract = Date.now();
    }, { passive: true });
    canvas.addEventListener('touchend', () => { dragging = false; });

    let maxEv = 1;
    const dots = (countries || [])
      .filter(c => LATLON[c.Actor1CountryCode] && c.Actor1CountryCode !== 'NPL')
      .map(c => ({ code: c.Actor1CountryCode, ll: LATLON[c.Actor1CountryCode], n: c.event_count }));
    for (const d of dots) maxEv = Math.max(maxEv, d.n);

    const NEPAL = [28, 84];
    const ARC_SOURCES = [['IND', '#F0544C'], ['CHN', '#2CC8E8']];

    function project(lat, lon, rlDeg, roDeg, R, cx, cy) {
      const la = lat * D2R, lo = (lon - roDeg) * D2R, rl = rlDeg * D2R;
      const x = Math.cos(la) * Math.sin(lo);
      const y = Math.sin(la);
      const z = Math.cos(la) * Math.cos(lo);
      const y2 = y * Math.cos(rl) - z * Math.sin(rl);
      const z2 = y * Math.sin(rl) + z * Math.cos(rl);
      return { x: cx + R * x, y: cy - R * y2, z: z2 };
    }

    function drawGraticule(rotLa, rotLo, R, cx, cy) {
      ctx.strokeStyle = 'rgba(120,130,150,0.18)';
      ctx.lineWidth = 0.6;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath(); let started = false;
        for (let lon = -180; lon <= 180; lon += 4) {
          const p = project(lat, lon, rotLa, rotLo, R, cx, cy);
          if (p.z > 0) { if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y); }
          else started = false;
        }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath(); let started = false;
        for (let lat = -88; lat <= 88; lat += 4) {
          const p = project(lat, lon, rotLa, rotLo, R, cx, cy);
          if (p.z > 0) { if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y); }
          else started = false;
        }
        ctx.stroke();
      }
    }

    function slerp(aLat, aLon, bLat, bLon, f) {
      const f1 = aLat * D2R, l1 = aLon * D2R, f2 = bLat * D2R, l2 = bLon * D2R;
      const d = 2 * Math.asin(Math.sqrt(
        Math.sin((f2 - f1) / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin((l2 - l1) / 2) ** 2));
      if (d === 0) return [aLat, aLon];
      const A = Math.sin((1 - f) * d) / Math.sin(d);
      const B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(f1) * Math.cos(l1) + B * Math.cos(f2) * Math.cos(l2);
      const y = A * Math.cos(f1) * Math.sin(l1) + B * Math.cos(f2) * Math.sin(l2);
      const z = A * Math.sin(f1) + B * Math.sin(f2);
      return [Math.atan2(z, Math.sqrt(x * x + y * y)) / D2R, Math.atan2(y, x) / D2R];
    }

    function frame(t) {
      const rect = canvas.parentElement.getBoundingClientRect();
      if (Math.abs(rect.width - W) > 2 || Math.abs(rect.height - H) > 2) resize();

      rotLng += (targetRotLng - rotLng) * 0.12;
      rotLat += (targetRotLat - rotLat) * 0.12;
      if (!dragging && Date.now() - lastInteract > 2500) targetRotLng += 0.06;

      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42;
      ctx.clearRect(0, 0, W, H);

      const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.2, cx, cy, R);
      grad.addColorStop(0, 'rgba(20,26,38,0.9)');
      grad.addColorStop(1, 'rgba(8,10,16,0.95)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(90,110,140,0.35)'; ctx.lineWidth = 1; ctx.stroke();

      drawGraticule(rotLat, rotLng, R, cx, cy);

      for (const d of dots) {
        const p = project(d.ll[0], d.ll[1], rotLat, rotLng, R, cx, cy);
        if (p.z <= 0.02) continue;
        const r = 1.2 + 3.2 * Math.sqrt(d.n / maxEv);
        ctx.fillStyle = `rgba(140,160,190,${(0.25 + 0.55 * p.z).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 2 * Math.PI); ctx.fill();
      }

      {
        const p = project(NEPAL[0], NEPAL[1], rotLat, rotLng, R, cx, cy);
        if (p.z > 0) {
          const pulse = 4 + 3 * Math.sin(t / 400);
          ctx.fillStyle = 'rgba(44,200,232,0.25)';
          ctx.beginPath(); ctx.arc(p.x, p.y, pulse + 4, 0, 2 * Math.PI); ctx.fill();
          ctx.fillStyle = '#2CC8E8';
          ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, 2 * Math.PI); ctx.fill();
          ctx.fillStyle = '#F4F4F5'; ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.fillText('NEPAL', p.x + 7, p.y - 5);
        }
      }

      for (const arc of ARC_SOURCES) {
        const src = LATLON[arc[0]];
        if (!src) continue;
        const sp = project(src[0], src[1], rotLat, rotLng, R, cx, cy);
        if (sp.z <= 0) continue;
        ctx.strokeStyle = arc[1]; ctx.lineWidth = 1.4; ctx.setLineDash([]);
        ctx.beginPath();
        let started = false;
        const steps = 40, lift = 0.12;
        for (let i = 0; i <= steps; i++) {
          const f = i / steps;
          const la_lo = slerp(src[0], src[1], NEPAL[0], NEPAL[1], f);
          const p = project(la_lo[0], la_lo[1], rotLat, rotLng, R * (1 + lift * Math.sin(Math.PI * f)), cx, cy);
          if (p.z > 0) { if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y); }
          else started = false;
        }
        ctx.stroke();
        ctx.fillStyle = arc[1];
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 3, 0, 2 * Math.PI); ctx.fill();
        ctx.font = "9px 'JetBrains Mono', monospace"; ctx.fillText(arc[0], sp.x + 6, sp.y + 3);
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.NFGlobe = { mount };
})();
