import { useState, useEffect } from 'react';
import { hexToRgb } from '../constants';
import ColorField from './ColorField';

function Preview({ row }) {
  const style = {};
  if (row.text_color && /^#[0-9A-Fa-f]{6}$/.test(row.text_color)) style.color = row.text_color;
  if (row.font_weight) style.fontWeight = row.font_weight;
  if (row.border_color && /^#[0-9A-Fa-f]{6}$/.test(row.border_color) && row.border_opacity) {
    const rgb = hexToRgb(row.border_color);
    style.border = `1px solid rgba(${rgb},${row.border_opacity})`;
    if (row.has_background) {
      style.background = `rgba(${rgb},${row.border_opacity})`;
      style.padding = '2px 9px';
      style.borderRadius = 20;
    }
  }
  return <span className="val-preview" style={style}>{row.valeur || '—'}</span>;
}

export default function ParamSection({ category, rows, onAdd, onDelete, onSave, saving }) {
  const [localRows, setLocalRows] = useState(rows);

  useEffect(() => { setLocalRows(rows); }, [rows]);

  function updateField(id, field, value) {
    setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  return (
    <div className="section">
      <div className="section-head">
        <div className="section-meta">
          <div className="section-name">
            {category.label}
            <span className="item-count">{localRows.length} valeur{localRows.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="section-desc">{category.desc}</div>
        </div>
        <div className="section-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onSave(category.key, localRows)} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onAdd(category.key)}>Ajouter</button>
        </div>
      </div>

      {category.note && (
        <div className="note-style">ⓘ {category.note}</div>
      )}

      <div className="ptbl-wrap">
        <div className="ptbl-scroll">
          <table className="ptbl">
            <thead>
              <tr>
                <th className="th-num">#</th>
                <th>Valeur</th>
                <th>Aperçu</th>
                <th className="th-style">text_color</th>
                <th className="th-style">border_color</th>
                <th style={{ width: 90 }}>border_opacity</th>
                <th style={{ width: 90 }}>font_weight</th>
                <th style={{ width: 110, textAlign: 'center' }}>has_background</th>
                {category.key === 'statut_ligne' && <th style={{ width: 90, textAlign: 'center' }}>Délai NL (h)</th>}
                <th className="th-act"></th>
              </tr>
            </thead>
            <tbody>
              {localRows.length === 0 ? (
                <tr className="empty-row"><td colSpan={9}>Aucune valeur — cliquez sur Ajouter.</td></tr>
              ) : (
                localRows.map((row, i) => (
                  <tr key={row.id}>
                    <td className="td-num">{i + 1}</td>
                    <td>
                      <input className="inp-val" type="text" value={row.valeur || ''}
                        onChange={(e) => updateField(row.id, 'valeur', e.target.value)} />
                    </td>
                    <td><Preview row={row} /></td>
                    <td><ColorField value={row.text_color} onChange={(v) => updateField(row.id, 'text_color', v)} /></td>
                    <td><ColorField value={row.border_color} onChange={(v) => updateField(row.id, 'border_color', v)} /></td>
                    <td>
                      <input className="inp-short" type="text" placeholder="0.35" value={row.border_opacity || ''}
                        onChange={(e) => updateField(row.id, 'border_opacity', e.target.value)} />
                    </td>
                    <td>
                      <input className="inp-short" type="text" placeholder="400" value={row.font_weight || ''}
                        onChange={(e) => updateField(row.id, 'font_weight', e.target.value)} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <label className="tog-wrap" title="Appliquer un fond coloré">
                        <input type="checkbox" className="tog-chk" checked={!!row.has_background}
                          onChange={(e) => updateField(row.id, 'has_background', e.target.checked)} />
                        <span className="tog-slider"></span>
                      </label>
                    </td>
                    {category.key === 'statut_ligne' && (
                      <td style={{ textAlign: 'center' }}>
                        <input type="number" min={0} max={48} step={0.5} placeholder="—"
                          className="inp-short" style={{ width: 64 }}
                          value={row.delai_nl ?? ''}
                          onChange={(e) => updateField(row.id, 'delai_nl', e.target.value)} />
                      </td>
                    )}
                    <td className="td-act">
                      <button className="btn-icon" onClick={() => onDelete(row.id, category.key)} title="Supprimer">✕</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
