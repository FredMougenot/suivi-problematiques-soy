import { HUB_BRANCHES, HUB_KPIS } from './hubConfig';
import './hubPanels.css';

/**
 * HubPanels — les deux rails latéraux : raccourcis + fenêtres KPI.
 *
 * ══ STRUCTURE EN TROIS NIVEAUX — NE PAS APLATIR ════════════════════
 *   .hud-slot   conteneur NON rogné — porte la trace de jonction
 *     .hud-panel  cadre biseauté (clip-path) — fait office de bordure
 *       .hud-in     intérieur sombre, même biseau réduit d'1px
 *     .hud-trace  segment + coude + pastille, vers le noyau
 *
 * La trace est SŒUR du panneau, pas enfant : un clip-path rogne tous les
 * descendants, y compris ce qui dépasse volontairement. C'est pour ça
 * qu'elle était invisible — elle existait, elle était coupée.
 *
 * Le double biseau (.hud-panel coloré + .hud-in sombre à 1px) reconstitue
 * une bordure qui suit la forme : clip-path supprime les bordures CSS, donc
 * on empile deux formes identiques décalées d'un pixel.
 *
 * Composants purement présentationnels : aucune requête, aucun état. Les
 * valeurs arrivent par `kpis`, la navigation par `onSelect`.
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

function Shortcut({ branch, num, value, active, onSelect, delay }) {
  return (
    <div className="hud-slot">
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

          <span className="hud-value-row">
            <span className={`hud-value${value == null ? ' is-idle' : ''}`}>
              {value == null ? '—' : value}
            </span>
            <span className="hud-unit">{branch.unit}</span>
          </span>

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

function KpiWindow({ kpi, num, value, delay }) {
  return (
    <div className="hud-slot">
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
            <span className="hud-kpi-figures">
              <span className={`hud-value is-compact${value == null ? ' is-idle' : ''}`}>
                {value == null ? '—' : value}
              </span>
              <span className="hud-unit">{kpi.unit}</span>
            </span>
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
      {['left', 'right'].map((side) => (
        <div key={side} className={`hub-rail is-${side}${hidden ? ' is-hidden' : ''}`}>
          {HUB_BRANCHES.filter((b) => b.side === side).map((b, i) => (
            <Shortcut
              key={b.id}
              branch={b}
              num={String(HUB_BRANCHES.indexOf(b) + 1).padStart(2, '0')}
              value={kpis[b.id]}
              active={activeId === b.id}
              onSelect={onSelect}
              delay={1.35 + i * 0.1}
            />
          ))}

          {HUB_KPIS.filter((k) => k.side === side).map((k, i) => (
            <KpiWindow
              key={k.id}
              kpi={k}
              num={String(HUB_KPIS.indexOf(k) + 5).padStart(2, '0')}
              value={kpis[k.id]}
              delay={1.6 + i * 0.1}
            />
          ))}
        </div>
      ))}
    </>
  );
}
