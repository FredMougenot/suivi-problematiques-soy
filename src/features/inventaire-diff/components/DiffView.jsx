import { fmtDate, fmtNum, getRootCategory } from '../logic';

export default function DiffView({ filteredDiff, categories }) {
  if (!filteredDiff.length) {
    return (
      <div className="empty-ctr">
        <div className="empty-icon">✅</div>
        <div>Aucun changement détecté.</div>
        <div style={{ marginTop: 8, fontSize: '.78rem' }}>L'inventaire est identique au relevé précédent.</div>
      </div>
    );
  }

  const byCat = new Map();
  filteredDiff.forEach((row) => {
    const rootCat = row._cat ? getRootCategory(row._cat, categories) : null;
    const catKey = rootCat ? rootCat.id : '__none__';
    const catName = rootCat ? rootCat.name : 'Sans catégorie';
    const catIcon = rootCat ? rootCat.icon || '📦' : '📋';
    if (!byCat.has(catKey)) byCat.set(catKey, { catName, catIcon, byCode: new Map() });
    const code = row.code_produit || '—';
    const group = byCat.get(catKey);
    if (!group.byCode.has(code)) group.byCode.set(code, { code, description: row.description, rows: [] });
    group.byCode.get(code).rows.push(row);
  });

  const sortedCats = [...byCat.values()].sort((a, b) => a.catName.localeCompare(b.catName));

  return (
    <div>
      {sortedCats.map(({ catName, catIcon, byCode }) => {
        const total = [...byCode.values()].reduce((s, g) => s + g.rows.length, 0);
        const sortedCodes = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
        return (
          <div className="cat-section" key={catName}>
            <div className="cat-section-header">
              <span className="cat-section-icon">{catIcon}</span>
              <span className="cat-section-name">{catName}</span>
              <span className="cat-section-badge" style={{ marginLeft: 'auto' }}>{total} changement{total > 1 ? 's' : ''}</span>
            </div>
            <div className="prod-group">
              {sortedCodes.map(({ code, description, rows: codeRows }, ci) => {
                const totalQte = codeRows.reduce((s, r) => s + (r.total_qte || 0), 0);
                const totalPoids = codeRows.reduce((s, r) => s + (r.total_poids || 0), 0);
                const sorted = [...codeRows].sort((a, b) => (a.no_lot || '').localeCompare(b.no_lot || ''));
                return (
                  <div key={code}>
                    {ci > 0 && <div style={{ height: 1, background: 'rgba(44,51,80,.4)', margin: '0 16px' }}></div>}
                    <div className="prod-group-header">
                      <span className="prod-code">{code}</span>
                      {description && <span className="prod-desc">— {description}</span>}
                      <div className="prod-totaux" style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                        <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Qté total : <strong style={{ color: 'var(--amber)' }}>{fmtNum(totalQte)}</strong></span>
                        {totalPoids > 0 && <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Poids total : <strong style={{ color: 'var(--amber)' }}>{totalPoids.toFixed(2)} kg</strong></span>}
                      </div>
                    </div>
                    {sorted.map((row, ri) => {
                      const badge = row.type === 'new' ? <span className="badge-new">🟢 NOUVEAU</span>
                        : row.type === 'gone' ? <span className="badge-gone">🔴 DISPARU</span>
                        : <span className="badge-mod">🟡 MODIFIÉ</span>;

                      return (
                        <div className={`diff-row row-${row.type}`} key={ri}>
                          {badge}
                          <span className="row-lot">{row.no_lot || '—'}</span>
                          <div className="diff-detail">
                            {row.usine_qte > 0 && <span className="loc-badge loc-usine" style={{ width: 'auto', padding: '3px 8px' }}>🏭 {fmtNum(row.usine_qte)}{row.usine_poids > 0 ? ' / ' + row.usine_poids.toFixed(2) + ' kg' : ''}</span>}
                            {row.gh_qte > 0 && <span className="loc-badge loc-gh" style={{ width: 'auto', padding: '3px 8px' }}>🏪 {fmtNum(row.gh_qte)}{row.gh_poids > 0 ? ' / ' + row.gh_poids.toFixed(2) + ' kg' : ''}</span>}
                            <span style={{ color: 'var(--text-faint)', fontSize: '.8rem' }}>=</span>
                            {row.type !== 'gone' ? (
                              <span style={{ fontSize: '.82rem', fontWeight: 800, color: 'var(--amber)' }}>{fmtNum(row.total_qte)}{row.total_poids > 0 ? ' / ' + row.total_poids.toFixed(2) + ' kg' : ''}</span>
                            ) : (
                              <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{fmtNum(row.prev_total_qte)}</span>
                            )}
                            {row.type === 'mod' && (
                              <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
                                était : <span style={{ color: 'var(--ruby)', textDecoration: 'line-through' }}>{fmtNum(row.prev_total_qte)}{row.prev_total_poids > 0 ? ' / ' + row.prev_total_poids.toFixed(2) + ' kg' : ''}</span>
                              </span>
                            )}
                          </div>
                          <div className="diff-dates">
                            {row.date_fab && <div className="diff-date-item"><div className="diff-date-lbl">Fab.</div><div>{fmtDate(row.date_fab)}</div></div>}
                            {row.date_peremption && <div className="diff-date-item"><div className="diff-date-lbl">Pér.</div><div>{fmtDate(row.date_peremption)}</div></div>}
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
