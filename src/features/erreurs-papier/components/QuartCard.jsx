import { getEfficiencyColor, getEfficiencyGlow, efficiencyLabel } from '../logic';

export default function QuartCard({ s }) {
  const effColor = getEfficiencyColor(s.efficiency);
  const effGlow = getEfficiencyGlow(s.efficiency);
  const effValue = s.efficiency !== null ? s.efficiency : '—';

  return (
    <div className="quart-card" style={{ '--quart-color': s.color, '--quart-glow': s.glow, '--quart-bg': s.bg }}>
      <div className="quart-header">
        <div className="quart-tag"><div className="quart-dot"></div>{s.label}</div>
        <div className="quart-efficiency" style={{ '--eff-color': effColor, '--eff-glow': effGlow, '--eff-value': s.efficiency || 0 }}>
          <div className="eff-value">{effValue}{s.efficiency !== null ? '%' : ''}</div>
        </div>
      </div>
      <div className="quart-stats">
        <div className="stat-row">
          <div className="stat-label">Erreurs détectées</div>
          <div style={{ textAlign: 'right' }}>
            <div className="stat-value" style={{ color: s.errors > 0 ? '#EF4444' : '#10B981' }}>{s.errors}</div>
            <div className="stat-sub">{s.errors === 0 ? 'Aucune erreur' : s.errors === 1 ? '1 erreur' : s.errors + ' erreurs'}</div>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-label">Camions analysés</div>
          <div style={{ textAlign: 'right' }}>
            <div className="stat-value">{s.total}</div>
            <div className="stat-sub">{s.total === 0 ? 'Aucun camion' : s.total === 1 ? '1 camion' : s.total + ' camions'}</div>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-label">Taux d'efficacité</div>
          <div style={{ textAlign: 'right' }}>
            <div className="stat-value" style={{ color: effColor }}>{effValue}{s.efficiency !== null ? '%' : ''}</div>
            <div className="stat-sub">{efficiencyLabel(s.efficiency)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
