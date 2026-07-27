import { HUB_BRANCHES, HUB_KPIS } from './hubConfig';
import './hubPanels.css';

/**
 * HubPanels — les deux rails latéraux : raccourcis + fenêtres KPI.
 *
 * ══ POURQUOI LATÉRAL ════════════════════════════════════════
 * Les panneaux ne recouvrent plus le noyau : ils s'alignent en colonnes
 * aux deux bords, et une trace horizontale les relie au cercle. C'est la
 * grammaire des vrais HUD — la donnée vit en périphérie, le centre reste
 * lisible. Un panneau posé sur l'animation détruit les deux.
 *
 * ══ LA TRACE ══════════════════════════════════════════════
 * Trois éléments : un segment horizontal, un coude à 45°, une pastille
 * terminale qui pulse. Tout est en CSS positionné, pas en SVG : la trace
 * doit s'étirer avec la largeur de la fenêtre, ce qu'un viewBox fixe ne
 * sait pas faire sans se déformer.
 *
 * Les composants sont purement présentationnels : aucune requête, aucun
 * état. Les valeurs arrivent par `kpis`, la navigation par `onSelect`.
 */

function Trace({ index }) {
  return (
    <span className="hud-trace" aria-hidden="true" style={{ animationDelay: `${1.5 + index * 0.09}s` }}>
      <span className="hud-trace-line" />
      <span className="hud-trace-elbow" />
      <span className="hud-trace-node" />
    </span>
  );
}

function Shortcut({ branch, num, value, active, onSelect, delay }) {
  return (
    <button
      type="button"
      className={`hud-panel hud-shortcut${active ? ' is-active' : ''}`}
      style={{ animationDelay: `${delay}s` }}
      onClick={() => onSelect(branch.id)}
    >
      <span className="hud-head">
        <span className="hud-num">{num}</span>
        <span className="hud-title">{branch.title}</span>
        <span className="hud-icon" aria-hidden="true">{branch.icon}</span>
      </span>
      <span className="hud-value-row">
        <span className={`hud-value${value == null ? ' is-idle' : ''}`}>
          {value == null ? '—' : value}
        </span>
        <span className="hud-unit">{branch.unit}</span>
      </span>
      <span className="hud-scan" aria-hidden="true" />
      <Trace index={num} />
    </button>
  );
}

function KpiWindow({ kpi, num, value, delay }) {
  return (
    <div className="hud-panel hud-kpi" style={{ animationDelay: `${delay}s` }}>
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
            <span key={i} className="hud-bar" style={{ height: `${Math.round(h * 100)}%`, animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
        <span className="hud-kpi-figures">
          <span className={`hud-value is-compact${value == null ? ' is-idle' : ''}`}>
            {value == null ? '—' : value}
          </span>
          <span className="hud-unit">{kpi.unit}</span>
        </span>
      </span>
    </div>
  );
}

export default function HubPanels({ kpis = {}, activeId = null, hidden = false, onSelect }) {
  const sides = ['left', 'right'];

  return (
    <>
      {sides.map((side) => {
        const shortcuts = HUB_BRANCHES.filter((b) => b.side === side);
        const windows = HUB_KPIS.filter((k) => k.side === side);

        return (
          <div key={side} className={`hub-rail is-${side}${hidden ? ' is-hidden' : ''}`}>
            {shortcuts.map((b, i) => {
              const num = HUB_BRANCHES.indexOf(b) + 1;
              return (
                <Shortcut
                  key={b.id}
                  branch={b}
                  num={String(num).padStart(2, '0')}
                  value={kpis[b.id]}
                  active={activeId === b.id}
                  onSelect={onSelect}
                  delay={1.35 + i * 0.1}
                />
              );
            })}

            {windows.map((k, i) => (
              <KpiWindow
                key={k.id}
                kpi={k}
                num={String(HUB_KPIS.indexOf(k) + 5).padStart(2, '0')}
                value={kpis[k.id]}
                delay={1.6 + i * 0.1}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}
