import { fmtDate } from '../logic';

const REC_COLORS = { '0': 'var(--ruby)', '1': 'var(--amber)', '30': 'var(--emerald)', '60': 'var(--amber)', '90': 'var(--sapphire)' };

export default function VerifTable({ rows, kpis, today }) {
  return (
    <>
      <div className="verif-kpi-bar">
        <div className="verif-kpi verif-kpi-total">{kpis.total} items total</div>
        {kpis.nUrgent > 0 && <div className="verif-kpi" style={{ background: 'rgba(224,85,85,.1)', border: '1px solid rgba(224,85,85,.3)', color: 'var(--ruby)', transform: 'translateZ(0)'}}>{kpis.nUrgent} en urgence</div>}
        {kpis.nSoon > 0 && <div className="verif-kpi" style={{ background: 'rgba(232,164,58,.1)', border: '1px solid rgba(232,164,58,.3)', color: 'var(--amber)', transform: 'translateZ(0)'}}>{kpis.nSoon} bientôt à échéance</div>}
        {kpis.nRec > 0 && <div className="verif-kpi" style={{ background: 'rgba(74,158,232,.1)', border: '1px solid rgba(74,158,232,.3)', color: 'var(--sapphire)', transform: 'translateZ(0)'}}>{kpis.nRec} recommandé(s)</div>}
        {kpis.nOk > 0 && <div className="verif-kpi verif-kpi-ok">{kpis.nOk} à jour</div>}
      </div>

      <div className="verif-tbl-wrap">
        <table className="verif-tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Item</th>
              <th style={{ width: 90, textAlign: 'center' }}>Récurrence</th>
              <th style={{ width: 130, textAlign: 'center' }}>Dernière vérif.</th>
              <th style={{ width: 130, textAlign: 'center' }}>Prochaine vérif.</th>
              <th style={{ width: 110, textAlign: 'center' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--emerald)', fontWeight: 600 }}>✓ Tous les items sont à jour</td></tr>
            ) : (
              rows.map(({ p, i, prochaine, verifAujourdhui, statut, badgeCls, isRec }) => (
                <tr key={p.id} className={isRec ? 'tr-recommended' : ''} style={verifAujourdhui ? { background: 'rgba(45,212,160,.04)', transform: 'translateZ(0)' } : undefined}>
                  <td><span className="item-num">{i + 1}</span></td>
                  <td style={{ fontWeight: 500, color: isRec ? 'var(--sapphire)' : undefined }}>{p.item}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '.72rem', fontWeight: 700, color: REC_COLORS[String(p.recurrence)] || 'var(--text-muted)', padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,.05)', transform: 'translateZ(0)'}}>{p.recurrence}j</span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '.8rem', color: 'var(--text-secondary)' }}>{fmtDate(p.derniere_verification)}</td>
                  <td style={{ textAlign: 'center', fontSize: '.8rem', color: prochaine && prochaine < today ? 'var(--ruby)' : 'var(--amber)' }}>{fmtDate(prochaine)}</td>
                  <td style={{ textAlign: 'center' }}><span className={`vbadge ${badgeCls}`}>{statut}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
