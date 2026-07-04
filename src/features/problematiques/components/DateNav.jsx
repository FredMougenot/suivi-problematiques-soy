import { localToday } from '../logic';

export default function DateNav({ date, onChange, showTodayButton = true }) {
  const isToday = date === localToday();
  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('fr-CA', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  function changeDay(delta) {
    const nd = new Date(date + 'T00:00:00');
    nd.setDate(nd.getDate() + delta);
    onChange(nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0') + '-' + String(nd.getDate()).padStart(2, '0'));
  }

  return (
    <div className="dash-date-nav">
      <button className="dash-date-arr" onClick={() => changeDay(-1)} aria-label="Jour précédent">←</button>
      <div className="dash-date-lbl">{label}{isToday && <span className="dash-today-chip">Aujourd'hui</span>}</div>
      <button className="dash-date-arr" onClick={() => changeDay(1)} aria-label="Jour suivant">→</button>
      {showTodayButton && !isToday && <button className="dash-today-btn" onClick={() => onChange(localToday())}>Aujourd'hui</button>}
    </div>
  );
}
