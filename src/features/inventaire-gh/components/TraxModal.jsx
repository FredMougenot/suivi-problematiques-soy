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
    <div className="trax-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="trax-box">
        <div className="trax-hd">
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <div className="trax-title">Ajouter à la correspondance</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', padding: 4 }}>✕</button>
        </div>
        <div className="trax-body">
          <div><div className="trax-lbl">Code TRAX</div><input className="trax-inp" value={codeTrax} onChange={(e) => setCodeTrax(e.target.value)} placeholder="Laisser vide si inconnu…" /></div>
          <div><div className="trax-lbl">Code interne SOY</div><input className="trax-inp" value={codeInt} onChange={(e) => setCodeInt(e.target.value)} placeholder="Code produit GH" /></div>
          <div><div className="trax-lbl">Désignation</div><input className="trax-inp" value={desig} onChange={(e) => setDesig(e.target.value)} placeholder="Description du produit" /></div>
        </div>
        <div className="trax-ft">
          <button className="trax-btn-cancel" onClick={onClose}>Annuler</button>
          <button className="trax-btn-save" onClick={handleSave} disabled={saving}>{saving ? '…' : 'Ajouter'}</button>
        </div>
      </div>
    </div>
  );
}
