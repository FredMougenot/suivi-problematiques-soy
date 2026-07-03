import { SLOTS, diff, cls, statutCamion } from '../logic';

export default function DayTimeline({ data, seuils }) {
  const { seuil1, seuil2 } = seuils;
  const bySlot = {};
  data.forEach((r) => { bySlot[r.slot_index] = r; });
  const extras = Object.keys(bySlot).map(Number).filter((i) => i >= 10).sort((a, b) => a - b);
  const all = [
    ...SLOTS.map((s) => ({ ...s, extra: false })),
    ...extras.map((i) => ({ idx: i, h: bySlot[i]?.heure_planif || '—', lbl: 'Extra', extra: true })),
  ];

  const items = all.map((s) => {
    const r = bySlot[s.idx];
    if (r === undefined) return null;
    const st = statutCamion(r, seuils);
    const h = r.heure_planif || s.h;
    const dest = r.destination || null;

    if (st === 'inactif') {
      return (
        <div key={s.idx} className="tl-item inactif">
          <div className="tl-indicator inactif"></div>
          <div className="tl-h">{h}</div>
          <div className="tl-name">{s.lbl}{dest && <span className="tl-dest">{dest}</span>}<span className="tl-badge inactif">Inactif</span></div>
          <div className="tl-retard inactif">—</div>
        </div>
      );
    }

    let dotCls, retCls, retLbl;
    if (st === 'arrive_ok') {
      const d = diff(h, r.heure_reelle);
      dotCls = 'ok'; retCls = 'ok';
      retLbl = d !== null && d <= 0 ? "✓ À l'heure" : d !== null ? '✓ +' + d + ' min' : "✓ À l'heure";
    } else if (st === 'arrive_retard') {
      const d = diff(h, r.heure_reelle);
      const c = cls(d, seuil1, seuil2); dotCls = c; retCls = c;
      retLbl = d !== null ? '+' + d + ' min' : 'Retard';
    } else if (st === 'nonlivre') {
      dotCls = 'nonlivre'; retCls = 'nonlivre'; retLbl = 'Non livré';
    } else {
      dotCls = 'attente'; retCls = 'attente'; retLbl = 'En attente';
    }

    return (
      <div key={s.idx} className="tl-item">
        <div className={`tl-indicator ${dotCls}`}></div>
        <div className="tl-h">{h}</div>
        <div className="tl-name">
          {s.lbl}{dest && <span className="tl-dest">{dest}</span>}
          {st === 'nonlivre' && <span className="tl-badge nonlivre">Non livré</span>}
        </div>
        <div className={`tl-retard ${retCls}`}>{retLbl}</div>
      </div>
    );
  }).filter(Boolean);

  return (
    <>
      <div className="tl-list">
        {items.length ? items : <div className="empty"><div className="empty-ico">📭</div>Aucune donnée pour cette journée</div>}
      </div>
      <div className="legende">
        <div className="leg-item"><div className="leg-dot" style={{ background: 'var(--emerald)' }}></div>À l'heure ≤{seuil1}min</div>
        <div className="leg-item"><div className="leg-dot" style={{ background: 'var(--amber)' }}></div>Retard ≤{seuil2}min</div>
        <div className="leg-item"><div className="leg-dot" style={{ background: 'var(--ruby)' }}></div>Critique &gt;{seuil2}min</div>
        <div className="leg-item"><div className="leg-dot" style={{ background: 'var(--sapphire)' }}></div>En attente</div>
        <div className="leg-item"><div className="leg-dot" style={{ background: 'var(--ruby)', opacity: 0.45 }}></div>Non livré</div>
        <div className="leg-item"><div className="leg-dot" style={{ background: 'var(--text-faint)' }}></div>Inactif (exclu)</div>
      </div>
    </>
  );
}
