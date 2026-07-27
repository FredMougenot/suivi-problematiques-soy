import { HUB_BRANCHES, HUB_KPIS } from './hubConfig';
import './hubPanels.css';

/**
 * HubPanels — les deux rails latéraux : raccourcis + fenêtres KPI.
 *
 * ══ STRUCTURE EN TROIS NIVEAUX — NE PAS APLATIR ════════════════════
 *   .hud-slot   conteneur NON rogné — porte la trace et l'entrée/sortie
 *     .hud-panel  cadre biseauté (clip-path) — fait office de bordure
 *       .hud-in     intérieur sombre, même biseau réduit d'1px
 *     .hud-trace  segment + coude à 30° + pastille, vers le noyau
 *
 * La trace est SŒUR du panneau : un clip-path rogne tous les descendants,
 * y compris ce qui dépasse volontairement.
 *
 * ══ DEUX VARIABLES VENUES DU JS ═══════════════════════════════
 *   --i    rang du slot → échelonne l'apparition après le noyau
 *   --dir  +1 / −1 → sens du coude. Les panneaux du haut cassent vers le
 *          BAS, ceux du bas vers le HAUT : la trace converge toujours vers
 *          le centre du cercle. Sans ça, les traces divergeraient et le
 *          faisceau perdrait son point de fuite.
 * CSS ne sait ni compter ses frères ni connaître sa position dans un calc().
 */

function Trace({ delay }) {
  return (
    <span className="hud-trace" aria-hidden="true" style={{ animationDelay: `${delay}s` }}>
      <span className="hud-trace-line" />
      <span className="hud-trace-elbow" />
      <span className="hud-trace-node" />
    </span>
  );
}

/** Bloc chiffré, plaqué contre le bord intérieur — côté noyau. */
function Metric({ value, unit, compact = false }) {
  return (
    <span className="hud-metric">
      <span className={`hud-value${compact ? ' is-compact' : ''}${value == null ? ' is-idle' : ''}`}>
        {value == null ? '—' : value}
      </span>
      <span className="hud-unit">{unit}</span>
    </span>
  );
}

function Shortcut({ branch, num, value, active, onSelect, delay, rank, dir }) {
  return (
    <div className="hud-slot" style={{ '--i': rank, '--dir': dir }}>
      <button
        type="button"
        className={`hud-panel hud-shortcut${active ? ' is-active' : ''}`}
        style={{ animationDelay: `${delay}s` }}
        onClick={() => onSelect(branch.id)}
      >
        <span className="hud-in">
          <span className="hud-head">
            <span className="hud-num">{num}</span>
            <span className="hud-title">{branch.title}</span>
            <span className="hud-icon" aria-hidden="true">{branch.icon}</span>
          </span>

          <Metric value={value} unit={branch.unit} />

          <span className="hud-rule" aria-hidden="true">
            <span className="hud-rule-fill" />
          </span>

          <span className="hud-scan" aria-hidden="true" />
        </span>
      </button>

      <Trace delay={delay + 0.2} />
    </div>
  );
}

function KpiWindow({ kpi, num, value, delay, rank, dir }) {
  return (
    <div className="hud-slot" style={{ '--i': rank, '--dir': dir }}>
      <div className="hud-panel hud-kpi" style={{ animationDelay: `${delay}s` }}>
        <span className="hud-in">
          <span className="hud-head">
            <span className="hud-num is-dim">{num}</span>
            <span className="hud-title is-small">{kpi.title}</span>
            {kpi.trend ? (
              <span className={`hud-trend is-${kpi.trend}`} aria-hidden="true">
                {kpi.trend === 'up' ? '▲' : '▼'}
              </span>
            ) : null}
          </span>

          <span className="hud-kpi-body">
            <span className="hud-bars" aria-hidden="true">
              {kpi.bars.map((h, i) => (
                <span
                  key={i}
                  className="hud-bar"
                  style={{ height: `${Math.round(h * 100)}%`, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </span>
            <Metric value={value ?? kpi.fake} unit={kpi.unit} compact />
          </span>
        </span>
      </div>

      <Trace delay={delay + 0.2} />
    </div>
  );
}

export default function HubPanels({ kpis = {}, activeId = null, hidden = false, onSelect }) {
  return (
    <>
      {['left', 'right'].map((side) => {
        const shortcuts = HUB_BRANCHES.filter((b) => b.side === side);
        const windows = HUB_KPIS.filter((k) => k.side === side);
        const total = shortcuts.length + windows.length;

        // Moitié haute : le coude descend. Moitié basse : il monte.
        const sens = (rang) => (rang < total / 2 ? 1 : -1);

        return (
          <div key={side} className={`hub-rail is-${side}${hidden ? ' is-hidden' : ''}`}>
            {shortcuts.map((b, i) => (
              <Shortcut
                key={b.id}
                branch={b}
                num={String(HUB_BRANCHES.indexOf(b) + 1).padStart(2, '0')}
                value={kpis[b.id]}
                active={activeId === b.id}
                onSelect={onSelect}
                rank={i}
                dir={sens(i)}
                delay={1.7 + i * 0.1}
              />
            ))}

            {windows.map((k, i) => {
              const rang = shortcuts.length + i;
              return (
                <KpiWindow
                  key={k.id}
                  kpi={k}
                  num={String(HUB_KPIS.indexOf(k) + 5).padStart(2, '0')}
                  value={kpis[k.id]}
                  rank={rang}
                  dir={sens(rang)}
                  delay={1.7 + rang * 0.1}
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
}
