import { useMemo } from 'react';

/**
 * JarvisCore — noyau holographique HUD.
 *
 * Construction en couches concentriques, de l'extérieur vers le centre.
 * Chaque couche tourne à sa propre vitesse et dans son propre sens : c'est
 * la superposition de ces vitesses (140 s → 9 s) qui donne la sensation de
 * profondeur mécanique, jamais une seule rotation rapide.
 *
 *   halo · couronne 478 · graduation 452 · blocs de données 425
 *   arcs majeurs 386 · anneau segmenté 344 · balayage radar 300
 *   rayons 282 · iris à lamelles 240 · noyau 178 · cœur 8
 *
 * Tout est généré paramétriquement : changer une constante suffit à
 * redéfinir une couronne entière. Les cartes de branche restent en HTML
 * par-dessus le SVG (backdrop-filter impossible en SVG).
 *
 * Repère : viewBox 0 0 1000 1000, centre (500, 500), angles en degrés
 * avec y vers le bas (0° = droite, -90° = haut).
 */

const C = 500;
const R_LINK_IN = 190;
const R_LINK_OUT = 330;
const R_BRANCH_PCT = 38;

const pt = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [C + Math.cos(a) * r, C + Math.sin(a) * r];
};
const f = (n) => Math.round(n * 10) / 10;

