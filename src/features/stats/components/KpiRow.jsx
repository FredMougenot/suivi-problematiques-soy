import { tcls } from '../logic';

export default function KpiRow({ A, seuils }) {
  const { seuil1, seuil2, objectif } = seuils;
  const tc = tcls(A.taux, objectif);
  const barCol = tc === 'green' ? 'var(--emerald)' : tc === 'yellow' ? 'var(--amber)' : tc === 'red' ? 'var(--ruby)' : 'var(--copper-light)';
  const retCls = A.avgRet > seuil2 ? 'red' : A.avgRet > seuil1 ? 'yellow' : 'green';
  const covPct = A.total > 0 ? Math.round((A.arrived / A.total) * 100) : 0;
  const nlCls = A.nonLivre > 2 ? 'red' : A.nonLivre > 0 ? 'yellow' : 'slate';
  const nlPct = A.total > 0 ? Math.round((A.nonLivre / A.total) * 100) : 0;

  const p = A.taux || 0;
  const r = 28, circ = 2 * Math.PI * r, dash = circ * (p / 100);

  return (
    <div className="sp-kpi-row anim d1">
      <div className={`sp-kpi ${tc}`}>
        <div className="sp-kpi-eyebrow">Ponctualité</div>
        <div className={`sp-kpi-val ${tc}`}>{A.taux !== null ? A.taux + '%' : '—'}</div>
        <div className="sp-kpi-sub">
          {A.onTime} à l'heure · {A.late} en retard<br />
          Objectif {objectif}% · sur {A.arrived} arrivés
        </div>
        <div className="sp-kpi-bar"><div className="sp-kpi-bar-fill" style={{ width: (A.taux || 0) + '%', background: barCol }}></div></div>
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.1, pointerEvents: 'none' }}>
          <svg width="70" height="70" viewBox="0 0 70 70">
            <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3" />
            <circle cx="35" cy="35" r={r} fill="none" stroke={barCol} strokeWidth="3"
              strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round" transform="rotate(-90 35 35)" />
          </svg>
        </div>
      </div>

      <div className={`sp-kpi ${retCls}`}>
        <div className="sp-kpi-eyebrow">Retard moyen</div>
        <div className={`sp-kpi-val ${retCls}`}>{A.avgRet}<span style={{ fontSize: '1.1rem', marginLeft: 3 }}>min</span></div>
        <div className="sp-kpi-sub">
          Sur {A.late} camion{A.late > 1 ? 's' : ''} en retard<br />
          Max {A.maxRet} min · Critique &gt;{seuil2} min
        </div>
        <div className="sp-kpi-bar"><div className="sp-kpi-bar-fill" style={{ width: Math.min(100, (A.avgRet / (seuil2 * 2)) * 100) + '%', background: 'var(--ruby)' }}></div></div>
      </div>

      <div className="sp-kpi copper">
        <div className="sp-kpi-eyebrow">Couverture</div>
        <div className="sp-kpi-val copper">{A.arrived}<span style={{ fontSize: '1.1rem', marginLeft: 3 }}>/ {A.total}</span></div>
        <div className="sp-kpi-sub">
          {covPct}% des actifs arrivés<br />
          {A.attente} en attente · {A.inactif} inactif{A.inactif > 1 ? 's' : ''}
        </div>
        <div className="sp-kpi-bar"><div className="sp-kpi-bar-fill" style={{ width: covPct + '%', background: 'linear-gradient(90deg,var(--copper),var(--copper-light))', transform: 'translateZ(0)'}}></div></div>
      </div>

      <div className={`sp-kpi ${nlCls}`}>
        <div className="sp-kpi-eyebrow">Non livrés</div>
        <div className={`sp-kpi-val ${nlCls}`}>{A.nonLivre}</div>
        <div className="sp-kpi-sub">
          Statut Non livré dans le planning<br />
          {nlPct}% des actifs planifiés
        </div>
        <div className="sp-kpi-bar"><div className="sp-kpi-bar-fill" style={{ width: nlPct + '%', background: 'var(--ruby)' }}></div></div>
      </div>
    </div>
  );
}
