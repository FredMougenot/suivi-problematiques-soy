import { formatDateShort } from '../logic';

export default function ErrorList({ errors, curView }) {
  if (errors.length === 0) {
    return (
      <div className="error-none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--success)', marginBottom: 8 }}>Aucune erreur détectée</div>
        <div>Tous les camions ont été traités correctement</div>
      </div>
    );
  }

  return (
    <div className="error-list">
      {errors.map((e, i) => (
        <div className="error-item" key={i} style={{ '--item-color': e.quart.color, '--item-bg': e.quart.bg }}>
          {curView !== 'jour' && <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: 80 }}>{formatDateShort(e.date)}</div>}
          <div className="error-time">{e.time}</div>
          <div className="error-quart">{e.quart.short}</div>
          <div className="error-truck">
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 140 }}>Camion {e.truck}</span>
              {e.id && <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }} title="ID Supabase">{e.id}</span>}
            </div>
            <div style={{ fontSize: '.75rem', marginTop: 4 }}>{e.dest}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
