import { useState } from 'react';

export default function AddCamionModal({ open, onClose, onConfirm }) {
  const [heure, setHeure] = useState('08:00');
  const [type, setType] = useState('');
  const [numero, setNumero] = useState('');
  const [dest, setDest] = useState('');

  if (!open) return null;

  function handleConfirm() {
    if (!heure) return;
    onConfirm({ heure, type, numero, dest });
    setHeure('08:00'); setType(''); setNumero(''); setDest('');
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div className="modal-header"><div className="modal-title">🚚 Ajouter un camion extra</div></div>
        <div className="modal-body">
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label">Heure planifiée <span style={{ color: 'var(--ruby)' }}>*</span></label>
            <input type="time" className="field-input" value={heure} onChange={(e) => setHeure(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label">Type de camion</label>
            <select className="field-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">— Sélectionner —</option>
              <option>CHAUFFÉE</option>
              <option>REEFER</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label">N° camion</label>
            <input type="text" className="field-input" placeholder="Ex: 1234" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Destination</label>
            <select className="field-select" value={dest} onChange={(e) => setDest(e.target.value)}>
              <option value="">— Sélectionner —</option>
              <option>GH</option><option>ADVANTECH</option><option>PROACTIVE</option>
              <option>LJDERY</option><option>AUCUN REPARTIR BOBTAIL</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleConfirm}>Ajouter</button>
        </div>
      </div>
    </div>
  );
}
