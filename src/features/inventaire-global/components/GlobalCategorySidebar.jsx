import { useState } from 'react';
import { matchesCategory } from '../logic';

function countForCat(allRows, categories, cat) {
  return allRows.filter((r) => {
    if (r.source === 'gh') return matchesCategory(r._original || r, cat);
    let c = categories.find((x) => x.id === r.categorie_id);
    while (c) { if (c.id === cat.id) return true; c = categories.find((x) => x.id === c.parent_id); }
    return false;
  }).length;
}

export default function GlobalCategorySidebar({ categories, allRows, activeCat, onSelectCat, onSelectCode }) {
  const [openParentId, setOpenParentId] = useState(null);
  const [openChildId, setOpenChildId] = useState(null);

  function closeFlyouts() { setOpenParentId(null); setOpenChildId(null); }
  function selectCat(id) { closeFlyouts(); onSelectCat(id); }
  function selectCode(code) { closeFlyouts(); onSelectCode(code); }

  const roots = categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const noCatCount = allRows.filter((r) => {
    if (r.source === 'gh') return !categories.some((c) => matchesCategory(r._original || r, c));
    return !r.categorie_id;
  }).length;

  const parentCat = categories.find((c) => c.id === openParentId);
  const parentHasChildren = parentCat && categories.some((c) => c.parent_id === parentCat.id);
  const children = parentCat ? categories.filter((c) => c.parent_id === parentCat.id).sort((a, b) => a.name.localeCompare(b.name)) : [];

  function matchesForCat(cat) {
    return allRows.filter((r) => {
      if (r.source === 'gh') return matchesCategory(r._original || r, cat);
      let c = categories.find((x) => x.id === r.categorie_id);
      while (c) { if (c.id === cat.id) return true; c = categories.find((x) => x.id === c.parent_id); }
      return false;
    });
  }

  const parentMatches = parentCat && !parentHasChildren ? matchesForCat(parentCat) : [];
  const parentProduits = parentMatches.length ? [...new Set(parentMatches.map((r) => r.code_produit).filter(Boolean))].sort() : [];

  const childCat = categories.find((c) => c.id === openChildId);
  const childMatches = childCat ? matchesForCat(childCat) : [];
  const childProduits = childMatches.length ? [...new Set(childMatches.map((r) => r.code_produit).filter(Boolean))].sort() : [];

  return (
    <>
      {(openParentId || openChildId) && <div className="cat-overlay open" onClick={closeFlyouts}></div>}

      <div className="cat-sidebar">
        <div className={`cat-btn${activeCat === null ? ' active' : ''}`} onClick={() => selectCat(null)}>
          <span className="cat-btn-icon">Σ</span><span className="cat-btn-name">TOUT</span><span className="cat-btn-count">{allRows.length}</span>
        </div>

        {roots.map((cat) => {
          const hasChildren = categories.some((c) => c.parent_id === cat.id);
          const count = countForCat(allRows, categories, cat);
          return (
            <div key={cat.id} className={`cat-btn${activeCat === cat.id ? ' active' : ''}`} title={cat.name}
              style={activeCat === cat.id ? { borderColor: cat.color, background: (cat.color || 'var(--sapphire)') + '22', transform: 'translateZ(0)' } : undefined}
              onClick={(e) => { e.stopPropagation(); if (hasChildren) { setOpenParentId(openParentId === cat.id ? null : cat.id); setOpenChildId(null); } else selectCat(cat.id); }}>
              <span className="cat-btn-icon">{cat.icon || '📦'}</span>
              <span className="cat-btn-name">{cat.name}</span>
              {hasChildren ? <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '.7rem' }}>►</span> : <span className="cat-btn-count">{count}</span>}
            </div>
          );
        })}

        <div className={`cat-btn${activeCat === 'NO_CAT' ? ' active' : ''}`} onClick={() => selectCat('NO_CAT')}>
          <span className="cat-btn-icon">📋</span><span className="cat-btn-name">SANS CAT.</span><span className="cat-btn-count">{noCatCount}</span>
        </div>
      </div>

      {parentCat && (
        <div className="cat-flyout open" style={{ left: 196 }}>
          <div className="cat-flyout-header">
            <div className="cat-flyout-icon">{parentCat.icon || '📦'}</div>
            <div className="cat-flyout-name">{parentCat.name}</div>
            <div className="cat-flyout-count">{parentHasChildren ? children.length + ' sous-catégorie(s)' : parentProduits.length + ' item(s)'}</div>
          </div>
          {parentHasChildren ? (
            children.map((child) => (
              <div key={child.id} className="cat-flyout-item" style={{ display: 'flex', justifyContent: 'space-between' }} onClick={() => setOpenChildId(openChildId === child.id ? null : child.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: '1.1rem' }}>{child.icon || '📦'}</span>{child.name}</div>
                <span style={{ color: 'var(--text-muted)', fontSize: '.7rem' }}>►</span>
              </div>
            ))
          ) : (
            <>
              <div className="cat-flyout-item cat-flyout-item-tout" onClick={() => selectCat(parentCat.id)}>
                <span style={{ fontSize: '1rem' }}>Σ</span><span style={{ fontWeight: 700 }}>TOUT ({parentMatches.length})</span>
              </div>
              {parentProduits.map((p) => <div key={p} className="cat-flyout-item" onClick={() => selectCode(p)}><div className="cat-flyout-item-dot"></div>{p}</div>)}
            </>
          )}
        </div>
      )}

      {childCat && (
        <div className="cat-flyout open" style={{ left: 456 }}>
          <div className="cat-flyout-header">
            <div className="cat-flyout-icon">{childCat.icon || '📦'}</div>
            <div className="cat-flyout-name">{childCat.name}</div>
            <div className="cat-flyout-count">{childProduits.length} item(s)</div>
          </div>
          <div className="cat-flyout-item cat-flyout-item-tout" onClick={() => selectCat(childCat.id)}>
            <span style={{ fontSize: '1rem' }}>Σ</span><span style={{ fontWeight: 700 }}>TOUT ({childMatches.length})</span>
          </div>
          {childProduits.map((p) => <div key={p} className="cat-flyout-item" onClick={() => selectCode(p)}><div className="cat-flyout-item-dot"></div>{p}</div>)}
        </div>
      )}
    </>
  );
}
