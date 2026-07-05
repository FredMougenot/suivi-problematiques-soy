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
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className="modal-title">Paramètres</div>
            <div className="modal-subtitle">Ponctualité des camions</div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 18 }}>
            <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>Tolérance 1 — Acceptable</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="field-input" type="number" min={0} max={180} value={seuil1} onChange={(e) => setSeuil1(parseInt(e.target.value) || 0)} />
              <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', flexShrink: 0, width: 28 }}>min</span>
            </div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>Retard acceptable : un camion est "à l'heure" si son écart est inférieur ou égal à cette valeur.</div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>Tolérance 2 — Critique</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="field-input" type="number" min={0} max={360} value={seuil2} onChange={(e) => setSeuil2(parseInt(e.target.value) || 0)} />
              <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', flexShrink: 0, width: 28 }}>min</span>
            </div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>Au-delà de cette valeur, le retard passe en rouge critique sur tous les indicateurs.</div>
          </div>
          <div>
            <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>Objectif de ponctualité</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="field-input" type="number" min={0} max={100} value={objectif} onChange={(e) => setObjectif(parseInt(e.target.value) || 0)} />
              <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', flexShrink: 0, width: 28 }}>%</span>
            </div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>Ligne de référence sur le graphique de tendance. Le KPI est "bon" au-dessus de ce seuil.</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => onSave({ seuil1, seuil2, objectif })}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
