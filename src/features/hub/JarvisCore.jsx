import { useMemo } from 'react';

/**
 * JarvisCore — noyau HUD holographique.
 *
 * ══ ARCHITECTURE DE RENDU : BLOOM MULTI-PASSES ════════════════════
 *
 * Le SVG est scindé en deux ensembles :
 *   • ensemble SOMBRE   — graduations, structure : rendu une seule fois
 *   • ensemble LUMINEUX — défini dans <defs id=jBright>, donc invisible,
 *     puis rendu SIX FOIS par <use> :
 *
 *       1. passe atmosphérique  flou 48px, opacité .5   → la brume colorée
 *       2. passe large          flou 22px, opacité .7   → le halo
 *       3. passe serrée         flou  7px, opacité .85  → la fusion des traits
 *       4. frange froide        flou 3px, décalée -3px  → aberration chromatique
 *       5. frange chaude        flou 3px, décalée +3px  → aberration chromatique
 *       6. passe nette          sans flou               → le dessin
 *
 * Toutes en mix-blend-mode: screen : elles s ADDITIONNENT. C est le
 * pipeline exact d un moteur de rendu 3D, et c est ce qui distingue une
 * image lumineuse d une image simplement colorée. Les six copies partagent
 * les mêmes animations CSS — elles restent synchrones sans code en plus.
 *
 * COÛT : six rendus et trois flous par image. Si ça rame sur une machine
 * faible, ajouter la classe is-lite sur .jarvis-page — seule la passe nette
 * subsiste, la géométrie reste identique.
 *
 * ══ DÉGRADÉ FIXE, GÉOMÉTRIE MOBILE ═════════════════════════════
 * Le dégradé cyan → blanc → orange est ancré à l écran (userSpaceOnUse).
 * Les anneaux tournent DESSOUS : un arc s embrase en passant en haut à
 * droite, refroidit en cyan en bas à gauche.
 *
 * Repère : viewBox 0 0 1000 1000, centre (500,500), y vers le bas,
 * 0 deg = droite, -90 deg = haut.
 */

const C = 500;
const R_LINK_IN = 200;
const R_LINK_OUT = 352;
const R_BRANCH_PCT = 39;

const rad = (d) => (d * Math.PI) / 180;
const f = (n) => Math.round(n * 10) / 10;
const px = (r, d) => f(C + Math.cos(rad(d)) * r);
const py = (r, d) => f(C + Math.sin(rad(d)) * r);

