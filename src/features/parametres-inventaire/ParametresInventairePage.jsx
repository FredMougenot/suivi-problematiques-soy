import { useEffect, useState } from 'react';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useParamsInventaireQuery, useSaveItemMutation, useDeleteItemMutation } from './queries';
import { loadRecs, saveRecs, fmtDate, prochaineInfo } from './logic';
import './parametres-inventaire.css';
import LoadingOverlay from '../../design-system/LoadingOverlay';

let tmpIdCounter = -1;

export default function ParametresInventairePage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const paramsQ = useParamsInventaireQuery();
  const saveMutation = useSaveItemMutation();
  const deleteMutation = useDeleteItemMutation();
  const [rows, setRows] = useState([]);
  const [recurrences, setRecurrences] = useState(loadRecs());
  const [newRecInput, setNewRecInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (paramsQ.data) setRows(paramsQ.data); }, [paramsQ.data]);

  const retardCount = rows.filter((r) => prochaineInfo(r).cls === 'overdue').length;
  const sortedRecs = [...recurrences].sort((a, b) => a - b);

  function addRecurrence() { const val = parseInt(newRecInput, 10); if (isNaN(val) || val < 0) { addToast('Valeur invalide', 'error'); return; } if (recurrences.includes(val)) { addToast('Récurrence déjà existante', 'error'); return; } const next = [...recurrences, val]; setRecurrences(next); saveRecs(next); setNewRecInput(''); addToast(val + 'j ajouté ✓', 'success'); }
  function removeRec(val) { if (rows.some((r) => r.recurrence === val)) { addToast('Impossible — des items utilisent cette récurrence', 'error'); return; } const next = recurrences.filter((r) => r !== val); setRecurrences(next); saveRecs(next); addToast('Récurrence supprimée', 'success'); }
  function markDirty(idx, field, val) { setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val, dirty: true } : r))); }
  function addRow() { const nextNum = rows.length > 0 ? Math.max(...rows.map((r) => r.item_number)) + 1 : 1; const defaultRec = sortedRecs.find((r) => r >= 30) ?? recurrences[0] ?? 30; setRows((prev) => [...prev, { id: tmpIdCounter--, item_number: nextNum, nom: 'Item ' + nextNum, recurrence: defaultRec, derniere_verification: null, dirty: true, isNew: true }]); }
  async function removeRow(idx) { const r = rows[idx]; try { await deleteMutation.mutateAsync(r); setRows((prev) => prev.filter((_, i) => i !== idx)); addToast('Item supprimé', 'success'); } catch (e) { addToast('Erreur suppression : ' + e.message, 'error'); } }
  async function saveAll() { const dirty = rows.filter((r) => r.dirty); if (!dirty.length) { addToast('Aucune modification', 'info'); return; } setSaving(true); let saved = 0, errors = 0; for (const r of dirty) { try { const updated = await saveMutation.mutateAsync(r); setRows((prev) => prev.map((row) => (row === r ? updated : row))); saved++; } catch { errors++; } } setSaving(false); if (errors) addToast(errors + ' erreur(s)', 'error'); else addToast(saved + ' item(s) sauvegardé(s) ✓', 'success'); }

  return (
    <div className="tool-main">
      <div style={{ paddingLeft: 60 }}>
        <div className="page-eyebrow">Configuration</div>
        <div className="page-title">Items à vérifier</div>
        <div className="page-sub">Définissez les items et leur fréquence de vérification. Chaque item a un numéro et une récurrence.</div>
        <div className="rec-section">
          <div className="rec-section-title">⏱ Récurrences disponibles</div>
          <div className="rec-chips">{sortedRecs.map((r) => (<span className="rec-chip" key={r}>{r} jour{r > 1 ? 's' : ''}{r !== 0 && r !== 1 && <button className="rec-chip-rm" onClick={() => removeRec(r)} title="Supprimer">✕</button>}</span>))}</div>
          <div className="rec-add-row">
            <input type="number" className="inp-rec" min="0" placeholder="ex: 120" value={newRecInput} onChange={(e) => setNewRecInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addRecurrence(); }} />
            <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>jours</span>
            <button className="btn btn-primary btn-sm" onClick={addRecurrence}>Ajouter</button>
          </div>
        </div>
        <div className="toolbar">
          <div className="toolbar-left"><button className="btn btn-primary" onClick={addRow}>Ajouter un item</button><button className="btn btn-primary" onClick={saveAll} disabled={saving}>{saving ? 'Enregistrement…' : 'Tout sauvegarder'}</button></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="count-pill">{rows.length} item{rows.length !== 1 ? 's' : ''}</div>{retardCount > 0 && <div className="kpi-retard">{retardCount} en retard</div>}</div>
        </div>
        {paramsQ.isLoading ? <LoadingOverlay /> : (
          <div className="table-shell param-items-table">
            <table className="data-table">
              <thead><tr><th>#</th><th>Item (nom libre)</th><th>Récurrence</th><th>Dernière vérif.</th><th>Prochaine vérif.</th><th></th></tr></thead>
              <tbody>{rows.map((r, i) => { const info = prochaineInfo(r); return (<tr key={r.id}><td>{r.item_number}</td><td><input className="inp-item" value={r.nom} placeholder="Nom de l'item…" onChange={(e) => markDirty(i, 'nom', e.target.value)} /></td><td><select className="sel-rec" value={r.recurrence} onChange={(e) => markDirty(i, 'recurrence', parseInt(e.target.value, 10))}>{sortedRecs.map((rec) => <option key={rec} value={rec}>{rec} jour{rec > 1 ? 's' : ''}</option>)}</select></td><td className="td-date">{fmtDate(r.derniere_verification)}</td><td className={`td-prochaine ${info.cls}`}>{info.lbl}</td><td><button className="btn-icon" onClick={() => removeRow(i)} title="Supprimer">✕</button></td></tr>); })}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
