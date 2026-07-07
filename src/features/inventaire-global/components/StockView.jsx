import { fmtDate, daysUntil, getRootCategory, groupRows } from '../logic';

export default function StockView({ filteredRows, categories, traxMap }) {
  if (!filteredRows.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">Aucune donnée disponible.</div>
        <div className="empty-state-sub">Vérifiez que l'inventaire usine a été saisi et que GH est connecté.</div>
      </div>
    );
  }

  const grouped = groupRows(filteredRows);
  const byCat = new Map();
  grouped.forEach((row) => {
    const rootCat = row._cat ? getRootCategory(row._cat, categories) : null;
    const catKey = rootCat ? rootCat.id : '__none__';
    const catName = rootCat ? rootCat.name : 'Sans catégorie';
    const catIcon = rootCat ? rootCat.icon || '📦' : '📋';
    if (!byCat.has(catKey)) byCat.set(catKey, { catName, catIcon, byCode: new Map() });
    const catGroup = byCat.get(catKey);
    const code = row.code_produit || '—';
    if (!catGroup.byCode.has(code)) catGroup.byCode.set(code, { code, description: row.description, rows: [] });
    catGroup.byCode.get(code).rows.push(row);
  });

  const sortedCats = [...byCat.values()].sort((a, b) => a.catName.localeCompare(b.catName));

  return (
    <div>
      {sortedCats.map(({ catName, catIcon, byCode }) => {
        const catRows = [...byCode.values()].flatMap((g) => g.rows);
        const usineCount = catRows.filter((r) => r.source === 'usine').length;
        const ghCount = catRows.filter((r) => r.source === 'gh').length;
        const sortedCodes = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));

        return (
          <div className="cat-section" key={catName}>
            <div className="cat-section-header">
              <span className="cat-section-icon">{catIcon}</span>
              <span className="cat-section-name">{catName}</span>
              {usineCount > 0 && <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(200,132,58,.12)', border: '1px solid rgba(200,132,58,.25)', color: 'var(--copper)', fontSize: '.66rem', fontWeight: 700, marginLeft: 6, transform: 'translateZ(0)'}}>🏭 {usineCount}</span>}
              {ghCount > 0 && <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(45,212,160,.1)', border: '1px solid rgba(45,212,160,.25)', color: 'var(--emerald)', fontSize: '.66rem', fontWeight: 700, marginLeft: 4, transform: 'translateZ(0)'}}>🏪 {ghCount}</span>}
              <span className="cat-section-badge badge-multi" style={{ marginLeft: 'auto' }}>{catRows.length} ligne{catRows.length > 1 ? 's' : ''}</span>
            </div>
            <div className="prod-group">
              {sortedCodes.map(({ code, description, rows: codeRows }, ci) => {
                const totalPoids = codeRows.reduce((s, r) => s + (parseFloat(r.poids_total) || 0), 0);
                const totalQte = codeRows.reduce((s, r) => s + (parseFloat(r.quantite) || 0), 0);
                const traxCode = traxMap.get((code || '').trim().toUpperCase()) || '';
                const sorted = [...codeRows].sort((a, b) => {
                  const lotCmp = (a.no_lot || '').localeCompare(b.no_lot || '');
                  if (lotCmp !== 0) return lotCmp;
                  if (a.source === b.source) return 0;
                  return a.source === 'usine' ? -1 : 1;
                });
                return (
                  <div key={code}>
                    {ci > 0 && <div style={{ height: 1, background: 'rgba(44,51,80,.4)', margin: '0 16px', transform: 'translateZ(0)'}}></div>}
                    <div className="prod-group-header">
                      <span className="prod-code">{code}</span>
                      {traxCode && <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--copper)', marginLeft: 8, whiteSpace: 'nowrap' }}>{traxCode}</span>}
                      {description && <span className="prod-desc">— {description}</span>}
                      <div className="prod-totaux">
                        <span className="prod-tot-item">Qté : <strong>{totalQte % 1 === 0 ? totalQte : totalQte.toFixed(2)}</strong></span>
                        {totalPoids > 0 && <span className="prod-tot-item">Poids : <strong>{totalPoids.toFixed(2)} kg</strong></span>}
                      </div>
                    </div>
                    {sorted.map((row, ri) => {
                      const isUsine = row.source === 'usine';
                      let expCls = '';
                      if (row.date_peremption && !row.date_peremption_conflit) {
                        const d = daysUntil(row.date_peremption);
                        if (d !== null) { if (d < 0) expCls = 'exp-danger'; else if (d <= 90) expCls = 'exp-warn'; }
                      }
                      return (
                        <div className="stock-row" key={ri}>
                          <span className={`loc-badge ${isUsine ? 'loc-usine' : 'loc-gh'}`}>{isUsine ? '🏭 Usine' : '🏪 GH'}</span>
                          <span className="row-lot" title={row.no_lot || ''}>
                            {row.no_lot || '—'}
                            {row.palettes > 1 && <span title={`${row.palettes} palettes regroupées`} style={{ marginLeft: 6, fontSize: '.64rem', color: 'var(--text-muted)', background: 'var(--bg-float)', border: '1px solid var(--text-faint)', borderRadius: 10, padding: '1px 6px', transform: 'translateZ(0)'}}>{row.palettes} pal.</span>}
                          </span>
                          <span className="row-qte">{row.quantite > 0 ? (row.quantite % 1 === 0 ? row.quantite : row.quantite.toFixed(2)) : <span style={{ color: 'var(--text-faint)' }}>—</span>}</span>
                          <span className="row-poids">{row.poids_total > 0 ? row.poids_total.toFixed(2) + ' kg' : <span style={{ color: 'var(--text-faint)' }}>—</span>}</span>
                          <div className="row-dates">
                            <div className="row-date-item"><div className="row-date-lbl">Fab.</div><div className="row-date-val">{row.date_fab_conflit ? <span style={{ color: 'var(--ruby)', fontWeight: 700 }}>⚠ conflit</span> : (row.date_fab ? fmtDate(row.date_fab) : '—')}</div></div>
                          </div>
                          <div className="row-dates">
                            <div className="row-date-item"><div className="row-date-lbl">Pér.</div><div className={`row-date-val ${row.date_peremption_conflit ? '' : expCls}`}>{row.date_peremption_conflit ? <span style={{ color: 'var(--ruby)', fontWeight: 700 }}>⚠ conflit</span> : (row.date_peremption ? fmtDate(row.date_peremption) : '—')}</div></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