function arc(r, a0, a1) {
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${px(r, a0)} ${py(r, a0)} A ${r} ${r} 0 ${large} 1 ${px(r, a1)} ${py(r, a1)}`;
}

function poly(r, n, offset = 0) {
  return (
    Array.from({ length: n }, (_, i) => {
      const a = offset + (i * 360) / n;
      return `${i === 0 ? 'M' : 'L'} ${px(r, a)} ${py(r, a)}`;
    }).join(' ') + ' Z'
  );
}

function ticks(n, rOut, rIn, longEvery = 0, rInLong = rIn) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i * 360) / n;
    const long = longEvery > 0 && i % longEvery === 0;
    const inner = long ? rInLong : rIn;
    return { key: i, x1: px(inner, a), y1: py(inner, a), x2: px(rOut, a), y2: py(rOut, a), long };
  });
}

/* ── Géométries précalculées ────────────────────────────────── */

const T_RIM = ticks(30, 494, 484, 5, 476);
const T_FINE = ticks(120, 466, 460, 10, 450);
const T_COMB = ticks(180, 358, 352);
const T_MID = ticks(72, 336, 328, 6, 318);
const T_CORE = ticks(36, 126, 120, 3, 112);

const BLOCKS_OUT = Array.from({ length: 30 }, (_, i) => ({
  key: i, a: i * 12 + 2, r: 432 + (i % 3) * 11,
  w: 4 + ((i * 11) % 26), h: i % 4 === 0 ? 8 : 4,
  hot: i % 6 === 0, amber: i % 9 === 4, d: (i % 7) * 0.55,
}));

const BLOCKS_IN = Array.from({ length: 18 }, (_, i) => ({
  key: i, a: i * 20 + 9, r: 292,
  w: 3 + ((i * 5) % 14), h: 3,
  hot: i % 5 === 2, d: (i % 5) * 0.8,
}));

const BARS = Array.from({ length: 72 }, (_, i) => {
  const a = i * 5;
  const len = 10 + ((i * 13) % 30);
  return {
    key: i,
    x1: px(378, a), y1: py(378, a),
    x2: px(378 + len, a), y2: py(378 + len, a),
    d: ((i * 7) % 24) * 0.11,
  };
});

const TRACES = Array.from({ length: 10 }, (_, i) => {
  const a = i * 36 + 8;
  const b = a + 7;
  return {
    key: i,
    d: `M ${px(258, a)} ${py(258, a)} L ${px(292, a)} ${py(292, a)} L ${px(306, b)} ${py(306, b)} L ${px(330, b)} ${py(330, b)}`,
    cx: px(334, b), cy: py(334, b),
  };
});

const SPOKES = Array.from({ length: 18 }, (_, i) => {
  const a = i * 20 + 10;
  return { key: i, x1: px(238, a), y1: py(238, a), x2: px(268, a), y2: py(268, a), cx: px(272, a), cy: py(272, a) };
});

const BLADES = Array.from({ length: 18 }, (_, i) => {
  const a = i * 20;
  return {
    key: i,
    d: `M ${px(196, a - 8)} ${py(196, a - 8)} L ${px(228, a - 6)} ${py(228, a - 6)} L ${px(228, a + 6)} ${py(228, a + 6)} L ${px(196, a + 8)} ${py(196, a + 8)} Z`,
  };
});

const LABELS = [
  'FLUX', 'CAM 04', 'STOCK', 'QUAI 7', 'SYNC', 'LIGNE 2',
  'NETRACK', 'CHARGE', 'TRAX', 'PROB', 'EXPÉD', 'BUFFER',
].map((t, i) => {
  const a = i * 30 + 15;
  return { key: i, t, x: px(414, a), y: py(414, a), a: a + 90 };
});

const DUST = Array.from({ length: 64 }, (_, i) => {
  const a = (i * 137.5) % 360;
  const r = 150 + ((i * 47) % 350);
  return { key: i, cx: px(r, a), cy: py(r, a), r: i % 5 === 0 ? 2.8 : 1.6, d: ((i * 19) % 40) * 0.14 };
});

const BRACKETS = [-60, 30, 120, 210].map((a, i) => ({ key: i, d: arc(192, a, a + 26) }));

const SWEEP = `M ${C} ${C} L ${px(310, -30)} ${py(310, -30)} A 310 310 0 0 1 ${px(310, 30)} ${py(310, 30)} Z`;

const BANDS_OUT = [arc(322, -128, -8), arc(322, 24, 118)];
const BANDS_MID = [arc(276, 44, 196), arc(276, 232, 340)];
const BANDS_IN = [arc(236, -150, -40), arc(236, 10, 96)];

const ARCS_MAJOR = [arc(396, -86, -18), arc(396, 6, 72), arc(396, 104, 166), arc(396, 190, 258)];
const ARCS_AMBER = [arc(410, -56, 22), arc(384, 44, 88), arc(424, 100, 128)];
const ARCS_BRIGHT = [arc(348, -72, -24), arc(348, 128, 176), arc(348, 46, 68)];
const ARCS_THIN = [arc(452, -140, -40), arc(452, 20, 130)];

function Glow({ d, cls }) {
  return (
    <>
      <path className={`${cls}-halo`} d={d} />
      <path className={cls} d={d} />
    </>
  );
}

/** Éclat anamorphique — la traînée horizontale des objectifs de cinéma. */
function Flare({ cx, cy, w, grad, className = '' }) {
  return (
    <g className={`j-flare ${className}`}>
      <ellipse cx={cx} cy={cy} rx={w} ry={w * 0.03} fill={`url(#${grad})`} />
      <ellipse cx={cx} cy={cy} rx={w * 0.055} ry={w * 0.36} fill={`url(#${grad})`} />
      <circle cx={cx} cy={cy} r={w * 0.05} fill="#FFFFFF" />
    </g>
  );
}

