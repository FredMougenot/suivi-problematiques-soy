import { useMemo, useState } from 'react';

export default function CorrespondanceSection({ rows, onSave, onDelete, saving }) {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ trax: '', interne: '', desig: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ trax: '', interne: '', desig: '' });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => r.trax.toLowerCase().includes(q) || r.interne.toLowerCase().includes(q) || r.desig.toLowerCase().includes(q));
  }, [rows, search]);

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({ trax: row.trax, interne: row.interne, desig: row.desig });
  }

  async function saveEdit(id) {
    await onSave({ id, ...editForm });
    setEditingId(null);
  }

  async function saveAdd() {
    if (!addForm.trax.trim()) return;
    await onSave({ id: null, ...addForm });
    setAddForm({ trax: '', interne: '', desig: '' });
    setAddOpen(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Correspondance codes TRAX</h2>
          <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', margin: 0 }}>Table de correspondance entre les codes TRAX, les codes internes SOY et la désignation.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'var(--bg-float)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 'var(--r-md)', padding: '7px 12px', color: 'var(--text-primary)', fontSize: '.82rem', outline: 'none', width: 220 }} />
          <button onClick={() => setAddOpen((o) => !o)} className="add-poids-btn" style={{ marginTop: 0 }}>⊕ Ajouter</button>
        </div>
      </div>

      {addOpen && (
        <div style={{ background: 'var(--bg-float)', border: '1px solid rgba(45,212,160,.2)', borderRadius: 'var(--r-lg)', padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: '.68rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--emerald)', marginBottom: 10 }}>Nouvelle correspondance</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '.65rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase' }}>Code TRAX</label>
              <input value={addForm.trax} onChange={(e) => setAddForm((f) => ({ ...f, trax: e.target.value }))} placeholder="ex: YREOCXX001" style={{ background: 'var(--bg-raised)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 'var(--r-sm)', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '.82rem', outline: 'none', width: 160 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '.65rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase' }}>Code interne</label>
              <input value={addForm.interne} onChange={(e) => setAddForm((f) => ({ ...f, interne: e.target.value }))} placeholder="ex: YR24-01" style={{ background: 'var(--bg-raised)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 'var(--r-sm)', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '.82rem', outline: 'none', width: 140 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: '.65rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase' }}>Désignation</label>
              <input value={addForm.desig} onChange={(e) => setAddForm((f) => ({ ...f, desig: e.target.value }))} placeholder="Description du produit…" onKeyDown={(e) => { if (e.key === 'Enter') saveAdd(); }} style={{ background: 'var(--bg-raised)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 'var(--r-sm)', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '.82rem', outline: 'none', width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={saveAdd} disabled={saving} style={{ padding: '7px 14px', borderRadius: 'var(--r-sm)', background: 'var(--emerald)', border: 'none', color: '#0F1118', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer' }}>Ajouter</button>
              <button onClick={() => setAddOpen(false)} style={{ padding: '7px 12px', borderRadius: 'var(--r-sm)', background: 'transparent', border: '1px solid var(--text-faint)', color: 'var(--text-muted)', fontSize: '.82rem', cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)', borderRadius: 'var(--r-lg)', maxHeight: '65vh', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-raised)' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr style={{ background: 'var(--bg-float)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.6rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-faint)', width: 36 }}>#</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.6rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Code TRAX</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.6rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Code interne</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.6rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Désignation</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-faint)' }}>Aucun résultat</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                {editingId === row.id ? (
                  <>
                    <td style={{ padding: '7px 14px', textAlign: 'center', fontSize: '.72rem', color: 'var(--text-faint)' }}>✏️</td>
                    <td style={{ padding: '4px 8px' }}><input value={editForm.trax} onChange={(e) => setEditForm((f) => ({ ...f, trax: e.target.value }))} style={{ background: 'var(--bg-raised)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4, padding: '3px 7px', color: 'var(--sapphire)', fontWeight: 700, fontSize: '.78rem', width: '100%', outline: 'none' }} /></td>
                    <td style={{ padding: '4px 8px' }}><input value={editForm.interne} onChange={(e) => setEditForm((f) => ({ ...f, interne: e.target.value }))} style={{ background: 'var(--bg-raised)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4, padding: '3px 7px', color: 'var(--emerald)', fontWeight: 600, fontSize: '.78rem', width: '100%', outline: 'none' }} /></td>
                    <td style={{ padding: '4px 8px' }}><input value={editForm.desig} onChange={(e) => setEditForm((f) => ({ ...f, desig: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(row.id); if (e.key === 'Escape') setEditingId(null); }} style={{ background: 'var(--bg-raised)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4, padding: '3px 7px', color: 'var(--text-primary)', fontSize: '.78rem', width: '100%', outline: 'none' }} /></td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button onClick={() => saveEdit(row.id)} style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(45,212,160,.15)', border: 'none', color: 'var(--emerald)', cursor: 'pointer' }}>✓</button>
                      <button onClick={() => setEditingId(null)} style={{ width: 22, height: 22, borderRadius: 4, background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '7px 14px', fontSize: '.72rem', color: 'var(--text-faint)', fontWeight: 700, textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '7px 14px', fontSize: '.78rem', color: 'var(--sapphire)', fontWeight: 700, whiteSpace: 'nowrap' }}>{row.trax}</td>
                    <td style={{ padding: '7px 14px', fontSize: '.78rem', color: 'var(--emerald)', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.interne}</td>
                    <td style={{ padding: '7px 14px', fontSize: '.78rem', color: 'var(--text-secondary)' }}>{row.desig}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button onClick={() => startEdit(row)} title="Modifier" style={{ width: 22, height: 22, borderRadius: 4, background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => onDelete(row)} title="Supprimer" style={{ width: 22, height: 22, borderRadius: 4, background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>✕</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, fontSize: '.74rem', color: 'var(--text-faint)', textAlign: 'right' }}>{filtered.length} entrée{filtered.length > 1 ? 's' : ''}</div>
    </div>
  );
}
