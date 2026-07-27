import { useMemo } from 'react';

/**
 * JarvisCore — noyau HUD holographique.
 *
 * ══ LES TROIS MÉCANISMES QUI FONT LE RENDU ═════════════════════════
 *
 * 1. MÉLANGE ADDITIF (mix-blend-mode: screen)
 *    Deux halos qui se superposent s'ADDITIONNENT au lieu de se masquer.
 *    C'est ce qui donne les blancs incandescents aux croisements, et c'est
 *    la différence entre « lumineux » et « coloré ». Sans ça, empiler des
 *    transparences ne fait que salir l'image.
 *
 * 2. DÉGRADÉ FIXE, GÉOMÉTRIE MOBILE (gradientUnits="userSpaceOnUse")
 *    Le dégradé cyan → orange est ancré à l'écran, pas aux formes. Les
 *    anneaux tournent DESSOUS et changent donc de couleur en traversant :
 *    un arc devient orange en passant à droite, puis refroidit à gauche.
 *    Une seule définition produit une animation de température permanente.
 *
 * 3. BLOOM PAR DOUBLAGE (halo épais + trait net)
 *    Plutôt qu'un feGaussianBlur, recalculé à chaque image sur 30 groupes
 *    en rotation. Rapport à respecter : épaisseur ×6 à ×10, opacité .05–.12.
 *
 * Hiérarchie : structure .12–.25 · détail .3–.5 · accent .7–1 · cœur blanc pur.
 * Si tout brille, plus rien ne brille.
 *
 * Repère : viewBox 0 0 1000 1000, centre (500,500), y vers le bas,
 * 0° = droite, -90° = haut.
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

/* ── Géométries précalculées ──────────────────────────────────── */

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
  hot: i % 5 === 2, amber: false, d: (i % 5) * 0.8,
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
const SWEEP_TAIL = `M ${C} ${C} L ${px(310, 30)} ${py(310, 30)} A 310 310 0 0 1 ${px(310, 96)} ${py(310, 96)} Z`;

/** Bandes épaisses — les rubans lumineux larges, coloriés par le dégradé fixe. */
const BANDS_OUT = [arc(322, -128, -8), arc(322, 24, 118)];
const BANDS_MID = [arc(276, 44, 196), arc(276, 232, 340)];
const BANDS_IN = [arc(236, -150, -40), arc(236, 10, 96)];

const ARCS_MAJOR = [arc(396, -86, -18), arc(396, 6, 72), arc(396, 104, 166), arc(396, 190, 258)];
const ARCS_AMBER = [arc(410, -56, 22), arc(384, 44, 88), arc(424, 100, 128)];
const ARCS_BRIGHT = [arc(348, -72, -24), arc(348, 128, 176), arc(348, 46, 68)];
const ARCS_THIN = [arc(452, -140, -40), arc(452, 20, 130)];

/** Halo épais + trait net : le doublage qui produit le bloom. */
function Glow({ d, cls }) {
  return (
    <>
      <path className={`${cls}-halo`} d={d} />
      <path className={cls} d={d} />
    </>
  );
}

/**
 * Éclat anamorphique — la trace horizontale des objectifs de cinéma.
 * Ellipse très aplatie + éclat vertical court + point blanc pur au centre.
 * C'est ce détail qui fait basculer le rendu de « graphique » à « photographié ».
 */
function Flare({ cx, cy, w, grad, className = '' }) {
  return (
    <g className={`j-flare ${className}`}>
      <ellipse cx={cx} cy={cy} rx={w} ry={w * 0.035} fill={`url(#${grad})`} />
      <ellipse cx={cx} cy={cy} rx={w * 0.06} ry={w * 0.34} fill={`url(#${grad})`} />
      <circle cx={cx} cy={cy} r={w * 0.045} fill="#FFFFFF" />
    </g>
  );
}

