import { useRef } from 'react';
import { KEEP_COLS, fmtDate, getExpiryClass, getPoidsUnitaire, escH } from '../logic';

export default function InventoryTable({ filtered, poidsList, traxCodes, selectedRows, onToggleSelect, onTraxOpen }) {
  const lastIdxRef = useRef(null);

  if (!filtered.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '.84rem' }}>Aucun item correspondant.</div>;
  }

  function handleRowClick(e, idx, key) {
    if (e.shiftKey && lastIdxRef.current !== null) {
      const start = Math.min(lastIdxRef.current, idx), end = Math.max(lastIdxRef.current, idx);
      const keysToAdd = [];
      for (let i = start; i <= end; i++) {
        const item = filtered[i];
        if (item) keysToAdd.push(item._idx !== undefined ? 'row_' + item._idx : item.no_lot + i);
      }
      onToggleSelect(keysToAdd, 'add-range');
    } else {
      onToggleSelect([key], 'toggle');
      lastIdxRef.current = idx;
    }
  }

  return (
    <table className="inv-tbl">
      <thead>
        <tr>
          <th>No. produit</th><th>Description</th><th>Qté inv.</th><th>No. comm client</th>
          <th>Étiquette</th><th>No. lot</th><th>No. sous-lot</th><th>Date lot</th>
          <th>Expiration</th><th>Réception originale</th><th>Poids unit. (kg)</th><th>Poids total (kg)</th>
          <th style={{ textAlign: 'center' }} title="Présent dans correspondance TRAX">TRAX</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((r, i) => {
          const key = r._idx !== undefined ? 'row_' + r._idx : (r.no_lot || r.no_produit + i);
          const sel = selectedRows.has(key);
          const raw = r._raw || [];
          const code = raw[KEEP_COLS[0]] || '';
          const desc = raw[KEEP_COLS[1]] || '';
          const qteAffichee = raw[KEEP_COLS[2]] || '';
          const qte = parseFloat(qteAffichee || 0);
          const poidsUnit = getPoidsUnitaire(poidsList, code);
          const poidsTotal = qte * poidsUnit;
          const expiration = raw[19] || '';
          const expiryClass = getExpiryClass(expiration);
          const expiryColor = expiryClass === 'expired' ? 'var(--ruby)' : expiryClass === 'expiring' ? 'var(--amber)' : undefined;
          const codeUpper = String(code).trim().toUpperCase();
          const hasTrax = codeUpper && traxCodes.has(codeUpper);

          return (
            <tr key={key} className={sel ? 'selected' : ''} onClick={(e) => handleRowClick(e, i, key)}>
              <td style={{ fontSize: '.72rem', color: expiryColor }}>{code}</td>
              <td style={{ fontSize: '.72rem', color: expiryColor }}>{desc}</td>
              {KEEP_COLS.slice(2).map((idx) => {
                let val = raw[idx] || '';
                if (idx === 13 || idx === 14 || idx === 15) val = fmtDate(val);
                return <td key={idx} style={{ fontSize: '.72rem', color: expiryColor }}>{val}</td>;
              })}
              <td style={{ fontSize: '.72rem', fontWeight: 600, color: expiryColor }}>{poidsUnit > 0 ? poidsUnit.toFixed(1) : '—'}</td>
              <td style={{ fontSize: '.72rem', fontWeight: 700, color: expiryColor }}>{poidsTotal > 0 ? poidsTotal.toFixed(1) : '—'}</td>
              <td style={{ textAlign: 'center' }}>
                {code ? (
                  hasTrax ? (
                    <span className="trax-badge-ok" title="Présent dans la correspondance">✓</span>
                  ) : (
                    <span className="trax-badge-missing" title="Absent — cliquer pour ajouter" onClick={(e) => { e.stopPropagation(); onTraxOpen(code, desc); }}>⚠️</span>
                  )
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
