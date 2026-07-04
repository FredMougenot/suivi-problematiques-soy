export default function PoidsTable({ poidsList, onUpdate, onDelete }) {
  return (
    <table className="poids-table">
      <thead>
        <tr><th style={{ width: 120 }}>Type</th><th>Code produit</th><th>Poids unitaire (kg)</th><th style={{ width: 110 }}>Ajout manuel</th><th style={{ width: 50 }}></th></tr>
      </thead>
      <tbody>
        {poidsList.length === 0 ? (
          <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>Aucun poids défini. Cliquez sur "Ajouter un produit"</td></tr>
        ) : poidsList.map((p, i) => {
          const matchType = p.matchType || 'exact';
          return (
            <tr key={p.id ?? i}>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => onUpdate(i, 'matchType', 'exact')} style={{ flex: 1, padding: '5px 8px', border: `1px solid ${matchType === 'exact' ? 'var(--sapphire)' : 'rgba(255,255,255,.08)'}`, background: matchType === 'exact' ? 'rgba(74,158,232,.15)' : 'var(--bg-float)', color: matchType === 'exact' ? 'var(--sapphire)' : 'var(--text-muted)', borderRadius: 5, fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>EXACT</button>
                  <button onClick={() => onUpdate(i, 'matchType', 'contains')} style={{ flex: 1, padding: '5px 8px', border: `1px solid ${matchType === 'contains' ? 'var(--amber)' : 'rgba(255,255,255,.08)'}`, background: matchType === 'contains' ? 'rgba(245,158,11,.15)' : 'var(--bg-float)', color: matchType === 'contains' ? 'var(--amber)' : 'var(--text-muted)', borderRadius: 5, fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>CONTIENT</button>
                </div>
              </td>
              <td><input type="text" className="poids-input" style={{ width: 200 }} value={p.code} onChange={(e) => onUpdate(i, 'code', e.target.value)} placeholder={matchType === 'exact' ? 'Ex: ABCD123' : 'Ex: BOITE'} /></td>
              <td><input type="number" step="0.1" className="poids-input" value={p.poids_unitaire} onChange={(e) => onUpdate(i, 'poids_unitaire', parseFloat(e.target.value) || 0)} /></td>
              <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!p.ajout_manuel} onChange={(e) => onUpdate(i, 'ajout_manuel', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} /></td>
              <td><button className="rule-del-btn" onClick={() => onDelete(i)} title="Supprimer">✕</button></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
