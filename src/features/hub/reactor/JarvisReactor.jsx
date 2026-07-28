/* JarvisReactor — cœur du réacteur HUD. Canvas 2D, une seule boucle rAF,
   sensible au devicePixelRatio, sans dépendance.

   Origine : export « Animation Jarvis pour React » (Claude Design). Le code
   de rendu est repris tel quel — seul le nom du composant a changé, pour ne
   pas entrer en collision avec l'ancien JarvisCore.jsx (noyau SVG), conservé
   comme solution de repli. Ne pas retoucher la boucle de dessin sans raison :
   elle est écrite en temps réel (indépendante du framerate) et se met en
   pause quand l'onglet est masqué.

   <JarvisReactor speed={1} intensity={1} cyan="#38d6ff" amber="#ff7a18"
                  density={1} surgeEvery={7} surgePower={1.4} />
   Remplit son parent : c'est au parent d'avoir une taille. */

import React, { useRef, useEffect } from 'react';
const TAU = Math.PI * 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hexToRgb(h) {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map(c => c + c).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function JarvisReactor(props) {
  const p = props || {};
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const cfg = useRef({});
  cfg.current = {
    speed: p.speed == null ? 1 : p.speed,
    intensity: p.intensity == null ? 1 : p.intensity,
    cyan: p.cyan || '#38d6ff',
    amber: p.amber || '#ff7a18',
    density: p.density == null ? 1 : p.density,
    surgeEvery: p.surgeEvery == null ? 7 : p.surgeEvery,
    surgePower: p.surgePower == null ? 1.4 : p.surgePower,
  };

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    let W = 0, H = 0, dpr = 1, R = 0, raf = 0, T = 0, last = performance.now();

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      R = Math.min(W, H) * 0.5 * 0.78;
    };
    const ro = new ResizeObserver(resize); ro.observe(wrap); resize();

    /* ---------------- scène (tirée une fois, disposition stable) ---------------- */
    const rnd = mulberry32(20260727);
    const pick = arr => arr[Math.floor(rnd() * arr.length)];

    const segRings = [];
    const ringSpecs = [
      [0.955, 0.0016, -0.030, 'a', 0.30, 5], [0.930, 0.0022, 0.022, 'c', 0.22, 3],
      [0.880, 0.0035, -0.045, 'a', 0.55, 7], [0.845, 0.0012, 0.060, 'c', 0.30, 2],
      [0.790, 0.0055, 0.038, 'c', 0.75, 4], [0.752, 0.0020, -0.070, 'a', 0.60, 9],
      [0.700, 0.0090, -0.028, 'c', 0.95, 3], [0.658, 0.0030, 0.085, 'w', 0.45, 6],
      [0.600, 0.0130, 0.032, 'c', 1.00, 2], [0.552, 0.0040, -0.100, 'a', 0.70, 8],
      [0.505, 0.0070, 0.055, 'c', 0.85, 4], [0.455, 0.0026, -0.062, 'w', 0.50, 5],
      [0.395, 0.0100, -0.040, 'c', 0.95, 3], [0.340, 0.0034, 0.110, 'a', 0.65, 6],
      [0.285, 0.0060, -0.090, 'c', 0.90, 4], [0.225, 0.0028, 0.140, 'w', 0.55, 3],
    ];
    ringSpecs.forEach(([r, w, spd, col, a, nseg], i) => {
      const segs = [];
      let cursor = rnd() * TAU;
      for (let s = 0; s < nseg; s++) {
        const span = (TAU / nseg) * (0.35 + rnd() * 0.5);
        segs.push({ a0: cursor, span, ph: rnd() * TAU, fr: 0.4 + rnd() * 1.9 });
        cursor += TAU / nseg;
      }
      segRings.push({ r, w, spd, col, a, segs, ph: rnd() * TAU, i });
    });

    const tickRings = [];
    [[0.905, 200, 0.020, 0.018, 'c', 0.35], [0.815, 120, -0.030, 0.030, 'a', 0.40],
     [0.727, 260, 0.014, 0.014, 'c', 0.30], [0.630, 90, -0.052, 0.042, 'w', 0.35],
     [0.470, 160, 0.046, 0.024, 'c', 0.45], [0.310, 72, -0.075, 0.034, 'a', 0.40],
     [0.185, 120, 0.100, 0.020, 'c', 0.55]].forEach(([r, n, spd, len, col, a]) => {
      tickRings.push({ r, n, spd, len, col, a, ph: rnd() * TAU, major: 1 + Math.floor(rnd() * 4) * 2 });
    });

    const glyphRows = [];
    for (let i = 0; i < 26; i++) {
      const r = 0.34 + rnd() * 0.62;
      const count = 8 + Math.floor(rnd() * 22);
      const glyphs = [];
      for (let g = 0; g < count; g++) glyphs.push(0.2 + rnd() * 1.0);
      glyphRows.push({
        r, a0: rnd() * TAU, spd: (rnd() - 0.5) * 0.09, glyphs,
        col: pick(['c', 'c', 'a', 'w']), h: 0.009 + rnd() * 0.010,
        gap: 0.0050 + rnd() * 0.006, a: 0.25 + rnd() * 0.5, ph: rnd() * TAU, seed: rnd() * 1000,
      });
    }

    const traces = [];
    for (let i = 0; i < 26; i++) {
      const a = rnd() * TAU;
      const r0 = 0.62 + rnd() * 0.30;
      const r1 = r0 + 0.10 + rnd() * 0.30;
      const bend = (rnd() < 0.5 ? -1 : 1) * (0.05 + rnd() * 0.22);
      traces.push({
        a, r0, r1, bend, col: pick(['c', 'a', 'a', 'w']), ph: rnd() * TAU,
        spd: 0.14 + rnd() * 0.35, node: rnd() < 0.4 ? 'ring' : 'dot',
        stub: rnd() < 0.45 ? 0.03 + rnd() * 0.05 : 0, drift: (rnd() - 0.5) * 0.012,
      });
    }

    const chips = [];
    for (let i = 0; i < 22; i++) {
      chips.push({
        r: 0.66 + rnd() * 0.30, a: rnd() * TAU, spd: (rnd() - 0.5) * 0.06,
        w: 0.010 + rnd() * 0.022, h: 0.008 + rnd() * 0.016,
        col: rnd() < 0.72 ? 'a' : 'c', ph: rnd() * TAU, fr: 0.3 + rnd() * 1.4, tilt: rnd() < 0.5,
      });
    }

    const sparks = [];
    for (let i = 0; i < 90; i++) {
      sparks.push({ a: rnd() * TAU, r: 0.2 + rnd() * 0.95, v: 0.008 + rnd() * 0.05,
        s: 0.0012 + rnd() * 0.0035, col: rnd() < 0.5 ? 'a' : 'c', ph: rnd() * TAU, ang: (rnd() - 0.5) * 0.06 });
    }

    const spots = [
      { r: 0.60, a: 2.5, spd: 0.055, col: 'c', size: 0.30, pw: 1.0 },
      { r: 0.66, a: 1.55, spd: -0.041, col: 'c', size: 0.24, pw: 0.8 },
      { r: 0.72, a: 6.0, spd: 0.033, col: 'a', size: 0.34, pw: 0.9 },
      { r: 0.42, a: 4.4, spd: -0.070, col: 'w', size: 0.16, pw: 0.7 },
    ];

    /* ---------------- dessin ---------------- */
    const rgbCache = {};
    const COL = k => {
      const c = cfg.current;
      const hex = k === 'a' ? c.amber : k === 'w' ? '#ffffff' : c.cyan;
      if (!rgbCache[hex]) rgbCache[hex] = hexToRgb(hex);
      return rgbCache[hex];
    };
    const rgba = (k, al) => { const [r, g, b] = COL(k); return 'rgba(' + r + ',' + g + ',' + b + ',' + al.toFixed(3) + ')'; };

    const flick = (t, ph, fr) =>
      0.62 + 0.20 * Math.sin(t * fr + ph) + 0.10 * Math.sin(t * fr * 3.7 + ph * 2.1) +
      0.08 * Math.sin(t * fr * 9.3 + ph * 0.7);

    const surgeAt = t => {
      const every = Math.max(0.5, cfg.current.surgeEvery);
      const c = ((t / every) % 1 + 1) % 1;
      return Math.exp(-Math.pow((c - 0.12) * 9, 2));
    };

    const draw = (t) => {
      const I = cfg.current.intensity, D = cfg.current.density;
      const cx = W / 2, cy = H / 2;
      const surge = surgeAt(t);
      const breath = 0.92 + 0.08 * Math.sin(t * 0.55) + 0.05 * Math.sin(t * 1.31 + 1.2);
      const G = I * (breath + surge * 0.55);
      const scale = 1 + surge * 0.012 + 0.004 * Math.sin(t * 0.7);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'butt';

      const rr = v => v * R;

      const wash = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.15);
      wash.addColorStop(0, rgba('c', 0.30 * G));
      wash.addColorStop(0.28, rgba('c', 0.10 * G));
      wash.addColorStop(0.62, rgba('a', 0.045 * G));
      wash.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wash;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.15, 0, TAU); ctx.fill();

      const warm = ctx.createRadialGradient(R * 0.42, -R * 0.10, 0, R * 0.42, -R * 0.10, R * 0.85);
      warm.addColorStop(0, rgba('a', 0.26 * G)); warm.addColorStop(0.45, rgba('a', 0.08 * G)); warm.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = warm; ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
      for (let i = 0; i < 3; i++) {
        const rr0 = 0.62 + i * 0.075;
        const a0 = -0.85 + Math.sin(t * 0.13 + i) * 0.22;
        const grad = ctx.createLinearGradient(-R, 0, R, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, rgba('a', (0.30 - i * 0.07) * G));
        grad.addColorStop(1, rgba('a', (0.10 - i * 0.03) * G));
        ctx.strokeStyle = grad;
        ctx.lineWidth = R * (0.020 - i * 0.005);
        ctx.beginPath(); ctx.arc(0, 0, R * rr0, a0, a0 + 2.5); ctx.stroke();
      }

      ctx.lineWidth = Math.max(0.7, R * 0.0014);
      traces.forEach(tr => {
        const a = tr.a + tr.drift * t;
        const life = flick(t, tr.ph, tr.spd * 3);
        const al = (0.20 + 0.35 * life) * G;
        const x0 = Math.cos(a) * rr(tr.r0), y0 = Math.sin(a) * rr(tr.r0);
        const x1 = Math.cos(a) * rr(tr.r1), y1 = Math.sin(a) * rr(tr.r1);
        const a2 = a + tr.bend;
        const x2 = Math.cos(a2) * rr(tr.r1 + 0.04), y2 = Math.sin(a2) * rr(tr.r1 + 0.04);
        ctx.strokeStyle = rgba(tr.col, al * 0.65);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (tr.stub) {
          const x3 = Math.cos(a2) * rr(tr.r1 + 0.04 + tr.stub), y3 = Math.sin(a2) * rr(tr.r1 + 0.04 + tr.stub);
          ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
        }
        const nr = R * (tr.node === 'ring' ? 0.010 : 0.0045);
        ctx.beginPath(); ctx.arc(x2, y2, nr, 0, TAU);
        if (tr.node === 'ring') { ctx.strokeStyle = rgba(tr.col, al); ctx.stroke(); }
        else { ctx.fillStyle = rgba(tr.col, al * 1.4); ctx.fill(); }
        const u = ((t * tr.spd + tr.ph) % 1 + 1) % 1;
        const px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u;
        const pa = Math.sin(u * Math.PI) * 0.9 * G;
        if (pa > 0.02) {
          const pg = ctx.createRadialGradient(px, py, 0, px, py, R * 0.02);
          pg.addColorStop(0, rgba(tr.col, pa)); pg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, R * 0.02, 0, TAU); ctx.fill();
        }
      });

      tickRings.forEach(tk => {
        const base = tk.ph + t * tk.spd;
        const step = TAU / tk.n;
        const n = Math.max(24, Math.round(tk.n * D));
        for (let i = 0; i < n; i++) {
          const a = base + i * step;
          const isMaj = i % tk.major === 0;
          const w = Math.sin(t * 0.8 + i * 0.35) * 0.5 + 0.5;
          const al = tk.a * (0.35 + 0.65 * w) * G * (isMaj ? 1.5 : 1);
          if (al < 0.02) continue;
          const l = tk.len * (isMaj ? 1.9 : 1);
          const c = Math.cos(a), s = Math.sin(a);
          ctx.strokeStyle = rgba(tk.col, al);
          ctx.lineWidth = Math.max(0.6, R * (isMaj ? 0.0022 : 0.0013));
          ctx.beginPath();
          ctx.moveTo(c * rr(tk.r), s * rr(tk.r));
          ctx.lineTo(c * rr(tk.r + l), s * rr(tk.r + l));
          ctx.stroke();
        }
      });

      glyphRows.forEach(row => {
        let a = row.a0 + t * row.spd;
        const rowAl = row.a * (0.45 + 0.55 * flick(t, row.ph, 0.7)) * G;
        const h = rr(row.h);
        for (let g = 0; g < row.glyphs.length; g++) {
          const wgl = row.glyphs[g];
          const jitter = 0.5 + 0.5 * Math.sin(t * 2.2 + g * 1.7 + row.seed);
          const wArc = row.gap * (0.4 + wgl * (0.8 + jitter * 0.5));
          const al = rowAl * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3.1 + g * 0.9 + row.seed)));
          if (al > 0.02) {
            ctx.fillStyle = rgba(row.col, al);
            ctx.beginPath();
            ctx.arc(0, 0, rr(row.r), a, a + wArc);
            ctx.arc(0, 0, rr(row.r) + h, a + wArc, a, true);
            ctx.closePath(); ctx.fill();
          }
          a += wArc + row.gap * 0.55;
        }
      });

      segRings.forEach(ring => {
        const rot = ring.ph + t * ring.spd * (1 + surge * cfg.current.surgePower * 4);
        ring.segs.forEach(sg => {
          const f = flick(t, sg.ph, sg.fr);
          const al = ring.a * (0.30 + 0.85 * f) * G;
          if (al < 0.015) return;
          ctx.lineWidth = Math.max(0.6, rr(ring.w) * (0.85 + 0.3 * f));
          ctx.strokeStyle = rgba(ring.col, Math.min(1, al));
          ctx.beginPath(); ctx.arc(0, 0, rr(ring.r), rot + sg.a0, rot + sg.a0 + sg.span); ctx.stroke();
          const ex = Math.cos(rot + sg.a0 + sg.span) * rr(ring.r), ey = Math.sin(rot + sg.a0 + sg.span) * rr(ring.r);
          const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, rr(ring.w) * 6 + R * 0.012);
          eg.addColorStop(0, rgba('w', Math.min(0.85, al * 0.8)));
          eg.addColorStop(0.35, rgba(ring.col, al * 0.4));
          eg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = eg;
          ctx.beginPath(); ctx.arc(ex, ey, rr(ring.w) * 6 + R * 0.012, 0, TAU); ctx.fill();
        });
      });

      chips.forEach(ch => {
        const a = ch.a + t * ch.spd;
        const f = flick(t, ch.ph, ch.fr);
        const al = (0.25 + 0.7 * f) * G;
        ctx.save();
        ctx.rotate(a); ctx.translate(rr(ch.r), 0); if (ch.tilt) ctx.rotate(0.5);
        ctx.fillStyle = rgba(ch.col, Math.min(1, al * 0.9));
        ctx.fillRect(-rr(ch.w) / 2, -rr(ch.h) / 2, rr(ch.w), rr(ch.h));
        ctx.fillStyle = rgba(ch.col, al * 0.18);
        ctx.fillRect(-rr(ch.w), -rr(ch.h), rr(ch.w) * 2, rr(ch.h) * 2);
        ctx.restore();
      });

      const sweepA = t * 0.42;
      for (let i = 0; i < 26; i++) {
        const span = 0.030;
        const a0 = sweepA - i * span;
        const al = (1 - i / 26) * 0.055 * G;
        ctx.strokeStyle = rgba('c', al);
        ctx.lineWidth = rr(0.46);
        ctx.beginPath(); ctx.arc(0, 0, rr(0.50), a0, a0 + span * 1.05); ctx.stroke();
      }

      spots.forEach(sp => {
        const a = sp.a + t * sp.spd;
        const x = Math.cos(a) * rr(sp.r), y = Math.sin(a) * rr(sp.r);
        const pw = (0.55 + 0.45 * Math.sin(t * 0.9 + sp.a)) * sp.pw * G;
        const rad = rr(sp.size) * (0.85 + 0.25 * pw);
        const gg = ctx.createRadialGradient(x, y, 0, x, y, rad);
        gg.addColorStop(0, 'rgba(255,255,255,' + (0.55 * pw).toFixed(3) + ')');
        gg.addColorStop(0.12, rgba(sp.col, 0.42 * pw));
        gg.addColorStop(0.42, rgba(sp.col, 0.12 * pw));
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
        const sg2 = ctx.createLinearGradient(-rad * 1.6, 0, rad * 1.6, 0);
        sg2.addColorStop(0, 'rgba(0,0,0,0)');
        sg2.addColorStop(0.5, rgba(sp.col, 0.16 * pw));
        sg2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg2; ctx.fillRect(-rad * 1.6, -rr(0.004), rad * 3.2, rr(0.008));
        ctx.restore();
      });

      const blades = 6;
      const bRot = -t * 0.22;
      for (let i = 0; i < blades; i++) {
        const a = bRot + (i / blades) * TAU;
        const f = 0.5 + 0.5 * Math.sin(t * 1.4 + i);
        ctx.save(); ctx.rotate(a);
        ctx.fillStyle = rgba(i % 3 === 0 ? 'a' : 'c', (0.10 + 0.16 * f) * G);
        ctx.beginPath();
        ctx.moveTo(rr(0.055), -rr(0.020));
        ctx.lineTo(rr(0.150), -rr(0.052));
        ctx.lineTo(rr(0.150), rr(0.010));
        ctx.lineTo(rr(0.055), rr(0.014));
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      for (let i = 0; i < 5; i++) {
        const r = 0.045 + i * 0.030;
        const f = 0.5 + 0.5 * Math.sin(t * (1.1 + i * 0.4) + i);
        ctx.strokeStyle = rgba(i === 2 ? 'w' : 'c', (0.22 + 0.5 * f) * G);
        ctx.lineWidth = Math.max(0.7, rr(0.0022));
        ctx.beginPath(); ctx.arc(0, 0, rr(r), 0, TAU); ctx.stroke();
      }
      const coreR = rr(0.20) * (0.9 + 0.12 * Math.sin(t * 1.6) + surge * 0.35);
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
      cg.addColorStop(0, 'rgba(255,255,255,' + (0.95 * G).toFixed(3) + ')');
      cg.addColorStop(0.10, 'rgba(226,252,255,' + (0.72 * G).toFixed(3) + ')');
      cg.addColorStop(0.30, rgba('c', 0.42 * G));
      cg.addColorStop(0.70, rgba('c', 0.10 * G));
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, coreR, 0, TAU); ctx.fill();

      sparks.forEach(sp => {
        const cycle = (t * sp.v + sp.ph) % 1;
        const r = sp.r + cycle * 0.22;
        const a = sp.a + t * sp.ang;
        const al = Math.sin(cycle * Math.PI) * 0.8 * G;
        if (al < 0.02) return;
        const x = Math.cos(a) * rr(r), y = Math.sin(a) * rr(r);
        ctx.fillStyle = rgba(sp.col, al);
        ctx.beginPath(); ctx.arc(x, y, rr(sp.s), 0, TAU); ctx.fill();
        const sgd = ctx.createRadialGradient(x, y, 0, x, y, rr(sp.s) * 8);
        sgd.addColorStop(0, rgba(sp.col, al * 0.35)); sgd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sgd; ctx.beginPath(); ctx.arc(x, y, rr(sp.s) * 8, 0, TAU); ctx.fill();
      });

      ctx.restore();
    };

    let visible = true;
    const onVis = () => { visible = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      T += dt * cfg.current.speed;
      draw(T);
    };
    raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return React.createElement(
    'div',
    { ref: wrapRef, style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' } },
    React.createElement('canvas', { ref: canvasRef, style: { display: 'block', width: '100%', height: '100%' } })
  );
}

export { JarvisReactor };
export default JarvisReactor;
