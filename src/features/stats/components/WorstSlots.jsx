import { diff, isActif } from '../logic';

export default function WorstSlots({ data, seuils }) {
  const { seuil1, seuil2, slActif } = seuils;
  const sm = {};
  data.forEach((r) => {
    if (!isActif(r, slActif)) return;
    const d2 = diff(r.heure_planif, r.heure_reelle);
    if (d2 === null || d2 <= seuil1) return;
    const k = r.heure_planif || '?';
    if (!sm[k]) sm[k] = [];
    sm[k].push(d2);
  });
  const worst = Object.entries(sm)
    .map(([h, arr]) => ({ h, n: arr.length, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), max: Math.max(...arr) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  if (!worst.length) {
    return <div className="empty"><div className="empty-ico">✅</div>Aucun créneau problématique</div>;
  }

  return (
    <div className="worst-list">
      {worst.map((s, i) => {
        const c = s.avg > seuil2 ? 'bad' : 'warn';
        const col = c === 'bad' ? 'var(--ruby)' : 'var(--amber)';
        const barPct = Math.min(100, Math.round((s.avg / seuil2) * 70));
        return (
          <div className={`worst-item ${c}`} key={s.h}>
            <div className="worst-rank">#{i + 1}</div>
            <div className="worst-heure">{s.h}</div>
            <div className="worst-info">
              <div className="worst-h">{s.n} retard{s.n > 1 ? 's' : ''} enregistré{s.n > 1 ? 's' : ''}</div>
              <div className="worst-detail">Max {s.max} min · Tolérance &gt;{seuil1}min</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="worst-avg" style={{ color: col }}>+{s.avg}<span style={{ fontSize: '.7rem', fontFamily: "'Outfit'", fontWeight: 400, marginLeft: 2 }}>min</span></div>
              <div className="worst-bar-wrap"><div className="worst-bar-bg"><div className="worst-bar-fill" style={{ width: barPct + '%', background: col }}></div></div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
