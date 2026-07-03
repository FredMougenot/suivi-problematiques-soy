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
    <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-t">🚚 Ajouter un camion extra</div>
        <div className="fg">
          <label>Heure planifiée <span style={{ color: 'var(--ruby)' }}>*</span></label>
          <input type="time" className="fi" value={heure} onChange={(e) => setHeure(e.target.value)} />
        </div>
        <div className="fg">
          <label>Type de camion</label>
          <select className="fs" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">— Sélectionner —</option>
            <option>CHAUFFÉE</option>
            <option>REEFER</option>
          </select>
        </div>
        <div className="fg">
          <label>N° camion</label>
          <input type="text" className="fi" placeholder="Ex: 1234" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </div>
        <div className="fg">
          <label>Destination</label>
          <select className="fs" value={dest} onChange={(e) => setDest(e.target.value)}>
            <option value="">— Sélectionner —</option>
            <option>GH</option><option>ADVANTECH</option><option>PROACTIVE</option>
            <option>LJDERY</option><option>AUCUN REPARTIR BOBTAIL</option>
          </select>
        </div>
        <div className="m-acts">
          <button className="btn-cx" onClick={onClose}>Annuler</button>
          <button className="btn-ok" onClick={handleConfirm}>Ajouter</button>
        </div>
      </div>
    </div>
  );
}