/** Arc de cercle (sens horaire) entre deux angles. */
function arc(r, a0, a1) {
  const [x0, y0] = pt(r, a0);
  const [x1, y1] = pt(r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${f(x0)} ${f(y0)} A ${r} ${r} 0 ${large} 1 ${f(x1)} ${f(y1)}`;
}

/** Couronne de graduations : n traits radiaux, les multiples de `long` plus profonds. */
function ticks(n, rOut, rIn, longEvery, rInLong) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i * 360) / n;
    const inner = longEvery && i % longEvery === 0 ? rInLong : rIn;
    const [x1, y1] = pt(inner, a);
    const [x2, y2] = pt(rOut, a);
    return { key: i, x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2), long: longEvery ? i % longEvery === 0 : false };
  });
}

const TICKS_OUTER = ticks(24, 478, 462, 6, 452);
const TICKS_FINE = ticks(96, 452, 444, 8, 434);
const TICKS_MID = ticks(36, 342, 330, 3, 322);

/** Blocs de données orbitaux — les petits rectangles du HUD. */
const BLOCKS = Array.from({ length: 22 }, (_, i) => ({
  key: i,
  a: i * (360 / 22) + 3,
  r: 400 + (i % 3) * 10,
  w: 5 + ((i * 7) % 24),
  h: i % 4 === 0 ? 7 : 4,
  hot: i % 5 === 0,
  amber: i % 7 === 3,
  delay: (i % 6) * 0.7,
}));

/** Rayons courts entre l'iris et l'anneau segmenté. */
const SPOKES = Array.from({ length: 12 }, (_, i) => {
  const a = i * 30 + 15;
  const [x1, y1] = pt(252, a);
  const [x2, y2] = pt(284, a);
  const [dx, dy] = pt(288, a);
  return { key: i, x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2), dx: f(dx), dy: f(dy) };
});

/** Lamelles d'iris — trapèzes légèrement ouverts, comme un diaphragme. */
const BLADES = Array.from({ length: 12 }, (_, i) => {
  const a = i * 30;
  const [x1, y1] = pt(206, a - 11);
  const [x2, y2] = pt(242, a - 8);
  const [x3, y3] = pt(242, a + 8);
  const [x4, y4] = pt(206, a + 11);
  return {
    key: i,
    d: `M ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)} L ${f(x3)} ${f(y3)} L ${f(x4)} ${f(y4)} Z`,
  };
});

/** Arcs épais principaux + doublure ambre asymétrique. */
const ARCS_MAJOR = [
  arc(386, -84, -16),
  arc(386, 8, 74),
  arc(386, 106, 164),
  arc(386, 192, 256),
];
const ARCS_AMBER = [arc(398, -52, 26), arc(370, 40, 86)];
const ARCS_BRIGHT = [arc(344, -70, -22), arc(344, 130, 178)];

const SWEEP = (() => {
  const [x1, y1] = pt(304, -26);
  const [x2, y2] = pt(304, 26);
  return `M ${C} ${C} L ${f(x1)} ${f(y1)} A 304 304 0 0 1 ${f(x2)} ${f(y2)} Z`;
})();
const SWEEP_EDGE = (() => {
  const [x, y] = pt(304, 26);
  return { x: f(x), y: f(y) };
})();

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
      branches.map((b) => {
        const rad = (b.angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return {
          ...b,
          x1: f(C + cos * R_LINK_IN),
          y1: f(C + sin * R_LINK_IN),
          x2: f(C + cos * R_LINK_OUT),
          y2: f(C + sin * R_LINK_OUT),
          left: 50 + cos * R_BRANCH_PCT,
          top: 50 + sin * R_BRANCH_PCT,
        };
      }),
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
            <stop offset="0%" style={{ stopColor: 'var(--copper)', stopOpacity: 0.13 }} />
            <stop offset="55%" style={{ stopColor: 'var(--sapphire)', stopOpacity: 0.07 }} />
            <stop offset="100%" style={{ stopColor: 'var(--copper)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jCoreFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: 'var(--copper)', stopOpacity: 0.22 }} />
            <stop offset="70%" style={{ stopColor: 'var(--copper)', stopOpacity: 0.05 }} />
            <stop offset="100%" style={{ stopColor: 'var(--copper)', stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id="jSweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--copper)', stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: 'var(--copper)', stopOpacity: 0.3 }} />
          </linearGradient>
          <radialGradient id="jBloomTeal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: 'var(--copper-pale)', stopOpacity: 0.95 }} />
            <stop offset="35%" style={{ stopColor: 'var(--copper)', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: 'var(--copper)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="jBloomAmber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#FFD9A0', stopOpacity: 0.9 }} />
            <stop offset="35%" style={{ stopColor: 'var(--amber)', stopOpacity: 0.45 }} />
            <stop offset="100%" style={{ stopColor: 'var(--amber)', stopOpacity: 0 }} />
          </radialGradient>
          <filter id="jGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="9" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Halo diffus, statique ── */}
        <circle className="j-halo" cx={C} cy={C} r="470" fill="url(#jHalo)" />

        {/* ── Couronne extrême ── */}
        <g className="rot rot-outer">
          <circle className="j-hair" cx={C} cy={C} r="470" strokeDasharray="2 12" />
          {TICKS_OUTER.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick j-tick-long' : 'j-tick'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </g>

        {/* ── Graduation fine, contra-rotative ── */}
        <g className="rot rot-grad">
          <circle className="j-hair" cx={C} cy={C} r="444" />
          {TICKS_FINE.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </g>

        {/* ── Blocs de données orbitaux ── */}
        <g className="rot rot-blocks">
          {BLOCKS.map((b) => (
            <rect
              key={b.key}
              className={`j-block${b.hot ? ' is-hot' : ''}${b.amber ? ' is-amber' : ''}`}
              transform={`translate(${C} ${C}) rotate(${f(b.a)})`}
              x={b.r}
              y={-b.h / 2}
              width={b.w}
              height={b.h}
              rx="1"
              style={{ animationDelay: `${b.delay}s` }}
            />
          ))}
        </g>

        {/* ── Arcs épais + doublure ambre ── */}
        <g className="rot rot-heavy">
          {ARCS_MAJOR.map((d, i) => (
            <path key={`M${i}`} className="j-arc-major" d={d} />
          ))}
          {ARCS_AMBER.map((d, i) => (
            <path key={`A${i}`} className="j-arc-amber" d={d} />
          ))}
          <circle className="j-hair-blue" cx={C} cy={C} r="372" strokeDasharray="3 15" />
        </g>

        {/* ── Anneau segmenté + graduation moyenne ── */}
        <g className="rot rot-mid">
          <circle className="j-ring" cx={C} cy={C} r="344" strokeDasharray="190 34 58 34" />
          {ARCS_BRIGHT.map((d, i) => (
            <path key={`B${i}`} className="j-arc-bright" d={d} />
          ))}
          {TICKS_MID.map((t) => (
            <line key={t.key} className={t.long ? 'j-tick-fine j-tick-long' : 'j-tick-fine'} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </g>

        {/* ── Balayage radar ── */}
        <g className="rot rot-sweep">
          <path className="j-sweep" d={SWEEP} fill="url(#jSweep)" />
          <line className="j-sweep-edge" x1={C} y1={C} x2={SWEEP_EDGE.x} y2={SWEEP_EDGE.y} />
        </g>

        {/* ── Rayons internes ── */}
        <g className="rot rot-inner">
          <circle className="j-hair" cx={C} cy={C} r="300" strokeDasharray="1 9" />
          {SPOKES.map((s) => (
            <g key={s.key}>
              <line className="j-spoke" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
              <circle className="j-spoke-dot" cx={s.dx} cy={s.dy} r="2.4" />
            </g>
          ))}
        </g>

        {/* ── Iris à lamelles ── */}
        <g className="rot rot-iris">
          {BLADES.map((b) => (
            <path key={b.key} className="j-blade" d={b.d} />
          ))}
          <circle className="j-hair" cx={C} cy={C} r="246" />
        </g>

        {/* ── Points de bloom en orbite ── */}
        <g className="rot rot-orbit-a">
          <circle className="j-bloom" cx={C + 386} cy={C} r="30" fill="url(#jBloomTeal)" filter="url(#jGlow)" />
        </g>
        <g className="rot rot-orbit-b">
          <circle className="j-bloom" cx={C - 344} cy={C} r="24" fill="url(#jBloomAmber)" filter="url(#jGlow)" />
        </g>

        {/* ── Connecteurs vers les branches ── */}
        {geo.map((b) => (
          <line
            key={`link-${b.id}`}
            className={`j-link${activeId === b.id ? ' is-hot' : ''}`}
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
          />
        ))}
        {geo.map((b) => (
          <circle
            key={`dot-${b.id}`}
            className={`j-node-dot${activeId === b.id ? ' is-hot' : ''}`}
            cx={b.x2}
            cy={b.y2}
            r="6"
          />
        ))}

        {/* ── Noyau ── */}
        <circle cx={C} cy={C} r="178" fill="url(#jCoreFill)" />
        <circle className="j-ring" cx={C} cy={C} r="178" />
        <circle className="j-hair" cx={C} cy={C} r="166" strokeDasharray="22 8" />
        <circle className="j-pulse" cx={C} cy={C} r="178" />
        <g className="rot rot-corein">
          <circle className="j-hair" cx={C} cy={C} r="128" strokeDasharray="46 14 8 14" />
          <circle className="j-hair-blue" cx={C} cy={C} r="112" strokeDasharray="2 10" />
        </g>

        <text className="j-label" x={C} y="478">SOY</text>
        <text className="j-sublabel" x={C} y="522">EXPÉDITION</text>
        {clock ? <text className="j-clock" x={C} y="572">{clock}</text> : null}

        <text className="j-micro" x="190" y="504">SYS · NOMINAL</text>
        <text className="j-micro" x="810" y="504">LINK · ACTIF</text>
      </svg>

      {geo.map((b) => {
        const value = kpis[b.id];
        return (
          <button
            key={b.id}
            type="button"
            className="jbranch"
            style={{ left: `${b.left}%`, top: `${b.top}%` }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(b.id);
            }}
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
