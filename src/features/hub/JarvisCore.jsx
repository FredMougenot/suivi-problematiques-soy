import { useMemo } from 'react';

/**
 * JarvisCore — noyau HUD holographique.
 *
 * ══ PRINCIPE VISUEL ═════════════════════════════════════════
 * Le rendu ne tient pas au nombre de traits mais au BLOOM : chaque
 * élément lumineux est dessiné DEUX FOIS — d'abord un halo très épais et
 * très transparent, puis le trait net par-dessus. C'est la technique du
 * bloom « pauvre » : même résultat qu'un filtre de flou, mais composé par
 * le GPU sans recalcul par image — indispensable ici, où 30 groupes
 * tournent en permanence (un feGaussianBlur sur un groupe en rotation
 * force un re-rendu complet à chaque frame et effondre le framerate).
 *
 * Trois niveaux de luminosité, jamais mélangés :
 *   structure (opacité .12–.25) · détail (.3–.5) · accent lumineux (.7–1)
 * Le regard doit pouvoir se poser : si tout brille, plus rien ne brille.
 *
 * ══ CONSTRUCTION ═════════════════════════════════════════════
 * 24 couches concentriques, chacune dans un <g class="layer"> (animation
 * d'apparition échelonnée) contenant un <g class="rot"> (rotation propre).
 * Cette imbrication est obligatoire : deux animations CSS ne peuvent pas
 * co-exister sur un même élément.
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

/** Arc horaire entre deux angles. */
function arc(r, a0, a1) {
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${px(r, a0)} ${py(r, a0)} A ${r} ${r} 0 ${large} 1 ${px(r, a1)} ${py(r, a1)}`;
}

/** Polygone régulier à n côtés. */
function poly(r, n, offset = 0) {
  return (
    Array.from({ length: n }, (_, i) => {
      const a = offset + (i * 360) / n;
      return `${i === 0 ? 'M' : 'L'} ${px(r, a)} ${py(r, a)}`;
    }).join(' ') + ' Z'
  );
}

/** Couronne de graduations. */
function ticks(n, rOut, rIn, longEvery = 0, rInLong = rIn) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i * 360) / n;
    const long = longEvery > 0 && i % longEvery === 0;
    const inner = long ? rInLong : rIn;
    return { key: i, x1: px(inner, a), y1: py(inner, a), x2: px(rOut, a), y2: py(rOut, a), long };
  });
}

/* ── Géométries précalculées (coût nul au rendu) ─────────────────────── */

const T_RIM = ticks(30, 494, 484, 5, 476);
const T_FINE = ticks(120, 466, 460, 10, 450);
const T_MID = ticks(72, 336, 328, 6, 318);
const T_CORE = ticks(36, 126, 120, 3, 112);

const BLOCKS_OUT = Array.from({ length: 30 }, (_, i) => ({
  key: i,
  a: i * 12 + 2,
  r: 432 + (i % 3) * 11,
  w: 4 + ((i * 11) % 26),
  h: i % 4 === 0 ? 8 : 4,
  hot: i % 6 === 0,
  amber: i % 9 === 4,
  d: (i % 7) * 0.55,
}));

const BLOCKS_IN = Array.from({ length: 18 }, (_, i) => ({
  key: i,
  a: i * 20 + 9,
  r: 292,
  w: 3 + ((i * 5) % 14),
  h: 3,
  hot: i % 5 === 2,
  amber: false,
  d: (i % 5) * 0.8,
}));

/** Barres d'égaliseur radial — l'élément le plus « vivant » du noyau. */
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

/** Tracés type circuit imprimé : radial, coude à 45°, palier, pastille. */
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

/** Lamelles d'iris — diaphragme légèrement ouvert. */
const BLADES = Array.from({ length: 18 }, (_, i) => {
  const a = i * 20;
  return {
    key: i,
    d: `M ${px(196, a - 8)} ${py(196, a - 8)} L ${px(228, a - 6)} ${py(228, a - 6)} L ${px(228, a + 6)} ${py(228, a + 6)} L ${px(196, a + 8)} ${py(196, a + 8)} Z`,
  };
});

/** Étiquettes techniques en couronne, orientées tangentiellement. */
const LABELS = [
  'FLUX', 'CAM 04', 'STOCK', 'QUAI 7', 'SYNC', 'LIGNE 2',
  'NETRACK', 'CHARGE', 'TRAX', 'PROB', 'EXPÉD', 'BUFFER',
].map((t, i) => {
  const a = i * 30 + 15;
  return { key: i, t, x: px(414, a), y: py(414, a), a: a + 90 };
});

/** Poussière de points — scintillement de fond. */
const DUST = Array.from({ length: 56 }, (_, i) => {
  const a = (i * 137.5) % 360;
  const r = 150 + ((i * 47) % 340);
  return { key: i, cx: px(r, a), cy: py(r, a), r: i % 5 === 0 ? 2.6 : 1.5, d: ((i * 19) % 40) * 0.14 };
});

/** Crochets d'angle autour du noyau. */
const BRACKETS = [-60, 30, 120, 210].map((a, i) => ({ key: i, d: arc(192, a, a + 26) }));

const SWEEP = `M ${C} ${C} L ${px(310, -30)} ${py(310, -30)} A 310 310 0 0 1 ${px(310, 30)} ${py(310, 30)} Z`;
const SWEEP_TAIL = `M ${C} ${C} L ${px(310, 30)} ${py(310, 30)} A 310 310 0 0 1 ${px(310, 96)} ${py(310, 96)} Z`;

const ARCS_MAJOR = [arc(396, -86, -18), arc(396, 6, 72), arc(396, 104, 166), arc(396, 190, 258)];
const ARCS_AMBER = [arc(410, -56, 22), arc(384, 44, 88), arc(424, 100, 128)];
const ARCS_BRIGHT = [arc(348, -72, -24), arc(348, 128, 176), arc(348, 46, 68)];
const ARCS_THIN = [arc(452, -140, -40), arc(452, 20, 130)];

/** Halo + trait net : le doublage qui produit le bloom. */
function Glow({ d, cls }) {
  return (
    <>
      <path className={`${cls}-halo`} d={d} />
      <path className={cls} d={d} />
    </>
  );
}

/** Une couche = apparition échelonnée (layer) + rotation propre (rot). */
function Layer({ i, spin, children }) {
  return (
    <g className="layer" style={{ animationDelay: `${(i * 0.055).toFixed(2)}s` }}>
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
          <radialGradient id="jHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: 'var(--copper)', stopOpacity: .16 }} />
            <stop offset="45%" style={{ stopColor: 'var(--sapphire)', stopOpacity: .09 }} />
            <stop offset="100%" style={{ stopColor: 'var(--copper)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jHaloAmber" cx="74%" cy="38%" r="42%">
            <stop offset="0%" style={{ stopColor: 'var(--amber)', stopOpacity: .17 }} />
            <stop offset="100%" style={{ stopColor: 'var(--amber)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jCoreFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: 'var(--copper-pale)', stopOpacity: .3 }} />
            <stop offset="42%" style={{ stopColor: 'var(--copper)', stopOpacity: .12 }} />
            <stop offset="100%" style={{ stopColor: 'var(--copper)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jHeart" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: .95 }} />
            <stop offset="30%" style={{ stopColor: 'var(--copper-pale)', stopOpacity: .6 }} />
            <stop offset="100%" style={{ stopColor: 'var(--copper)', stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id="jSweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--copper)', stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: 'var(--copper)', stopOpacity: .34 }} />
          </linearGradient>
          <linearGradient id="jSweepTail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--copper)', stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: 'var(--copper)', stopOpacity: .1 }} />
          </linearGradient>
          <radialGradient id="jBloomTeal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: .9 }} />
            <stop offset="22%" style={{ stopColor: 'var(--copper-pale)', stopOpacity: .6 }} />
            <stop offset="55%" style={{ stopColor: 'var(--copper)', stopOpacity: .22 }} />
            <stop offset="100%" style={{ stopColor: 'var(--copper)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jBloomAmber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFF1DC', stopOpacity: .92 }} />
            <stop offset="25%" style={{ stopColor: '#FFC978', stopOpacity: .55 }} />
            <stop offset="100%" style={{ stopColor: 'var(--amber)', stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        {/* ── Halos de fond (statiques, asymétriques) ─────────────────── */}
        <circle cx={C} cy={C} r="496" fill="url(#jHalo)" />
        <circle cx={C} cy={C} r="496" fill="url(#jHaloAmber)" />

        {/* ── 01 · Poussière scintillante ───────────────────────────── */}
        <Layer i={0} spin="rot-dust">
          {DUST.map((p) => (
            <circle key={p.key} className="j-dust" cx={p.cx} cy={p.cy} r={p.r} style={{ animationDelay: `${p.d}s` }} />
          ))}
        </Layer>

        {/* ── 02 · Jante extrême ─────────────────────────────────── */}
        <Layer i={1} spin="rot-s140">
          <circle className="j-hair" cx={C} cy={C} r="490" strokeDasharray="2 14" />
          {T_RIM.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick j-tick-long' : 'j-tick'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        {/* ── 03 · Graduation fine ───────────────────────────────── */}
        <Layer i={2} spin="rot-s96r">
          <circle className="j-hair" cx={C} cy={C} r="460" />
          {T_FINE.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        {/* ── 04 · Arcs fins extérieurs ───────────────────────────── */}
        <Layer i={3} spin="rot-s72">
          {ARCS_THIN.map((d, i) => <Glow key={i} d={d} cls="j-arc-thin" />)}
        </Layer>

        {/* ── 05 · Blocs de données orbitaux ───────────────────────── */}
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

        {/* ── 06 · Doublure ambre ───────────────────────────────── */}
        <Layer i={5} spin="rot-s52r">
          {ARCS_AMBER.map((d, i) => <Glow key={i} d={d} cls="j-arc-amber" />)}
        </Layer>

        {/* ── 07 · Étiquettes tangentielles ───────────────────────── */}
        <Layer i={6} spin="rot-s110r">
          {LABELS.map((l) => (
            <text key={l.key} className="j-tag" transform={`translate(${l.x} ${l.y}) rotate(${l.a})`}>{l.t}</text>
          ))}
        </Layer>

        {/* ── 08 · Anneau à flux ────────────────────────────────── */}
        <Layer i={7} spin="rot-s88">
          <circle className="j-flow" cx={C} cy={C} r="424" />
        </Layer>

        {/* ── 09 · Arcs majeurs ────────────────────────────────── */}
        <Layer i={8} spin="rot-s44r">
          {ARCS_MAJOR.map((d, i) => <Glow key={i} d={d} cls="j-arc-major" />)}
        </Layer>

        {/* ── 10 · Égaliseur radial ─────────────────────────────── */}
        <Layer i={9} spin="rot-s58">
          {BARS.map((b) => (
            <line key={b.key} className="j-bar" x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
              pathLength="1" style={{ animationDelay: `${b.d}s` }} />
          ))}
        </Layer>

        {/* ── 11 · Voile bleu ─────────────────────────────────── */}
        <Layer i={10} spin="rot-s120">
          <circle className="j-hair-blue" cx={C} cy={C} r="366" strokeDasharray="3 17" />
          <circle className="j-hair-blue" cx={C} cy={C} r="358" strokeDasharray="140 220" />
        </Layer>

        {/* ── 12 · Anneau segmenté + accents ──────────────────────── */}
        <Layer i={11} spin="rot-s30">
          <circle className="j-ring" cx={C} cy={C} r="348" strokeDasharray="196 30 62 30" />
          {ARCS_BRIGHT.map((d, i) => <Glow key={i} d={d} cls="j-arc-bright" />)}
        </Layer>

        {/* ── 13 · Graduation moyenne ───────────────────────────── */}
        <Layer i={12} spin="rot-s40r">
          {T_MID.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>

        {/* ── 14 · Tracés circuit ──────────────────────────────── */}
        <Layer i={13} spin="rot-s76r">
          {TRACES.map((t) => (
            <g key={t.key}>
              <path className="j-trace" d={t.d} />
              <circle className="j-trace-dot" cx={t.cx} cy={t.cy} r="3.2" />
            </g>
          ))}
        </Layer>

        {/* ── 15 · Balayage radar (halo + traîne + arête) ─────────────── */}
        <Layer i={14} spin="rot-s9">
          <path className="j-sweep-tail" d={SWEEP_TAIL} fill="url(#jSweepTail)" />
          <path className="j-sweep" d={SWEEP} fill="url(#jSweep)" />
          <line className="j-sweep-edge" x1={C} y1={C} x2={px(310, 30)} y2={py(310, 30)} />
        </Layer>

        {/* ── 16 · Blocs internes ──────────────────────────────── */}
        <Layer i={15} spin="rot-s34">
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

        {/* ── 17 · Rayons ───────────────────────────────────── */}
        <Layer i={16} spin="rot-s24r">
          {SPOKES.map((s) => (
            <g key={s.key}>
              <line className="j-spoke" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
              <circle className="j-spoke-dot" cx={s.cx} cy={s.cy} r="2.4" />
            </g>
          ))}
        </Layer>

        {/* ── 18 · Iris à lamelles ─────────────────────────────── */}
        <Layer i={17} spin="rot-s80">
          {BLADES.map((b) => <path key={b.key} className="j-blade" d={b.d} />)}
          <circle className="j-hair" cx={C} cy={C} r="232" />
        </Layer>

        {/* ── 19 · Armature polygonale ─────────────────────────── */}
        <Layer i={18} spin="rot-s64r">
          <path className="j-poly" d={poly(216, 12)} />
          <path className="j-poly" d={poly(206, 6, 30)} />
        </Layer>

        {/* ── 20 · Crochets d'angle ────────────────────────────── */}
        <Layer i={19} spin="rot-s46r">
          {BRACKETS.map((b) => <Glow key={b.key} d={b.d} cls="j-bracket" />)}
        </Layer>

        {/* ── 21 · Points de bloom en orbite ──────────────────────── */}
        <Layer i={20} spin="rot-s18">
          <circle className="j-bloom" cx={C + 396} cy={C} r="54" fill="url(#jBloomTeal)" />
          <circle className="j-bloom-core" cx={C + 396} cy={C} r="3.4" />
        </Layer>
        <Layer i={20} spin="rot-s27r">
          <circle className="j-bloom" cx={C - 348} cy={C} r="44" fill="url(#jBloomAmber)" />
          <circle className="j-bloom-core is-amber" cx={C - 348} cy={C} r="3" />
        </Layer>
        <Layer i={20} spin="rot-s15r">
          <circle className="j-bloom" cx={C} cy={C - 452} r="30" fill="url(#jBloomTeal)" />
        </Layer>

        {/* ── Connecteurs vers les branches ───────────────────────── */}
        <g className="layer" style={{ animationDelay: '1.25s' }}>
          {geo.map((b) => (
            <g key={`link-${b.id}`}>
              <line className={`j-link-halo${activeId === b.id ? ' is-hot' : ''}`} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />
              <line className={`j-link${activeId === b.id ? ' is-hot' : ''}`} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />
              <circle className={`j-node-dot${activeId === b.id ? ' is-hot' : ''}`} cx={b.x2} cy={b.y2} r="6" />
              <circle className={`j-node-pip${activeId === b.id ? ' is-hot' : ''}`} cx={b.mx} cy={b.my} r="2.6" />
            </g>
          ))}
        </g>

        {/* ── 22 · Noyau ────────────────────────────────────── */}
        <g className="layer" style={{ animationDelay: '1.35s' }}>
          <circle cx={C} cy={C} r="186" fill="url(#jCoreFill)" />
          <circle className="j-ring-halo" cx={C} cy={C} r="186" />
          <circle className="j-ring" cx={C} cy={C} r="186" />
          <circle className="j-hair" cx={C} cy={C} r="172" strokeDasharray="26 9" />
          <circle className="j-pulse" cx={C} cy={C} r="186" />
          <circle className="j-pulse j-pulse-2" cx={C} cy={C} r="186" />
        </g>

        <Layer i={23} spin="rot-s36r">
          <circle className="j-hair" cx={C} cy={C} r="140" strokeDasharray="52 16 9 16" />
          {T_CORE.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </Layer>
        <Layer i={23} spin="rot-s20">
          <path className="j-poly-bright" d={poly(104, 3, -90)} />
          <path className="j-poly" d={poly(104, 3, 90)} />
          <circle className="j-hair-blue" cx={C} cy={C} r="92" strokeDasharray="2 12" />
        </Layer>

        {/* ── Cœur ────────────────────────────────────────── */}
        <g className="layer" style={{ animationDelay: '1.5s' }}>
          <circle className="j-heart" cx={C} cy={C} r="64" fill="url(#jHeart)" />
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
