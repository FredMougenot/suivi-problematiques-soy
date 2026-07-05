import { useState, useEffect } from 'react';

export default function TraxModal({ open, initialCode, initialDesc, onClose, onSave, saving }) {
  const [codeTrax, setCodeTrax] = useState('');
  const [codeInt, setCodeInt] = useState('');
  const [desig, setDesig] = useState('');

  useEffect(() => {
    if (open) { setCodeTrax(''); setCodeInt(initialCode || ''); setDesig(initialDesc || ''); }
  }, [open, initialCode, initialDesc]);

  if (!open) return null;

  function handleSave() {
    if (!codeInt && !codeTrax) { alert('Au moins un code est requis.'); return; }
    onSave({ codeTrax, codeInt, desig });
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 16, borderBottom: '1px solid var(--text-faint)' }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <div className="modal-title" style={{ flex: 1 }}>Ajouter à la correspondance</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field" style={{ marginBottom: 12 }}><label className="field-label">Code TRAX</label><input className="field-input" value={codeTrax} onChange={(e) => setCodeTrax(e.target.value)} placeholder="Laisser vide si inconnu…" /></div>
          <div className="field" style={{ marginBottom: 12 }}><label className="field-label">Code interne SOY</label><input className="field-input" value={codeInt} onChange={(e) => setCodeInt(e.target.value)} placeholder="Code produit GH" /></div>
          <div className="field"><label className="field-label">Désignation</label><input className="field-input" value={desig} onChange={(e) => setDesig(e.target.value)} placeholder="Description du produit" /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '…' : 'Ajouter'}</button>
        </div>
      </div>
    </div>
  );
}
