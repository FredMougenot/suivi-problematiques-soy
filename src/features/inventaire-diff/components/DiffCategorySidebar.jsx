import { getRootCategory } from '../logic';

export default function DiffCategorySidebar({ categories, diffRows, activeCat, onSelectCat }) {
  const rootCats = categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));

  function countForRoot(cat) {
    return diffRows.filter((r) => {
      if (!r._cat) return false;
      let c = r._cat;
      while (c) { if (c.id === cat.id) return true; c = categories.find((x) => x.id === c.parent_id); }
      return false;
    }).length;
  }

  const noCatCount = diffRows.filter((r) => !r._cat).length;

  return (
    <div className="cat-sidebar">
      <div className={`cat-btn${activeCat === null ? ' active' : ''}`} onClick={() => onSelectCat(null)}>
        <span className="cat-btn-icon">Σ</span><span className="cat-btn-name">TOUT</span><span className="cat-btn-count">{diffRows.length}</span>
      </div>
      {rootCats.map((cat) => {
        const count = countForRoot(cat);
        if (count === 0) return null;
        return (
          <div key={cat.id} className={`cat-btn${activeCat === cat.id ? ' active' : ''}`} onClick={() => onSelectCat(cat.id)}>
            <span className="cat-btn-icon">{cat.icon || '📦'}</span><span className="cat-btn-name">{cat.name}</span><span className="cat-btn-count">{count}</span>
          </div>
        );
      })}
      {noCatCount > 0 && (
        <div className={`cat-btn${activeCat === 'NO_CAT' ? ' active' : ''}`} onClick={() => onSelectCat('NO_CAT')}>
          <span className="cat-btn-icon">📋</span><span className="cat-btn-name">SANS CAT.</span><span className="cat-btn-count">{noCatCount}</span>
        </div>
      )}
    </div>
  );
}
