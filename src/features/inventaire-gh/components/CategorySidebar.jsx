import { useState } from 'react';
import { matchesCategory, escH } from '../logic';

export default function CategorySidebar({ categories, allInventory, activeCatId, onSelectCategory, onSelectProduct, extraContent }) {
  const [openParentId, setOpenParentId] = useState(null); // flyout niveau 1 (sous-catégories OU produits)
  const [openChildId, setOpenChildId] = useState(null); // flyout niveau 2 (produits d'une sous-catégorie)

  const roots = [...categories].filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));

  function closeFlyouts() { setOpenParentId(null); setOpenChildId(null); }

  function handleCatClick(cat) {
    const hasChildren = categories.some((c) => c.parent_id === cat.id);
    if (hasChildren) {
      setOpenParentId(openParentId === cat.id ? null : cat.id);
      setOpenChildId(null);
    } else {
      setOpenParentId(openParentId === cat.id ? null : cat.id);
      setOpenChildId(null);
    }
  }

  function selectCategory(catId) {
    closeFlyouts();
    onSelectCategory(catId);
  }

  function selectProduct(produit) {
    closeFlyouts();
    onSelectProduct(produit);
  }

  const parentCat = categories.find((c) => c.id === openParentId);
  const parentHasChildren = parentCat && categories.some((c) => c.parent_id === parentCat.id);
  const children = parentCat ? categories.filter((c) => c.parent_id === parentCat.id).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const parentMatches = parentCat && !parentHasChildren ? allInventory.filter((r) => matchesCategory(r, parentCat)) : [];
  const parentProduits = parentMatches.length ? [...new Set(parentMatches.map((r) => r._raw?.[1] || '').filter(Boolean))] : [];

  const childCat = categories.find((c) => c.id === openChildId);
  const childMatches = childCat ? allInventory.filter((r) => matchesCategory(r, childCat)) : [];
  const childProduits = childMatches.length ? [...new Set(childMatches.map((r) => r._raw?.[1] || '').filter(Boolean))] : [];

  return (
    <>
      {(openParentId || openChildId) && <div className="cat-overlay open" onClick={closeFlyouts}></div>}

      <div className="cat-sidebar">
        <div className={`cat-btn${activeCatId === 'EMPTY_TABLE' ? ' active' : ''}`} title="Tableau vide" onClick={() => selectCategory('EMPTY_TABLE')}>
          <span className="cat-btn-icon">∅</span><span className="cat-btn-name">VIDE</span>
        </div>
        <div className={`cat-btn${activeCatId === null ? ' active' : ''}`} title="Tout afficher" onClick={() => selectCategory(null)}>
          <span className="cat-btn-icon">Σ</span><span className="cat-btn-name">TOUT</span>
        </div>

        {roots.map((cat) => {
          const hasChildren = categories.some((c) => c.parent_id === cat.id);
          return (
            <div
              key={cat.id}
              className={`cat-btn${activeCatId === cat.id ? ' active' : ''}`}
              title={cat.name}
              style={activeCatId === cat.id ? { borderColor: cat.color, background: cat.color + '22' } : undefined}
              onClick={() => handleCatClick(cat)}
            >
              <span className="cat-btn-icon">{cat.icon || '📦'}</span>
              <span className="cat-btn-name">{cat.name}</span>
              {hasChildren && <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '.7rem' }}>►</span>}
            </div>
          );
        })}

        <div className={`cat-btn${activeCatId === 'NO_CATEGORY' ? ' active' : ''}`} title="Lignes sans catégorie" onClick={() => selectCategory('NO_CATEGORY')}>
          <span className="cat-btn-icon">📋</span><span className="cat-btn-name">SANS CAT.</span>
        </div>

        {extraContent}
      </div>

      {/* Flyout niveau 1 */}
      {parentCat && (
        <div className="cat-flyout open" style={{ left: 196 }}>
          <div className="cat-flyout-header">
            <div className="cat-flyout-icon">{parentCat.icon || '📦'}</div>
            <div className="cat-flyout-name">{parentCat.name}</div>
            <div className="cat-flyout-count">{parentHasChildren ? children.length + ' sous-catégorie(s)' : parentProduits.length + ' item(s)'}</div>
          </div>
          {parentHasChildren ? (
            children.length === 0 ? (
              <div style={{ padding: 16, fontSize: '.78rem', color: 'var(--text-faint)', textAlign: 'center' }}>Aucune sous-catégorie</div>
            ) : (
              children.map((child) => (
                <div key={child.id} className="cat-flyout-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => setOpenChildId(openChildId === child.id ? null : child.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: '1.1rem' }}>{child.icon || '📦'}</span>{child.name}</div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '.7rem' }}>►</span>
                </div>
              ))
            )
          ) : parentProduits.length === 0 ? (
            <div style={{ padding: 16, fontSize: '.78rem', color: 'var(--text-faint)', textAlign: 'center' }}>Aucun item dans l'inventaire actuel</div>
          ) : (
            <>
              <div className="cat-flyout-item cat-flyout-item-tout" onClick={() => selectCategory(parentCat.id)}>
                <span style={{ fontSize: '1rem' }}>Σ</span><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>TOUT ({parentMatches.length})</span>
              </div>
              {parentProduits.map((p) => (
                <div key={p} className="cat-flyout-item" onClick={() => selectProduct(p)}><div className="cat-flyout-item-dot"></div>{p}</div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Flyout niveau 2 (produits d'une sous-catégorie) */}
      {childCat && (
        <div className="cat-flyout open" style={{ left: 456 }}>
          <div className="cat-flyout-header">
            <div className="cat-flyout-icon">{childCat.icon || '📦'}</div>
            <div className="cat-flyout-name">{childCat.name}</div>
            <div className="cat-flyout-count">{childProduits.length} item(s)</div>
          </div>
          <div className="cat-flyout-item cat-flyout-item-tout" onClick={() => selectCategory(childCat.id)}>
            <span style={{ fontSize: '1rem' }}>Σ</span><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>TOUT ({childMatches.length})</span>
          </div>
          {childProduits.length === 0 ? (
            <div style={{ padding: 16, fontSize: '.78rem', color: 'var(--text-faint)', textAlign: 'center' }}>Aucun item dans l'inventaire actuel</div>
          ) : (
            childProduits.map((p) => (
              <div key={p} className="cat-flyout-item" onClick={() => selectProduct(p)}><div className="cat-flyout-item-dot"></div>{p}</div>
            ))
          )}
        </div>
      )}
    </>
  );
}
