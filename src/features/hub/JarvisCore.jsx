import { useMemo } from 'react';

/**
 * JarvisCore — noyau holographique et ses branches connectées.
 *
 * Le SVG (viewBox 0 0 1000 1000) porte les anneaux et les connecteurs ;
 * les cartes de branche sont des boutons HTML positionnés en pourcentage
 * par-dessus, ce qui autorise backdrop-filter et ombres (impossible en SVG).
 *
 * Géométrie (unités viewBox) :
 *   noyau r=175 · connecteurs de r=190 à r=330 · cartes ancrées à 38% du conteneur
 */

const R_LINK_IN = 190;
const R_LINK_OUT = 330;
const R_BRANCH_PCT = 38;

const TICKS = Array.from({ length: 48 }, (_, i) => {
  const rad = (i * 7.5 * Math.PI) / 180;
  const r1 = i % 4 === 0 ? 394 : 404;
  return {
    key: i,
    x1: 500 + Math.cos(rad) * r1,
    y1: 500 + Math.sin(rad) * r1,
    x2: 500 + Math.cos(rad) * 418,
    y2: 500 + Math.sin(rad) * 418,
  };
});

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
          x1: 500 + cos * R_LINK_IN,
          y1: 500 + sin * R_LINK_IN,
          x2: 500 + cos * R_LINK_OUT,
          y2: 500 + sin * R_LINK_OUT,
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
        {/* Couronne graduée, rotation très lente */}
        <g className="ring-c">
          <circle className="j-stroke-dim" cx="500" cy="500" r="440" />
          {TICKS.map((t) => (
            <line key={t.key} className="j-tick" x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </g>

        {/* Anneau principal segmenté */}
        <g className="ring-a">
          <circle className="j-stroke" cx="500" cy="500" r="360" strokeDasharray="90 26 14 26" />
          <circle className="j-stroke-blue" cx="500" cy="500" r="344" strokeDasharray="4 18" />
        </g>

        {/* Anneau interne contra-rotatif + arcs */}
        <g className="ring-b">
          <circle className="j-stroke-dim" cx="500" cy="500" r="270" strokeDasharray="200 60" />
          <path className="j-stroke" d="M 500 275 A 225 225 0 0 1 659 341" strokeLinecap="round" />
          <path className="j-stroke" d="M 500 725 A 225 225 0 0 1 341 659" strokeLinecap="round" />
        </g>

        {/* Connecteurs vers les branches */}
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

        {/* Noyau */}
        <circle className="j-core-fill" cx="500" cy="500" r="175" />
        <circle className="j-stroke" cx="500" cy="500" r="175" />
        <circle className="j-pulse" cx="500" cy="500" r="175" />
        <text className="j-label" x="500" y="478">SOY</text>
        <text className="j-sublabel" x="500" y="522">EXPÉDITION</text>
        {clock ? <text className="j-clock" x="500" y="572">{clock}</text> : null}
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