/** Une couche = apparition échelonnée (layer) + rotation propre (rot). */
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
          {/* Dégradé de température ancré à l'écran : froid en bas-gauche,
              incandescent en haut-droite. Les anneaux tournent dessous. */}
          <linearGradient id="jSplit" gradientUnits="userSpaceOnUse" x1="140" y1="760" x2="880" y2="260">
            <stop offset="0%" style={{ stopColor: '#0FA8C8' }} />
            <stop offset="26%" style={{ stopColor: '#2BE8FF' }} />
            <stop offset="46%" style={{ stopColor: '#BFF9FF' }} />
            <stop offset="58%" style={{ stopColor: '#FFFFFF' }} />
            <stop offset="70%" style={{ stopColor: '#FFC46B' }} />
            <stop offset="88%" style={{ stopColor: '#FF7A1E' }} />
            <stop offset="100%" style={{ stopColor: '#E64A0B' }} />
          </linearGradient>

          <radialGradient id="jHaloCool" cx="30%" cy="66%" r="52%">
            <stop offset="0%" style={{ stopColor: '#2BE8FF', stopOpacity: .22 }} />
            <stop offset="100%" style={{ stopColor: '#2BE8FF', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jHaloWarm" cx="73%" cy="33%" r="48%">
            <stop offset="0%" style={{ stopColor: '#FF8A2B', stopOpacity: .24 }} />
            <stop offset="100%" style={{ stopColor: '#FF8A2B', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jCoreFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#CFFBFF', stopOpacity: .4 }} />
            <stop offset="40%" style={{ stopColor: '#19D9E8', stopOpacity: .16 }} />
            <stop offset="100%" style={{ stopColor: '#14C9B7', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jHeart" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
            <stop offset="26%" style={{ stopColor: '#CFFBFF', stopOpacity: .75 }} />
            <stop offset="100%" style={{ stopColor: '#19D9E8', stopOpacity: 0 }} />
          </radialGradient>

          <linearGradient id="jSweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: '#2BE8FF', stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: '#2BE8FF', stopOpacity: .38 }} />
          </linearGradient>
          <linearGradient id="jSweepTail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: '#2BE8FF', stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: '#2BE8FF', stopOpacity: .12 }} />
          </linearGradient>

          <radialGradient id="jBloomTeal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
            <stop offset="18%" style={{ stopColor: '#BFF9FF', stopOpacity: .8 }} />
            <stop offset="48%" style={{ stopColor: '#2BE8FF', stopOpacity: .3 }} />
            <stop offset="100%" style={{ stopColor: '#0FA8C8', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jBloomAmber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
            <stop offset="20%" style={{ stopColor: '#FFD9A0', stopOpacity: .75 }} />
            <stop offset="52%" style={{ stopColor: '#FF8A2B', stopOpacity: .28 }} />
            <stop offset="100%" style={{ stopColor: '#E64A0B', stopOpacity: 0 }} />
          </radialGradient>

          {/* Éclats anamorphiques */}
          <linearGradient id="jFlareCool" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: '#2BE8FF', stopOpacity: 0 }} />
            <stop offset="50%" style={{ stopColor: '#DFFCFF', stopOpacity: .85 }} />
            <stop offset="100%" style={{ stopColor: '#2BE8FF', stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id="jFlareWarm" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: '#FF7A1E', stopOpacity: 0 }} />
            <stop offset="50%" style={{ stopColor: '#FFE6C4', stopOpacity: .8 }} />
            <stop offset="100%" style={{ stopColor: '#FF7A1E', stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {/* ── Halos de fond bicolores, statiques ─────────────────────── */}
        <g className="j-add">
          <circle cx={C} cy={C} r="500" fill="url(#jHaloCool)" />
          <circle cx={C} cy={C} r="500" fill="url(#jHaloWarm)" />
        </g>

        {/* ── 01 · Poussière scintillante ──────────────────────────── */}
        <Layer i={0} spin="rot-dust">
          {DUST.map((p) => (
            <circle key={p.key} className="j-dust" cx={p.cx} cy={p.cy} r={p.r} style={{ animationDelay: `${p.d}s` }} />
          ))}
        </Layer>

        {/* ── 02 · Jante extrême ────────────────────────────────── */}
        <Layer i={1} spin="rot-s140">
          <circle className="j-hair" cx={C} cy={C} r="490" strokeDasharray="2 14" />
          {T_RIM.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick j-tick-long' : 'j-tick'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        {/* ── 03 · Graduation fine ──────────────────────────────── */}
        <Layer i={2} spin="rot-s96r">
          <circle className="j-hair" cx={C} cy={C} r="460" />
          {T_FINE.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        {/* ── 04 · Arcs fins extérieurs ─────────────────────────── */}
        <Layer i={3} spin="rot-s72">
          {ARCS_THIN.map((d, i) => <Glow key={i} d={d} cls="j-arc-thin" />)}
        </Layer>

        {/* ── 05 · Blocs de données orbitaux ──────────────────────── */}
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

        {/* ── 06 · Doublure incandescente ────────────────────────── */}
        <Layer i={5} spin="rot-s52r">
          {ARCS_AMBER.map((d, i) => <Glow key={i} d={d} cls="j-arc-amber" />)}
        </Layer>

        {/* ── 07 · Étiquettes tangentielles ──────────────────────── */}
        <Layer i={6} spin="rot-s110r">
          {LABELS.map((l) => (
            <text key={l.key} className="j-tag" transform={`translate(${l.x} ${l.y}) rotate(${l.a})`}>{l.t}</text>
          ))}
        </Layer>

        {/* ── 08 · Anneau à flux ───────────────────────────────── */}
        <Layer i={7} spin="rot-s88">
          <circle className="j-flow" cx={C} cy={C} r="424" />
        </Layer>

        {/* ── 09 · Arcs majeurs (dégradé de température) ─────────────── */}
        <Layer i={8} spin="rot-s44r">
          {ARCS_MAJOR.map((d, i) => <Glow key={i} d={d} cls="j-arc-major" />)}
        </Layer>

        {/* ── 10 · Égaliseur radial ────────────────────────────── */}
        <Layer i={9} spin="rot-s58">
          {BARS.map((b) => (
            <line key={b.key} className="j-bar" x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
              pathLength="1" style={{ animationDelay: `${b.d}s` }} />
          ))}
        </Layer>

        {/* ── 11 · Voile bleu ────────────────────────────────── */}
        <Layer i={10} spin="rot-s120">
          <circle className="j-hair-blue" cx={C} cy={C} r="366" strokeDasharray="3 17" />
          <circle className="j-hair-blue" cx={C} cy={C} r="358" strokeDasharray="140 220" />
        </Layer>

        {/* ── 12 · Peigne dense ───────────────────────────────── */}
        <Layer i={11} spin="rot-s26r">
          {T_COMB.map((t) => (
            <line key={t.key} className="j-comb" x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        {/* ── 13 · Anneau segmenté + accents blancs ────────────────── */}
        <Layer i={12} spin="rot-s30">
          <circle className="j-ring" cx={C} cy={C} r="348" strokeDasharray="196 30 62 30" />
          {ARCS_BRIGHT.map((d, i) => <Glow key={i} d={d} cls="j-arc-bright" />)}
        </Layer>

        {/* ── 14 · Graduation moyenne ──────────────────────────── */}
        <Layer i={13} spin="rot-s40r">
          {T_MID.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        {/* ── 15 · Ruban large extérieur ────────────────────────── */}
        <Layer i={14} spin="rot-s34r">
          {BANDS_OUT.map((d, i) => <Glow key={i} d={d} cls="j-band" />)}
        </Layer>

        {/* ── 16 · Tracés circuit ─────────────────────────────── */}
        <Layer i={15} spin="rot-s76r">
          {TRACES.map((t) => (
            <g key={t.key}>
              <path className="j-trace" d={t.d} />
              <circle className="j-trace-dot" cx={t.cx} cy={t.cy} r="3.2" />
            </g>
          ))}
        </Layer>

        {/* ── 17 · Balayage radar ─────────────────────────────── */}
        <Layer i={16} spin="rot-s9">
          <path className="j-sweep-tail" d={SWEEP_TAIL} fill="url(#jSweepTail)" />
          <path className="j-sweep" d={SWEEP} fill="url(#jSweep)" />
          <line className="j-sweep-edge" x1={C} y1={C} x2={px(310, 30)} y2={py(310, 30)} />
        </Layer>

        {/* ── 18 · Ruban médian ──────────────────────────────── */}
        <Layer i={17} spin="rot-s48">
          {BANDS_MID.map((d, i) => <Glow key={i} d={d} cls="j-band" />)}
        </Layer>

        {/* ── 19 · Blocs internes ─────────────────────────────── */}
        <Layer i={18} spin="rot-s34">
          <circle className="j-hair" cx={C} cy={C} r="300" strokeDasharray="1 11" />
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

        {/* ── 20 · Rayons ──────────────────────────────────── */}
        <Layer i={19} spin="rot-s24r">
          {SPOKES.map((s) => (
            <g key={s.key}>
              <line className="j-spoke" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
              <circle className="j-spoke-dot" cx={s.cx} cy={s.cy} r="2.4" />
            </g>
          ))}
        </Layer>

        {/* ── 21 · Ruban interne ─────────────────────────────── */}
        <Layer i={20} spin="rot-s38r">
          {BANDS_IN.map((d, i) => <Glow key={i} d={d} cls="j-band-thin" />)}
        </Layer>

        {/* ── 22 · Iris à lamelles ────────────────────────────── */}
        <Layer i={21} spin="rot-s80">
          {BLADES.map((b) => <path key={b.key} className="j-blade" d={b.d} />)}
          <circle className="j-hair" cx={C} cy={C} r="232" />
        </Layer>

        {/* ── 23 · Armature polygonale ─────────────────────────── */}
        <Layer i={22} spin="rot-s64r">
          <path className="j-poly" d={poly(216, 12)} />
          <path className="j-poly" d={poly(206, 6, 30)} />
        </Layer>

        {/* ── 24 · Crochets d'angle ───────────────────────────── */}
        <Layer i={23} spin="rot-s46r">
          {BRACKETS.map((b) => <Glow key={b.key} d={b.d} cls="j-bracket" />)}
        </Layer>

        {/* ── 25 · Points de bloom + éclats anamorphiques ────────────── */}
        <Layer i={24} spin="rot-s18">
          <circle className="j-bloom" cx={C + 396} cy={C} r="78" fill="url(#jBloomTeal)" />
          <Flare cx={C + 396} cy={C} w={190} grad="jFlareCool" />
        </Layer>
        <Layer i={24} spin="rot-s27r">
          <circle className="j-bloom" cx={C - 348} cy={C} r="64" fill="url(#jBloomAmber)" />
          <Flare cx={C - 348} cy={C} w={150} grad="jFlareWarm" className="is-slow" />
        </Layer>
        <Layer i={24} spin="rot-s15r">
          <circle className="j-bloom" cx={C} cy={C - 452} r="42" fill="url(#jBloomTeal)" />
          <Flare cx={C} cy={C - 452} w={96} grad="jFlareCool" />
        </Layer>
        <Layer i={24} spin="rot-s62">
          <circle className="j-bloom" cx={C} cy={C + 276} r="52" fill="url(#jBloomAmber)" />
          <Flare cx={C} cy={C + 276} w={120} grad="jFlareWarm" />
        </Layer>

        {/* ── Connecteurs vers les branches ──────────────────────── */}
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

        {/* ── 26 · Noyau ───────────────────────────────────── */}
        <g className="layer" style={{ animationDelay: '1.4s' }}>
          <circle className="j-add" cx={C} cy={C} r="186" fill="url(#jCoreFill)" />
          <circle className="j-ring-halo" cx={C} cy={C} r="186" />
          <circle className="j-ring-bright" cx={C} cy={C} r="186" />
          <circle className="j-hair" cx={C} cy={C} r="172" strokeDasharray="26 9" />
          <circle className="j-pulse" cx={C} cy={C} r="186" />
          <circle className="j-pulse j-pulse-2" cx={C} cy={C} r="186" />
        </g>

        <Layer i={25} spin="rot-s36r">
          <circle className="j-hair" cx={C} cy={C} r="140" strokeDasharray="52 16 9 16" />
          {T_CORE.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>
        <Layer i={25} spin="rot-s20">
          <path className="j-poly-bright" d={poly(104, 3, -90)} />
          <path className="j-poly" d={poly(104, 3, 90)} />
          <circle className="j-hair-blue" cx={C} cy={C} r="92" strokeDasharray="2 12" />
        </Layer>

        {/* ── Cœur incandescent ──────────────────────────────── */}
        <g className="layer" style={{ animationDelay: '1.5s' }}>
          <circle className="j-heart" cx={C} cy={C} r="78" fill="url(#jHeart)" />
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
