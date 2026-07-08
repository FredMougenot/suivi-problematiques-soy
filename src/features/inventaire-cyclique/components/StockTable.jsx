import { BASE_ITEMS, calcRow, fmtNum } from '../logic';

export default function StockTable({ stockRows, paramItems, onFieldChange, onDeleteRow }) {
  const extras = Object.keys(stockRows).map(Number).filter((i) => i >= 100).sort((a, b) => a - b);
  const all = [...BASE_ITEMS.map((it) => ({ idx: it.idx, extra: false })), ...extras.map((i) => ({ idx: i, extra: true }))];

  let totalItems = 0;
  all.forEach((entry) => {
    const r = stockRows[entry.idx] || {};
    if ([r.qte_e1, r.balance1, r.qte_e2, r.balance2].some((v) => parseFloat(v || 0) !== 0)) totalItems++;
  });

  return (
    <div className="table-shell dt-min-1100">
      <table className="data-table dt-center">
        <thead>
          <tr>
            <th rowSpan={2} style={{ textAlign: 'center' }}>#</th>
            <th rowSpan={2} style={{ textAlign: 'left', minWidth: 160 }}>Item</th>
            <th rowSpan={2}>Poids unitaire<br /><small style={{ fontWeight: 400, fontSize: '.58rem' }}>(kg)</small></th>
            <th colSpan={2} className="th-group active">Entrepôt 1</th>
            <th colSpan={2} className="th-group active">Entrepôt 2</th>
            <th rowSpan={2}>Total<br /><small style={{ fontWeight: 400, fontSize: '.58rem' }}>(kg)</small></th>
            <th rowSpan={2}>ERP<br /><small style={{ fontWeight: 400, fontSize: '.58rem' }}>(kg)</small></th>
            <th rowSpan={2}>Écart<br /><small style={{ fontWeight: 400, fontSize: '.58rem' }}>(kg)</small></th>
            <th rowSpan={2}></th>
          </tr>
          <tr>
            <th className="th-group active">Qté Entrepôt 1</th>
            <th className="th-group active">Balance 1</th>
            <th className="th-group active">Qté Entrepôt 2</th>
            <th className="th-group active">Balance 2</th>
          </tr>
        </thead>
        <tbody>
          {all.map((entry, pos) => {
            const r = stockRows[entry.idx] || {};
            const { total, ecart } = calcRow(r);
            const ecartCls = ecart > 0 ? 'td-ecart-pos' : ecart < 0 ? 'td-ecart-neg' : 'td-ecart-zero';
            const ecartPfx = ecart > 0 ? '+' : '';
            const hasEcartData = r.erp || r.qte_e1 || r.qte_e2;
            return (
              <tr key={entry.idx}>
                <td style={{ textAlign: 'center' }}><span className="item-num">{pos + 1}</span></td>
                <td>
                  <select className="ni-item" style={{ background: 'var(--bg-float)', border: '1px solid var(--text-faint)', color: 'var(--text-primary)', borderRadius: 'var(--r-sm)', padding: '5px 8px', fontSize: '.82rem', outline: 'none', cursor: 'pointer', width: 220, transform: 'translateZ(0)'}}
                    value={r.label || ''} onChange={(e) => onFieldChange(entry.idx, 'label', e.target.value)}>
                    {paramItems.length === 0 ? (
                      <option value="" disabled>⚠ Configurer les paramètres d'abord</option>
                    ) : (
                      <>
                        <option value="">— Sélectionner —</option>
                        {paramItems.map((p) => <option key={p.id} value={p.item}>{p.item}</option>)}
                      </>
                    )}
                  </select>
                </td>
                <td><input className="ni" type="number" step="0.001" value={r.poids_unitaire || ''} placeholder="0" onChange={(e) => onFieldChange(entry.idx, 'poids_unitaire', e.target.value)} /></td>
                <td><input className="ni" type="number" step="0.01" value={r.qte_e1 || ''} placeholder="0" onChange={(e) => onFieldChange(entry.idx, 'qte_e1', e.target.value)} /></td>
                <td><input className="ni" type="number" step="0.01" value={r.balance1 || ''} placeholder="0" onChange={(e) => onFieldChange(entry.idx, 'balance1', e.target.value)} /></td>
                <td><input className="ni" type="number" step="0.01" value={r.qte_e2 || ''} placeholder="0" onChange={(e) => onFieldChange(entry.idx, 'qte_e2', e.target.value)} /></td>
                <td><input className="ni" type="number" step="0.01" value={r.balance2 || ''} placeholder="0" onChange={(e) => onFieldChange(entry.idx, 'balance2', e.target.value)} /></td>
                <td className="td-total">{isNaN(total) ? '—' : fmtNum(total)}</td>
                <td><input className="ni" type="number" step="0.01" value={r.erp || ''} placeholder="0" onChange={(e) => onFieldChange(entry.idx, 'erp', e.target.value)} /></td>
                <td className={`td-calc ${ecartCls}`}>{isNaN(ecart) || !hasEcartData ? '—' : ecartPfx + fmtNum(ecart)}</td>
                <td style={{ textAlign: 'center' }}>
                  {entry.extra && <button className="btn-icon" title="Supprimer" onClick={() => onDeleteRow(entry.idx)}>✕</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={9} style={{ textAlign: 'right', padding: '6px 16px', color: 'var(--text-muted)', fontSize: '.72rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>Items enregistrés</td>
            <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '.88rem', padding: '6px 12px' }}>{totalItems}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
