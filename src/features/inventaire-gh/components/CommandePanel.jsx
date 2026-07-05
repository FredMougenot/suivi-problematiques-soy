import { camionTotalWeight } from '../camionsLogic';

export default function CommandePanel({ camion, onRemoveItem, onAdjustQty, onClear, onMarkSent, onExportPdf, exporting }) {
  if (!camion) return null;
  const total = camionTotalWeight(camion);
  const hasNew = camion.items.some((item) => item.isNew);
  const itemCount = camion.items.reduce((sum, item) => (item._is_manual ? sum + Math.ceil((item._resolved_qte || 0) / 15) : sum + 1), 0);

  return (
    <div className="cmd-panel">
      <div className="cmd-header">
        <span className="cmd-title">🚚 Commande {camion.nom}</span>
        <button className="cmd-clear" onClick={onClear}>Effacer tout</button>
      </div>
      <div className="cmd-body">
        {camion.items.length === 0 ? (
          <div className="cmd-empty">Sélectionnez des lignes et cliquez sur "Ajouter au camion".</div>
        ) : (
          camion.items.map((item) => (
            <div className={`cmd-row${item.isNew ? ' cmd-row-new' : ''}`} key={item._key}>
              <div style={{ flex: 1 }}>
                <div className="cmd-item-code">{item.isNew ? '🆕 ' : ''}{item._resolved_code}</div>
                <div className="cmd-item-desc">{item._resolved_desc}</div>
                <div className="cmd-item-meta">
                  Qté: {item._resolved_qte}
                  {item._is_manual && (
                    <>
                      <button onClick={() => onAdjustQty(item._key, -1)} style={{ marginLeft: 8, padding: '2px 8px', background: 'var(--bg-raised)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 4, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700 }}>−</button>
                      <button onClick={() => onAdjustQty(item._key, 1)} style={{ padding: '2px 8px', background: 'var(--bg-raised)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 4, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700 }}>+</button>
                    </>
                  )}
                  {' · '}{item._resolved_poids_unit > 0 ? item._resolved_poids_unit.toFixed(1) : '—'} kg/unité · <strong>{item._resolved_poids_total > 0 ? item._resolved_poids_total.toFixed(1) : '—'} kg total</strong>
                </div>
              </div>
              <button className="btn-icon" title="Retirer" onClick={() => onRemoveItem(item._key)}>✕</button>
            </div>
          ))
        )}
      </div>
      <div className="cmd-footer">
        <div className="cmd-total">
          <span className="cmd-total-lbl">{itemCount} item{itemCount > 1 ? 's' : ''} · Poids total</span>
          <span className="cmd-total-val">{total.toLocaleString('fr-CA', { maximumFractionDigits: 1 })} kg</span>
        </div>
        <div className="cmd-actions">
          {hasNew && (
            <button className="btn btn-primary" style={{ background: 'var(--emerald)' }} onClick={onMarkSent}>✓ Marquer envoyé</button>
          )}
          <button className="btn btn-primary" onClick={onExportPdf} disabled={camion.items.length === 0 || exporting}>
            📄 {exporting ? 'Export…' : 'Exporter PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
