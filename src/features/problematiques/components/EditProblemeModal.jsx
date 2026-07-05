import { useEffect, useState } from 'react';
import { PILIERS, localToday } from '../logic';

const emptyForm = {
  intitule: '', pilier: 'SST', priorite: 'Moyenne', statut: 'À traiter', responsable: '',
  date_prevue: '', date_resolue: '', description: '', cause: '', action: '', resultat: '',
};

export default function EditProblemeModal({ open, problemeId, allProblems, responsables, onClose, onSave, saving }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (problemeId) {
      const p = allProblems.find((x) => x.id === problemeId);
      if (p) {
        setForm({
          intitule: p.intitule || '', pilier: p.pilier || 'SST', priorite: p.priorite || 'Moyenne', statut: p.statut || 'À traiter',
          responsable: p.responsable || '', date_prevue: p.date_prevue || '', date_resolue: p.date_resolue || '',
          description: p.description || '', cause: p.cause || '', action: p.action || '', resultat: p.resultat || '',
        });
      }
    } else {
      setForm(emptyForm);
    }
  }, [open, problemeId, allProblems]);

  if (!open) return null;

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSave() {
    onSave(form);
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="modal-title">{problemeId ? 'Modifier la problématique' : 'Soumettre une problématique'}</div>
            {problemeId && <div className="modal-subtitle">#{String(problemeId).padStart(4, '0')}</div>}
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field-grid">
            <div className="field full">
              <label className="field-label">Intitulé</label>
              <input className="field-input" value={form.intitule} onChange={(e) => set('intitule', e.target.value)} placeholder="Intitulé de la problématique…" />
            </div>
            <div className="field">
              <label className="field-label">Pilier</label>
              <select className="field-select" value={form.pilier} onChange={(e) => set('pilier', e.target.value)}>
                {PILIERS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Priorité</label>
              <select className="field-select" value={form.priorite} onChange={(e) => set('priorite', e.target.value)}>
                <option>Critique</option><option>Haute</option><option>Moyenne</option><option>Basse</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Statut</label>
              <select className="field-select" value={form.statut} onChange={(e) => set('statut', e.target.value)}>
                <option>À traiter</option><option>En cours</option><option>Résolu</option><option>Annulé</option><option>Clôturé</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Responsable</label>
              <select className="field-select" value={form.responsable} onChange={(e) => set('responsable', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {responsables.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Date prévue</label>
              <input className="field-input" type="date" value={form.date_prevue} onChange={(e) => set('date_prevue', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Date résolue</label>
              <input className="field-input" type="date" value={form.date_resolue} onChange={(e) => set('date_resolue', e.target.value)} />
            </div>
            <div className="field full">
              <label className="field-label">Description</label>
              <textarea className="field-textarea" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Description détaillée…" />
            </div>
            <div className="field full">
              <label className="field-label">Cause</label>
              <textarea className="field-textarea" rows={3} value={form.cause} onChange={(e) => set('cause', e.target.value)} placeholder="Cause racine identifiée…" />
            </div>
            <div className="field full">
              <label className="field-label">Action</label>
              <textarea className="field-textarea" rows={3} value={form.action} onChange={(e) => set('action', e.target.value)} placeholder="Actions correctives mises en place…" />
            </div>
            <div className="field full">
              <label className="field-label">Résultat</label>
              <textarea className="field-textarea" rows={3} value={form.resultat} onChange={(e) => set('resultat', e.target.value)} placeholder="Résultats obtenus…" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
}
