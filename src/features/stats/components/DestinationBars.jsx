import { diff, isActif } from '../logic';

export default function DestinationBars({ data, seuils }) {
  const { objectif, slActif, seuil1 } = seuils;
  const dm = {};
  data.forEach((r) => {
    if (!isActif(r, slActif)) return;
    const d2 = diff(r.heure_planif, r.heure_reelle);
    if (d2 === null) return;
    const k = r.destination || 'Non défini';
    if (!dm[k]) dm[k] = { on: 0, late: 0, n: 0 };
    dm[k].n++;
    if (d2 <= seuil1) dm[k].on++; else dm[k].late++;
  });
  const dests = Object.entries(dm).filter(([, v]) => v.n > 0).sort((a, b) => a[1].on / a[1].n - b[1].on / b[1].n);

  if (!dests.length) {
    return <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-title">Aucune donnée</div></div>;
  }

  return (
    <div className="dest-list">
      {dests.map(([name, v]) => {
        const t = Math.round((v.on / v.n) * 100);
        const isGood = t >= objectif, isMid = t >= objectif * 0.8;
        const [r, g, b] = isGood ? [45, 212, 160] : isMid ? [232, 164, 58] : [224, 85, 85];
        const fill = `linear-gradient(90deg,rgba(${r},${g},${b},.75),rgba(${r},${g},${b},.55))`;
        const glow = `0 0 12px rgba(${r},${g},${b},.25)`;
        return (
          <div className="dest-row" key={name}>
            <div className="dest-name">{name}</div>
            <div className="dest-track">
              <div className="dest-fill" style={{ width: t + '%', background: fill, boxShadow: glow }}>
                {t > 22 && <span style={{ textShadow: '0 1px 3px rgba(0,0,0,.4)' }}>{t}%</span>}
              </div>
            </div>
            <div className="dest-pct" style={{ color: `rgba(${r},${g},${b},.8)` }}>{t}%</div>
            <div className="dest-nums">{v.on}/{v.n}</div>
          </div>
        );
      })}
    </div>
  );
}
