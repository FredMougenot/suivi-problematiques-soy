export default function SnapshotConfirmModal({ open, onClose, onConfirm, saving }) {
  if (!open) return null;
  return (
    <div className="modal-overlay open">
      <div className="modal-box">
        <div className="modal-hd">📸 Sauvegarder l'état actuel</div>
        <div className="modal-bd">
          L'état actuel (GH + Usine) va être sauvegardé.<br /><br />
          L'état précédent sera <strong>remplacé</strong> par l'état actuel.<br />
          La prochaine comparaison se fera par rapport à ce nouveau relevé.<br /><br />
          Voulez-vous continuer ?
        </div>
        <div className="modal-ft">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-confirm" onClick={onConfirm} disabled={saving}>{saving ? 'Sauvegarde…' : 'Sauvegarder'}</button>
        </div>
      </div>
    </div>
  );
}
