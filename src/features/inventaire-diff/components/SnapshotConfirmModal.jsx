export default function SnapshotConfirmModal({ open, onClose, onConfirm, saving }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-header"><div className="modal-title">📸 Sauvegarder l'état actuel</div></div>
        <div className="modal-body" style={{ lineHeight: 1.6 }}>
          L'état actuel (GH + Usine) va être sauvegardé.<br /><br />
          L'état précédent sera <strong>remplacé</strong> par l'état actuel.<br />
          La prochaine comparaison se fera par rapport à ce nouveau relevé.<br /><br />
          Voulez-vous continuer ?
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={saving}>{saving ? 'Sauvegarde…' : 'Sauvegarder'}</button>
        </div>
      </div>
    </div>
  );
}