function Layer({ i, spin, children }) {
  return (
    <g className="layer" style={{ animationDelay: `${(i * 0.05).toFixed(2)}s` }}>
      <g className={`rot ${spin}`}>{children}</g>
    </g>
  );
}

export default function JarvisCore({
  branches,
  kpis = {},
  activeId = null,
  focused = false,
  clock = '',
  onSelect,
  onReset,
}) {
  const geo = useMemo(
    () =>
      branches.map((b) => ({
        ...b,
        x1: px(R_LINK_IN, b.angle), y1: py(R_LINK_IN, b.angle),
        x2: px(R_LINK_OUT, b.angle), y2: py(R_LINK_OUT, b.angle),
        mx: px((R_LINK_IN + R_LINK_OUT) / 2, b.angle),
        my: py((R_LINK_IN + R_LINK_OUT) / 2, b.angle),
        left: 50 + Math.cos(rad(b.angle)) * R_BRANCH_PCT,
        top: 50 + Math.sin(rad(b.angle)) * R_BRANCH_PCT,
      })),
    [branches]
  );

  return (
    <div
      className={`jarvis-core${focused ? ' is-focused' : ''}`}
      onClick={focused ? onReset : undefined}
      role={focused ? 'button' : undefined}
      title={focused ? 'Revenir au hub' : undefined}
      aria-label={focused ? 'Revenir au hub' : undefined}
    >
      <svg className="jarvis-svg" viewBox="0 0 1000 1000" aria-hidden="true">
        <defs>
          {/* Température ancrée à l ecran : glacial en bas-gauche, brasier en haut-droite */}
          <linearGradient id="jSplit" gradientUnits="userSpaceOnUse" x1="120" y1="800" x2="900" y2="220">
            <stop offset="0%" style={{ stopColor: '#0060A8' }} />
            <stop offset="18%" style={{ stopColor: '#00A6E8' }} />
            <stop offset="36%" style={{ stopColor: '#00E5FF' }} />
            <stop offset="50%" style={{ stopColor: '#D6FBFF' }} />
            <stop offset="58%" style={{ stopColor: '#FFFFFF' }} />
            <stop offset="68%" style={{ stopColor: '#FFD08A' }} />
            <stop offset="82%" style={{ stopColor: '#FF8A18' }} />
            <stop offset="100%" style={{ stopColor: '#E23C00' }} />
          </linearGradient>

          <radialGradient id="jHaloCool" cx="28%" cy="70%" r="54%">
            <stop offset="0%" style={{ stopColor: '#00D9FF', stopOpacity: .3 }} />
            <stop offset="100%" style={{ stopColor: '#0060A8', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jHaloWarm" cx="74%" cy="30%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FF8A18', stopOpacity: .32 }} />
            <stop offset="100%" style={{ stopColor: '#E23C00', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jCoreFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#EAFDFF', stopOpacity: .5 }} />
            <stop offset="40%" style={{ stopColor: '#00D9FF', stopOpacity: .2 }} />
            <stop offset="100%" style={{ stopColor: '#0060A8', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jHeart" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
            <stop offset="24%" style={{ stopColor: '#D6FBFF', stopOpacity: .8 }} />
            <stop offset="100%" style={{ stopColor: '#00A6E8', stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id="jSweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: '#00E5FF', stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: '#00E5FF', stopOpacity: .42 }} />
          </linearGradient>
          <radialGradient id="jBloomTeal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
            <stop offset="16%" style={{ stopColor: '#D6FBFF', stopOpacity: .85 }} />
            <stop offset="46%" style={{ stopColor: '#00E5FF', stopOpacity: .34 }} />
            <stop offset="100%" style={{ stopColor: '#0060A8', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jBloomAmber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
            <stop offset="18%" style={{ stopColor: '#FFD08A', stopOpacity: .8 }} />
            <stop offset="50%" style={{ stopColor: '#FF8A18', stopOpacity: .32 }} />
            <stop offset="100%" style={{ stopColor: '#E23C00', stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id="jFlareCool" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: '#00E5FF', stopOpacity: 0 }} />
            <stop offset="50%" style={{ stopColor: '#EAFDFF', stopOpacity: .9 }} />
            <stop offset="100%" style={{ stopColor: '#00E5FF', stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id="jFlareWarm" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: '#FF8A18', stopOpacity: 0 }} />
            <stop offset="50%" style={{ stopColor: '#FFF0D6', stopOpacity: .88 }} />
            <stop offset="100%" style={{ stopColor: '#FF8A18', stopOpacity: 0 }} />
          </linearGradient>

          {/* ══ ENSEMBLE LUMINEUX — invisible ici, rendu 6 fois par <use> ══ */}
          <g id="jBright">
            <Layer i={3} spin="rot-s72">
              {ARCS_THIN.map((d, i) => <Glow key={i} d={d} cls="j-arc-thin" />)}
            </Layer>

            <Layer i={4} spin="rot-s64">
              {BLOCKS_OUT.map((b) => (
                <rect
                  key={b.key}
                  className={`j-block${b.hot ? ' is-hot' : ''}${b.amber ? ' is-amber' : ''}`}
                  transform={`translate(${C} ${C}) rotate(${b.a})`}
                  x={b.r} y={-b.h / 2} width={b.w} height={b.h} rx="1"
                  style={{ animationDelay: `${b.d}s` }}
                />
              ))}
            </Layer>

            <Layer i={5} spin="rot-s52r">
              {ARCS_AMBER.map((d, i) => <Glow key={i} d={d} cls="j-arc-amber" />)}
            </Layer>

            <Layer i={7} spin="rot-s88">
              <circle className="j-flow" cx={C} cy={C} r="424" />
            </Layer>

            <Layer i={8} spin="rot-s44r">
              {ARCS_MAJOR.map((d, i) => <Glow key={i} d={d} cls="j-arc-major" />)}
            </Layer>

            <Layer i={9} spin="rot-s58">
              {BARS.map((b) => (
                <line key={b.key} className="j-bar" x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
                  pathLength="1" style={{ animationDelay: `${b.d}s` }} />
              ))}
            </Layer>

            <Layer i={11} spin="rot-s26r">
              {T_COMB.map((t) => (
                <line key={t.key} className="j-comb" x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
              ))}
            </Layer>

            <Layer i={12} spin="rot-s30">
              <circle className="j-ring" cx={C} cy={C} r="348" strokeDasharray="196 30 62 30" />
              {ARCS_BRIGHT.map((d, i) => <Glow key={i} d={d} cls="j-arc-bright" />)}
            </Layer>

            <Layer i={14} spin="rot-s34r">
              {BANDS_OUT.map((d, i) => <Glow key={i} d={d} cls="j-band" />)}
            </Layer>

            <Layer i={16} spin="rot-s9">
              <path className="j-sweep" d={SWEEP} fill="url(#jSweep)" />
              <line className="j-sweep-edge" x1={C} y1={C} x2={px(310, 30)} y2={py(310, 30)} />
            </Layer>

            <Layer i={17} spin="rot-s48">
              {BANDS_MID.map((d, i) => <Glow key={i} d={d} cls="j-band" />)}
            </Layer>

            <Layer i={18} spin="rot-s34">
              {BLOCKS_IN.map((b) => (
                <rect
                  key={b.key}
                  className={`j-block${b.hot ? ' is-hot' : ''}`}
                  transform={`translate(${C} ${C}) rotate(${b.a})`}
                  x={b.r} y={-b.h / 2} width={b.w} height={b.h} rx="1"
                  style={{ animationDelay: `${b.d}s` }}
                />
              ))}
            </Layer>

            <Layer i={20} spin="rot-s38r">
              {BANDS_IN.map((d, i) => <Glow key={i} d={d} cls="j-band-thin" />)}
            </Layer>

            <Layer i={23} spin="rot-s46r">
              {BRACKETS.map((b) => <Glow key={b.key} d={b.d} cls="j-bracket" />)}
            </Layer>

            <Layer i={24} spin="rot-s18">
              <circle className="j-bloom" cx={C + 396} cy={C} r="86" fill="url(#jBloomTeal)" />
              <Flare cx={C + 396} cy={C} w={210} grad="jFlareCool" />
            </Layer>
            <Layer i={24} spin="rot-s27r">
              <circle className="j-bloom" cx={C - 348} cy={C} r="70" fill="url(#jBloomAmber)" />
              <Flare cx={C - 348} cy={C} w={165} grad="jFlareWarm" className="is-slow" />
            </Layer>
            <Layer i={24} spin="rot-s15r">
              <circle className="j-bloom" cx={C} cy={C - 452} r="46" fill="url(#jBloomTeal)" />
              <Flare cx={C} cy={C - 452} w={104} grad="jFlareCool" />
            </Layer>
            <Layer i={24} spin="rot-s62">
              <circle className="j-bloom" cx={C} cy={C + 276} r="58" fill="url(#jBloomAmber)" />
              <Flare cx={C} cy={C + 276} w={130} grad="jFlareWarm" />
            </Layer>

            <g className="layer" style={{ animationDelay: '1.4s' }}>
              <circle cx={C} cy={C} r="186" fill="url(#jCoreFill)" />
              <circle className="j-ring-halo" cx={C} cy={C} r="186" />
              <circle className="j-ring-bright" cx={C} cy={C} r="186" />
              <circle className="j-pulse" cx={C} cy={C} r="186" />
              <circle className="j-pulse j-pulse-2" cx={C} cy={C} r="186" />
              <circle className="j-heart" cx={C} cy={C} r="82" fill="url(#jHeart)" />
            </g>

            <Layer i={25} spin="rot-s20">
              <path className="j-poly-bright" d={poly(104, 3, -90)} />
            </Layer>
          </g>
        </defs>

        {/* ══ FOND ═════════════════════════════════════════ */}
        <g className="j-add">
          <circle cx={C} cy={C} r="500" fill="url(#jHaloCool)" />
          <circle cx={C} cy={C} r="500" fill="url(#jHaloWarm)" />
        </g>

        {/* ══ ENSEMBLE SOMBRE — structure, rendu une seule fois ════════ */}
        <Layer i={0} spin="rot-dust">
          {DUST.map((p) => (
            <circle key={p.key} className="j-dust" cx={p.cx} cy={p.cy} r={p.r} style={{ animationDelay: `${p.d}s` }} />
          ))}
        </Layer>

        <Layer i={1} spin="rot-s140">
          <circle className="j-hair" cx={C} cy={C} r="490" strokeDasharray="2 14" />
          {T_RIM.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick j-tick-long' : 'j-tick'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        <Layer i={2} spin="rot-s96r">
          <circle className="j-hair" cx={C} cy={C} r="460" />
          {T_FINE.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        <Layer i={6} spin="rot-s110r">
          {LABELS.map((l) => (
            <text key={l.key} className="j-tag" transform={`translate(${l.x} ${l.y}) rotate(${l.a})`}>{l.t}</text>
          ))}
        </Layer>

        <Layer i={10} spin="rot-s120">
          <circle className="j-hair-blue" cx={C} cy={C} r="366" strokeDasharray="3 17" />
          <circle className="j-hair-blue" cx={C} cy={C} r="358" strokeDasharray="140 220" />
        </Layer>

        <Layer i={13} spin="rot-s40r">
          {T_MID.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        <Layer i={15} spin="rot-s76r">
          {TRACES.map((t) => (
            <g key={t.key}>
              <path className="j-trace" d={t.d} />
              <circle className="j-trace-dot" cx={t.cx} cy={t.cy} r="3.2" />
            </g>
          ))}
        </Layer>

        <Layer i={19} spin="rot-s24r">
          <circle className="j-hair" cx={C} cy={C} r="300" strokeDasharray="1 11" />
          {SPOKES.map((s) => (
            <g key={s.key}>
              <line className="j-spoke" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
              <circle className="j-spoke-dot" cx={s.cx} cy={s.cy} r="2.4" />
            </g>
          ))}
        </Layer>

        <Layer i={21} spin="rot-s80">
          {BLADES.map((b) => <path key={b.key} className="j-blade" d={b.d} />)}
          <circle className="j-hair" cx={C} cy={C} r="232" />
        </Layer>

        <Layer i={22} spin="rot-s64r">
          <path className="j-poly" d={poly(216, 12)} />
          <path className="j-poly" d={poly(206, 6, 30)} />
        </Layer>

        <Layer i={25} spin="rot-s36r">
          <circle className="j-hair" cx={C} cy={C} r="140" strokeDasharray="52 16 9 16" />
          {T_CORE.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        {/* ══ LES SIX PASSES DE RENDU ════════════════════════════ */}
        <use href="#jBright" className="pass pass-atmo" />
        <use href="#jBright" className="pass pass-wide" />
        <use href="#jBright" className="pass pass-tight" />
        <use href="#jBright" className="pass pass-ca-cool" />
        <use href="#jBright" className="pass pass-ca-warm" />
        <use href="#jBright" className="pass pass-sharp" />

        {/* ══ Connecteurs et typographie, au-dessus du bloom ══════════ */}
        <g className="layer" style={{ animationDelay: '1.3s' }}>
          {geo.map((b) => (
            <g key={`link-${b.id}`}>
              <line className={`j-link-halo${activeId === b.id ? ' is-hot' : ''}`} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />
              <line className={`j-link${activeId === b.id ? ' is-hot' : ''}`} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />
              <circle className={`j-node-dot${activeId === b.id ? ' is-hot' : ''}`} cx={b.x2} cy={b.y2} r="6" />
              <circle className={`j-node-pip${activeId === b.id ? ' is-hot' : ''}`} cx={b.mx} cy={b.my} r="2.6" />
            </g>
          ))}
        </g>

        <g className="layer" style={{ animationDelay: '1.5s' }}>
          <text className="j-label" x={C} y="486">SOY</text>
          <text className="j-sublabel" x={C} y="528">EXPÉDITION</text>
          {clock ? <text className="j-clock" x={C} y="580">{clock}</text> : null}
          <text className="j-micro" x="176" y="506">SYS · NOMINAL</text>
          <text className="j-micro" x="824" y="506">LINK · ACTIF</text>
        </g>
      </svg>

      {geo.map((b) => {
        const value = kpis[b.id];
        return (
          <button
            key={b.id}
            type="button"
            className="jbranch"
            style={{ left: `${b.left}%`, top: `${b.top}%` }}
            onClick={(e) => { e.stopPropagation(); onSelect(b.id); }}
            tabIndex={focused ? -1 : 0}
            aria-hidden={focused}
          >
            <span className="jbranch-top">
              <span className="jbranch-dot" />
              <span className="jbranch-icon" aria-hidden="true">{b.icon}</span>
              <span className="jbranch-title">{b.title}</span>
            </span>
            <div className={`jbranch-kpi${value == null ? ' is-idle' : ''}`}>
              {value == null ? '—' : value}
            </div>
            <div className="jbranch-unit">{b.unit}</div>
          </button>
        );
      })}
    </div>
  );
}
