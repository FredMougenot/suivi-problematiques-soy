import { useState } from 'react';
import { fmtNum } from '../logic';

export default function HistorySearch({ historyData }) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const results = term ? historyData.filter((r) => (r.label || '').toLowerCase().includes(term)) : [];

  return (
    <>
      <div style={{ marginBottom: 12, position: 'relative', maxWidth: 400 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '.9rem', pointerEvents: 'none' }}>⌕</span>
        <input
          type="text" placeholder="Rechercher un item…" value={query} onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--bg-raised)', border: '1px solid var(--text-faint)', borderRadius: 'var(--r-md)', fontSize: '.84rem', color: 'var(--text-primary)', outline: 'none' }}
        />
      </div>

      {term && (
        <div className="ic-tbl-wrap" id="hist-wrap">
          <table className="ic-tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ textAlign: 'left', paddingLeft: 16 }}>Date</th>
                <th rowSpan={2} style={{ textAlign: 'left' }}>Item</th>
                <th rowSpan={2}>Poids unit.<br /><small style={{ fontWeight: 400, fontSize: '.58rem' }}>(kg)</small></th>
                <th colSpan={2} className="th-group">Entrepôt 1</th>
                <th colSpan={2} className="th-group">Entrepôt 2</th>
                <th rowSpan={2}>Total<br /><small style={{ fontWeight: 400, fontSize: '.58rem' }}>(kg)</small></th>
                <th rowSpan={2}>ERP<br /><small style={{ fontWeight: 400, fontSize: '.58rem' }}>(kg)</small></th>
                <th rowSpan={2}>Écart<br /><small style={{ fontWeight: 400, fontSize: '.58rem' }}>(kg)</small></th>
              </tr>
              <tr>
                <th className="th-group">Qté E1</th>
                <th className="th-group">Balance 1</th>
                <th className="th-group">Qté E2</th>
                <th className="th-group">Balance 2</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Aucun résultat pour « {query} »</td></tr>
              ) : (
                results.map((r, i) => {
                  const ecart = parseFloat(r.ecart_calcule);
                  const ecartCls = ecart > 0 ? 'td-ecart-pos' : ecart < 0 ? 'td-ecart-neg' : 'td-ecart-zero';
                  const ecartPfx = ecart > 0 ? '+' : '';
                  const dateFormatted = r.date_jour ? new Date(r.date_jour + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                  return (
                    <tr key={r.id || i}>
                      <td style={{ fontSize: '.82rem', color: 'var(--copper-light)', fontWeight: 700, whiteSpace: 'nowrap', paddingLeft: 16 }}>{dateFormatted}</td>
                      <td style={{ fontSize: '.84rem', fontWeight: 500, color: 'var(--text-primary)' }}>{r.label || ''}</td>
                      <td style={{ textAlign: 'center' }}>{fmtNum(r.poids_unitaire)}</td>
                      <td style={{ textAlign: 'center' }}>{fmtNum(r.qte_e1)}</td>
                      <td style={{ textAlign: 'center' }}>{fmtNum(r.balance1)}</td>
                      <td style={{ textAlign: 'center' }}>{fmtNum(r.qte_e2)}</td>
                      <td style={{ textAlign: 'center' }}>{fmtNum(r.balance2)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{fmtNum(r.total_calcule)}</td>
                      <td style={{ textAlign: 'center' }}>{fmtNum(r.erp)}</td>
                      <td style={{ textAlign: 'center' }} className={`td-calc ${isNaN(ecart) ? '' : ecartCls}`}>{isNaN(ecart) || r.ecart_calcule === null ? '—' : ecartPfx + fmtNum(r.ecart_calcule)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
