import { useState, useEffect } from 'react';

export default function StatsParamsModal({ open, onClose, seuils, onSave, saving }) {
  const [seuil1, setSeuil1] = useState(30);
  const [seuil2, setSeuil2] = useState(60);
  const [objectif, setObjectif] = useState(80);

  useEffect(() => {
    if (open) {
      setSeuil1(seuils.seuil1);
      setSeuil2(seuils.seuil2);
      setObjectif(seuils.objectif);
    }
  }, [open, seuils]);

  if (!open) return null;

  return (
    <div className="overlay-param open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-param">
        <div className="mp-hd">
          <div>
            <div className="mp-title">Paramètres</div>
            <div className="mp-sub">Ponctualité des camions</div>
          </div>
          <button className="mp-x" onClick={onClose}>✕</button>
        </div>
        <div className="mp-bd">
          <div className="mp-field">
            <label className="mp-lbl">Tolérance 1 — Acceptable</label>
            <div className="mp-row">
              <input className="mp-inp" type="number" min={0} max={180} value={seuil1} onChange={(e) => setSeuil1(parseInt(e.target.value) || 0)} />
              <span className="mp-unit">min</span>
            </div>
            <div className="mp-desc">Retard acceptable : un camion est "à l'heure" si son écart est inférieur ou égal à cette valeur.</div>
          </div>
          <div className="mp-field">
            <label className="mp-lbl">Tolérance 2 — Critique</label>
            <div className="mp-row">
              <input className="mp-inp" type="number" min={0} max={360} value={seuil2} onChange={(e) => setSeuil2(parseInt(e.target.value) || 0)} />
              <span className="mp-unit">min</span>
            </div>
            <div className="mp-desc">Au-delà de cette valeur, le retard passe en rouge critique sur tous les indicateurs.</div>
          </div>
          <div className="mp-field">
            <label className="mp-lbl">Objectif de ponctualité</label>
            <div className="mp-row">
              <input className="mp-inp" type="number" min={0} max={100} value={objectif} onChange={(e) => setObjectif(parseInt(e.target.value) || 0)} />
              <span className="mp-unit">%</span>
            </div>
            <div className="mp-desc">Ligne de référence sur le graphique de tendance. Le KPI est "bon" au-dessus de ce seuil.</div>
          </div>
        </div>
        <div className="mp-ft">
          <button className="mp-cancel" onClick={onClose}>Annuler</button>
          <button className="mp-save" disabled={saving} onClick={() => onSave({ seuil1, seuil2, objectif })}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
