import { useState } from 'react';
import { COLORS, EMOJIS, COLUMNS, OPERATORS, buildPreviewParts } from '../logic';

export default function CategoryEditor({ cat, allCategories, onChange, onSave, onDelete, onBack, saving }) {
  const [emojiOpen, setEmojiOpen] = useState(false);

  function set(field, val) { onChange({ ...cat, [field]: val }); }

  function addRule() {
    const rules = [...(cat.rules || []), { col: '1', operator: 'contains', value: '', logic: 'AND' }];
    set('rules', rules);
  }
  function updateRule(idx, field, val) {
    const rules = cat.rules.map((r, i) => (i === idx ? { ...r, [field]: val } : r));
    set('rules', rules);
  }
  function toggleLogic(idx) {
    const rules = cat.rules.map((r, i) => (i === idx ? { ...r, logic: r.logic === 'OR' ? 'AND' : 'OR' } : r));
    set('rules', rules);
  }
  function deleteRule(idx) {
    set('rules', cat.rules.filter((_, i) => i !== idx));
  }

  const preview = buildPreviewParts(cat);
  const parentOptions = allCategories.filter((c) => c.id !== cat.id);

  return (
    <div>
      <div className="cat-editor-hd">
        <div className="cat-emoji-btn" style={{ background: cat.color + '20', color: cat.color }} onClick={() => setEmojiOpen((o) => !o)}>
          <div>{cat.icon}</div>
          {emojiOpen && (
            <div className="emoji-picker-pop">
              {EMOJIS.map((e) => (
                <div key={e} className="emoji-opt" onClick={(ev) => { ev.stopPropagation(); set('icon', e); setEmojiOpen(false); }}>{e}</div>
              ))}
            </div>
          )}
        </div>
        <input type="text" className="cat-name-input" value={cat.name} placeholder="Nom de la catégorie…" onChange={(e) => set('name', e.target.value)} />
      </div>

      <div style={{ margin: '12px 0' }}>
        <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Catégorie parente (optionnel)</label>
        <select value={cat.parent_id || ''} onChange={(e) => set('parent_id', e.target.value || null)} style={{ width: '100%', padding: 8, background: 'var(--bg-float)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '.85rem' }}>
          <option value="">Aucune (catégorie racine)</option>
          {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      <div className="color-row">
        {COLORS.map((c) => (
          <div key={c} className={`color-swatch${cat.color === c ? ' active' : ''}`} style={{ background: c }} onClick={() => set('color', c)}></div>
        ))}
      </div>

      <div className="rules-title">📐 Règles de catégorisation</div>
      <div className="rules-table">
        <div className="rules-table-header"><div>Logique</div><div>Colonne</div><div>Opérateur</div><div>Valeur</div><div></div></div>
        <div>
          {(!cat.rules || cat.rules.length === 0) ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: '.78rem', color: 'var(--text-faint)' }}>Aucune règle — cliquez sur Ajouter une règle</div>
          ) : cat.rules.map((rule, i) => (
            <div className="rule-row" key={i}>
              <div>{i === 0 ? <span style={{ fontSize: '.72rem', color: 'var(--text-faint)', fontWeight: 700 }}>SI</span> : <span className={`rule-logic-badge ${rule.logic || 'AND'}`} onClick={() => toggleLogic(i)}>{rule.logic || 'AND'}</span>}</div>
              <div>
                <select className="rule-select" value={rule.col} onChange={(e) => updateRule(i, 'col', e.target.value)}>
                  {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <select className="rule-select" value={rule.operator} onChange={(e) => updateRule(i, 'operator', e.target.value)}>
                  {OPERATORS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              <div><input className="rule-input" value={rule.value || ''} placeholder="valeur…" onChange={(e) => updateRule(i, 'value', e.target.value)} /></div>
              <div><button className="rule-del-btn" onClick={() => deleteRule(i)}>✕</button></div>
            </div>
          ))}
        </div>
      </div>

      <button className="add-rule-btn" onClick={addRule}>⊕ Ajouter une règle</button>

      <div className="preview-section">
        <div className="preview-title">👁 Aperçu de la règle</div>
        <div style={{ fontSize: '.8rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
          {!preview ? 'Aucune règle définie.' : preview.map((p, i) => (
            <div key={i}>
              <span style={{ color: p.isFirst ? 'var(--sapphire)' : (p.logic === 'OR' ? 'var(--amber)' : 'var(--sapphire)'), fontWeight: 700 }}>{p.logic}</span>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>{p.col}</span>{' '}
              <span style={{ color: 'var(--emerald)' }}>{p.op}</span>{' '}
              {p.val ? <strong>"{p.val}"</strong> : <em style={{ color: 'var(--ruby)' }}>valeur manquante</em>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn-secondary" onClick={onBack}>← Retour</button>
        <button className="btn-primary" onClick={onSave} style={{ marginLeft: 'auto' }} disabled={saving}>{saving ? 'Enregistrement…' : '💾 Sauvegarder'}</button>
        <button className="btn-danger" onClick={onDelete}>🗑 Supprimer</button>
      </div>
    </div>
  );
}
