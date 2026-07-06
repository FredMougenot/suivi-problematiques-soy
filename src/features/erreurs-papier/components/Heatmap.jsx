import { QUARTS, formatDateShort } from '../logic';

function hexToRgbStr(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export default function Heatmap({ dataByDay, curView }) {
  const days = Object.keys(dataByDay).sort();
  if (days.length === 0) return null;
  const maxErrors = Math.max(1, ...days.map((d) => dataByDay[d].total));
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <div className="panel">
      <div className="panel-header" style={{ '--panel-accent': 'var(--sapphire)' }}>
        <div className="panel-title">
          <div className="panel-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
          Carte Thermique
        </div>
        <div className="panel-meta">Erreurs par {curView === 'semaine' ? 'Jour' : 'Jour du Mois'}</div>
      </div>
      <div className="panel-body">
        <div className="heatmap-scroll">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th></th>
                {days.map((day) => {
                  const d = new Date(day + 'T00:00:00');
                  return (
                    <th key={day} style={{ lineHeight: 1.3 }}>
                      <span style={{ display: 'block' }}>{dayNames[d.getDay()]}</span>
                      <span style={{ display: 'block', fontWeight: 800, color: 'var(--text-secondary)' }}>{d.getDate()}/{d.getMonth() + 1}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {QUARTS.map((q) => (
                <tr key={q.id}>
                  <th style={{ textAlign: 'right', paddingRight: 16, color: q.color }}>{q.short}</th>
                  {days.map((day) => {
                    const qData = dataByDay[day][`q${q.id}`] || 0;
                    const intensity = qData / maxErrors;
                    let bgColor, textColor, borderColor;
                    if (qData === 0) { bgColor = 'var(--bg-float)'; textColor = 'var(--text-faint)'; borderColor = 'var(--text-faint)'; }
                    else { const alpha = 0.1 + intensity * 0.6; bgColor = `rgba(${hexToRgbStr(q.color)},${alpha})`; textColor = intensity > 0.5 ? '#FFF' : q.color; borderColor = q.color; }
                    return (
                      <td key={day}>
                        <div className="heatmap-cell" style={{ '--cell-bg': bgColor, '--cell-color': textColor, '--cell-border': borderColor }} title={`${formatDateShort(day)} · ${q.label}: ${qData} erreur${qData !== 1 ? 's' : ''}`}>
                          {qData || ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
