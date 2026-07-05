import { useState } from 'react';

export function AddVerifModal({ open, onClose, onConfirm }) {
  const [label, setLabel] = useState('');
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header"><div className="modal-title">🌿 Ajouter une vérification</div></div>
        <div className="modal-body">
          <div className="fg-env"><label>Intitulé <span style={{ color: 'var(--ruby)' }}>*</span></label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Bacs de recyclage couverts…" autoFocus />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={() => { if (!label.trim()) return; onConfirm(label.trim()); setLabel(''); }}>Ajouter</button>
        </div>
      </div>
    </div>
  );
}

export function NcParamsModal({ open, onClose, params, onSave }) {
  const [form, setForm] = useState(params);
  if (!open) return null;
  function set(field, val) { setForm((f) => ({ ...f, [field]: val })); }
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-header"><div className="modal-title">⚙️ Paramètres — Problématiques auto</div></div>
        <div className="modal-body">
          <p style={{ fontSize: '.8rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>Ces valeurs seront appliquées automatiquement à chaque problématique créée depuis les lignes non-conformes.</p>
          <div className="fg-env"><label>Pilier <span style={{ color: 'var(--ruby)' }}>*</span></label>
            <select value={form.pilier} onChange={(e) => set('pilier', e.target.value)}>
              <option value="Environnement">Environnement</option><option value="SST">SST</option><option value="Qualite">Qualité</option>
              <option value="Motivation">Motivation</option><option value="Delais">Délais</option><option value="Informations">Informations</option>
            </select>
          </div>
          <div className="fg-env"><label>Priorité <span style={{ color: 'var(--ruby)' }}>*</span></label>
            <select value={form.priorite} onChange={(e) => set('priorite', e.target.value)}>
              <option value="Critique">Critique</option><option value="Haute">Haute</option><option value="Moyenne">Moyenne</option><option value="Basse">Basse</option>
            </select>
          </div>
          <div className="fg-env"><label>Statut initial</label>
            <select value={form.statut} onChange={(e) => set('statut', e.target.value)}>
              <option value="À traiter">À traiter</option><option value="En cours">En cours</option>
            </select>
          </div>
          <div className="fg-env"><label>Responsable par défaut</label>
            <input type="text" value={form.responsable} onChange={(e) => set('responsable', e.target.value)} placeholder="Nom (optionnel)…" />
          </div>
          <div className="fg-env"><label>Soumis par</label>
            <input type="text" value={form.soumis_par} onChange={(e) => set('soumis_par', e.target.value)} placeholder="Ex: Système / Automatique…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

export function NcConfirmModal({ open, ncList, onClose, onConfirm, submitting }) {
  if (!open) return null;
  const n = ncList.length;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-header"><div className="modal-title">⚠️ Soumettre les non-conformités</div></div>
        <div className="modal-body">
          <p style={{ fontSize: '.88rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.6 }}>
            {n} ligne{n > 1 ? 's' : ''} non-conforme{n > 1 ? 's' : ''} détectée{n > 1 ? 's' : ''}. Une problématique sera créée dans le registre pour chacune.
          </p>
          <div style={{ background: 'var(--bg-float)', border: '1px solid var(--text-faint)', borderRadius: 'var(--r-md)', padding: '10px 14px', maxHeight: 200, overflowY: 'auto', fontSize: '.83rem', lineHeight: 1.9 }}>
            {ncList.map((item) => <div key={item.key}><span style={{ color: 'var(--ruby)', marginRight: 8 }}>✕</span>{item.label}</div>)}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={submitting}>{submitting ? 'Création en cours…' : 'Créer les problématiques'}</button>
        </div>
      </div>
    </div>
  );
}
