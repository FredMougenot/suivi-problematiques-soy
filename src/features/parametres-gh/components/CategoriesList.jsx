export default function CategoriesList({ categories, onEdit }) {
  if (categories.length === 0) {
    return <div className="empty-state"><div className="empty-state-title">Aucune catégorie</div></div>;
  }
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      {sorted.map((cat) => (
        <div className="cat-nav-item" key={cat.id} onClick={() => onEdit(cat.id)} style={{ marginBottom: 8, cursor: 'pointer' }}>
          <div className="cat-nav-icon" style={{ background: cat.color + '20', color: cat.color, transform: 'translateZ(0)' }}>{cat.icon}</div>
          <div className="cat-nav-name">{cat.name}</div>
          <div className="cat-nav-count">{cat.rules ? cat.rules.length : 0}</div>
        </div>
      ))}
    </div>
  );
}
