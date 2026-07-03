import { computeItemCount } from '../camionsLogic';

export default function CamionsSection({ camions, camionActifId, onSelectCamion, onAddCamion, onDeleteCamion }) {
  return (
    <div className="camions-section">
      <div className="camions-header">🚛 CAMIONS</div>
      {camions.map((cam) => {
        const itemCount = computeItemCount(cam);
        const newCount = cam.items.filter((it) => it.isNew).length;
        return (
          <div key={cam.id} className={`camion-card${cam.id === camionActifId ? ' active' : ''}`} onClick={() => onSelectCamion(cam.id)}>
            <div className="camion-nom">{cam.nom}</div>
            <div className="camion-count">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
              {newCount > 0 && <span className="camion-badge">🆕 {newCount}</span>}
            </div>
            {camions.length > 1 && (
              <button className="camion-delete" title="Supprimer ce camion" onClick={(e) => { e.stopPropagation(); onDeleteCamion(cam.id); }}>🗑️</button>
            )}
          </div>
        );
      })}
      <div className="btn-add-camion" onClick={onAddCamion}>➕ Ajouter un camion</div>
    </div>
  );
}
