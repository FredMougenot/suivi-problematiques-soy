import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlanningStore } from '../../store/usePlanningStore';
import {
  useResponsablesFullQuery, useSaveResponsableMutation, useDeleteResponsableMutation, useDeleteAllProblematiquesMutation,
} from './queries';
import './parametres-prob.css';

let tmpIdCounter = -1;

export default function ParametresProbPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const respQ = useResponsablesFullQuery();
  const saveMutation = useSaveResponsableMutation();
  const deleteMutation = useDeleteResponsableMutation();
  const deleteAllMutation = useDeleteAllProblematiquesMutation();

  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (respQ.data) setRows(respQ.data.map((r) => ({ ...r, dirty: false })));
  }, [respQ.data]);

  function addRow() {
    setRows((prev) => [...prev, { id: tmpIdCounter--, nom: '', dirty: true }]);
  }

  function updateNom(idx, val) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, nom: val, dirty: true } : r)));
  }

  async function deleteRow(idx) {
    const r = rows[idx];
    try {
      await deleteMutation.mutateAsync(r.id);
      setRows((prev) => prev.filter((_, i) => i !== idx));
      addToast('Responsable supprimé.', 'success');
    } catch (e) { addToast('Erreur : ' + e.message, 'error'); }
  }

  async function saveAll() {
    const dirty = rows.filter((r) => r.dirty && r.nom.trim());
    if (!dirty.length) { addToast('Aucune modification à enregistrer.', 'info'); return; }
    setSaving(true);
    let errors = 0;
    for (const r of dirty) {
      try {
        const result = await saveMutation.mutateAsync({ id: r.id > 0 ? r.id : null, nom: r.nom.trim() });
        setRows((prev) => prev.map((row) => (row === r ? { ...row, id: result.id, dirty: false } : row)));
      } catch { errors++; }
    }
    setSaving(false);
    if (errors) addToast(errors + ' erreur(s) lors de la sauvegarde.', 'error');
    else addToast('Responsables enregistrés ✓', 'success');
  }

  async function handleDeleteAll() {
    try {
      const n = await deleteAllMutation.mutateAsync();
      if (!n) { addToast('Aucune problématique à supprimer.', 'info'); return; }
      addToast(n + ' problématique(s) supprimée(s) ✓', 'success');
    } catch (e) { addToast('Erreur : ' + e.message, 'error'); }
  }

  function confirmDeleteAll() {
    if (confirm('Supprimer définitivement toutes les problématiques ? Cette action est irréversible.')) handleDeleteAll();
  }

  return (
    <div className="tool-main">
      <div style={{ marginBottom: 12 }}>
        <Link to="/problematiques" className="btn btn-secondary">← Problématiques</Link>
      </div>
      <div className="page-eyebrow">Configuration</div>
      <div className="page-title">Responsables</div>
      <div className="page-sub">Définissez la liste des responsables disponibles dans le formulaire de création de problématiques.</div>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={addRow}>Ajouter</button>
        <button className="btn btn-primary" onClick={saveAll} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>

      <div className="table-shell" style={{ marginBottom: 40 }}>
        <table className="data-table" style={{ minWidth: 320 }}>
          <thead><tr><th>Nom du responsable</th><th style={{ width: 48, textAlign: 'center' }}>—</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 18, fontSize: '.85rem' }}>Aucun responsable. Cliquez sur Ajouter.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id}>
                <td><input className="inp-resp" value={r.nom} placeholder="Nom du responsable…" onChange={(e) => updateNom(i, e.target.value)} /></td>
                <td style={{ textAlign: 'center', width: 48 }}><button className="btn-icon" onClick={() => deleteRow(i)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="danger-zone">
        <div className="danger-eyebrow">Zone dangereuse</div>
        <div className="danger-title">Supprimer toutes les problématiques</div>
        <div className="danger-sub">Supprime définitivement tous les enregistrements de la table des problématiques. Cette action est irréversible.</div>
        <button className="btn btn-danger" onClick={confirmDeleteAll}>Tout supprimer</button>
      </div>
    </div>
  );
}
