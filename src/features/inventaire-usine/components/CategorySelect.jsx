import { Fragment } from 'react';

export default function CategorySelect({ categories, value, onChange }) {
  const roots = categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const children = categories.filter((c) => c.parent_id).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <select className="sel-cell" value={value || ''} onChange={(e) => onChange(e.target.value, e.target.options[e.target.selectedIndex]?.dataset.nom || '')}>
      <option value="">— Sélectionner —</option>
      {roots.map((root) => (
        <Fragment key={root.id}>
          <option value={root.id} data-nom={root.name}>{root.icon || '📦'} {root.name}</option>
          {children.filter((c) => c.parent_id === root.id).map((child) => (
            <option key={child.id} value={child.id} data-nom={child.name}>&nbsp;&nbsp;↳ {child.icon || '📦'} {child.name}</option>
          ))}
        </Fragment>
      ))}
    </select>
  );
}
