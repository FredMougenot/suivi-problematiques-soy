import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useGhCategoriesFullQuery, useGhPoidsListQuery, useTraxDataQuery, getPoidsUnitaire } from '../shared/ghSharedQueries';
import { useReleveQuery, useSaveReleveMutation } from './queries';
import { todayStr, getMondayStr, fmtDate, matchCategoryForCode, calcPoidsTotal, nextTmpId } from './logic';
import SaisieTable from './components/SaisieTable';
import './inventaireUsine.css';
import LoadingOverlay from '../../design-system/LoadingOverlay';

export default function InventaireUsinePage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const [rows, setRows] = useState([]);
  const [dateReleve, setDateReleve] = useState(getMondayStr());
  const [lastSavedDate, setLastSavedDate] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const categoriesQ = useGhCategoriesFullQuery();
  const poidsQ = useGhPoidsListQuery();
  const traxQ = useTraxDataQuery();
  const releveQ = useReleveQuery();
  const saveMutation = useSaveReleveMutation();
  const categories = categoriesQ.data || [];
  const poidsList = poidsQ.data || [];
  const traxData = traxQ.data || [];

  useEffect(() => {
    if (releveQ.data) {
      if (releveQ.data.length > 0) {
        setDateReleve(releveQ.data[0].date_releve);
        setLastSavedDate(releveQ.data[0].date_releve);
        setRows(releveQ.data.map((r) => ({ id: r.id, categorie_id: r.categorie_id || '', categorie_nom: r.categorie_nom || '', code_produit: r.code_produit || '', description: r.description || '', no_lot: r.no_lot || '', no_sous_lot: r.no_sous_lot || '', quantite: r.quantite ?? '', poids_unit: r.poids_unit ?? '', poids_total: r.poids_total ?? '', balance: r.balance ?? '', date_fab: r.date_fab || '', date_peremption: r.date_peremption || '', notes: r.notes || '' })));
      } else { setRows([]); }
    }
  }, [releveQ.data]);

  function handleFieldChange(idx, field, value) { setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; if (field === 'quantite' || field === 'balance') next[idx].poids_total = calcPoidsTotal(next[idx]); if (field === 'code_produit' && value.length >= 3) { const cat = matchCategoryForCode(categories, value); if (cat) { next[idx].categorie_id = cat.id; next[idx].categorie_nom = cat.name; } const poids = getPoidsUnitaire(poidsList, value); next[idx].poids_unit = poids || ''; next[idx].poids_total = calcPoidsTotal(next[idx]); } return next; }); }
  function handleCategoryChange(idx, id, nom) { setRows((prev) => { const next = [...prev]; next[idx] = { ...next[idx], categorie_id: id, categorie_nom: nom }; return next; }); }
  function handlePickTrax(idx, code, desig) { setRows((prev) => { const next = [...prev]; const cat = matchCategoryForCode(categories, code); const poids = getPoidsUnitaire(poidsList, code); next[idx] = { ...next[idx], code_produit: code, description: desig, categorie_id: cat ? cat.id : next[idx].categorie_id, categorie_nom: cat ? cat.name : next[idx].categorie_nom, poids_unit: poids || next[idx].poids_unit }; next[idx].poids_total = calcPoidsTotal(next[idx]); return next; }); }
  function handleAddRow() { setRows((prev) => [...prev, { id: nextTmpId(), categorie_id: '', categorie_nom: '', code_produit: '', description: '', no_lot: '', no_sous_lot: '', quantite: '', poids_unit: '', poids_total: '', balance: '', date_fab: '', date_peremption: '', notes: '' }]); }
  function handleRemoveRow(idx) { setRows((prev) => prev.filter((_, i) => i !== idx)); }
  function handleNouveauReleve() { setConfirmOpen(false); setRows([]); setDateReleve(getMondayStr()); setLastSavedDate(null); addToast('Relevé réinitialisé. Ajoutez vos produits.', 'info'); }
  function handleSaveAll() { const invalid = rows.filter((r) => !r.code_produit || !r.no_lot); if (invalid.length > 0) { addToast(`${invalid.length} ligne(s) incomplète(s) — Code produit et No. lot sont obligatoires.`, 'error'); return; } if (!dateReleve) { addToast('Veuillez sélectionner une date de relevé.', 'error'); return; } saveMutation.mutate({ dateReleve, rows }, { onSuccess: () => { setLastSavedDate(dateReleve); addToast(rows.length + ' produit(s) sauvegardé(s) ✓', 'success'); }, onError: (e) => addToast('Erreur sauvegarde : ' + e.message, 'error') }); }

  const totalLignes = rows.length;
  const totalQte = rows.reduce((s, r) => s + (parseFloat(r.quantite) || 0), 0);
  const totalPoids = rows.reduce((s, r) => s + (parseFloat(r.poids_total) || 0), 0);

  return (
    <div className="tool-main">
      <div style={{ paddingLeft: 60, transform: 'translateZ(0)' }}>
        <div className="page-eyebrow">Relevé hebdomadaire</div>
        <div className="page-title">Stock Usine</div>
        <div className="page-sub">Saisie du stock présent à l'usine. Chaque lundi, saisissez l'intégralité des produits présents. Le relevé précédent sera remplacé lors de la sauvegarde.</div>
      </div>
      <div className="releve-banner">
        <div className="releve-info">
          <div className="releve-date-wrap"><div className="releve-date-lbl">Date du relevé</div><div className="releve-date-val">{dateReleve ? fmtDate(dateReleve) : '—'}</div></div>
          <div className="badge-usine">🏭 Usine</div>
          <div className="releve-count">{totalLignes} produit{totalLignes !== 1 ? 's' : ''}</div>
          {lastSavedDate && <div style={{ fontSize: '.76rem', color: 'var(--text-muted)' }}>Dernier relevé chargé — <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{fmtDate(lastSavedDate)}</span></div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input type="date" value={dateReleve} onChange={(e) => setDateReleve(e.target.value)} style={{ background: 'var(--bg-float)', border: '1px solid var(--text-faint)', color: 'var(--text-primary)', borderRadius: 'var(--r-sm)', padding: '6px 10px', fontSize: '.84rem', outline: 'none', transform: 'translateZ(0)'}} />
          <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>Nouveau relevé (effacer)</button>
        </div>
      </div>
      <div className="toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleAddRow}>Ajouter un produit</button>
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder'}</button>
          <Link to="/inventaire-global" className="btn btn-secondary">Inventaire global</Link>
        </div>
        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>* Champs obligatoires</div>
      </div>
      <div className="tbl-wrap">
        {releveQ.isLoading ? <LoadingOverlay /> : (<><SaisieTable rows={rows} categories={categories} traxData={traxData} onFieldChange={handleFieldChange} onCategoryChange={handleCategoryChange} onPickTrax={handlePickTrax} onRemoveRow={handleRemoveRow} />{rows.length > 0 && <div className="tbl-footer"><div className="tbl-totaux"><div className="total-item"><div className="total-lbl">Produits</div><div className="total-val">{totalLignes}</div></div><div className="total-item"><div className="total-lbl">Qté totale</div><div className="total-val">{totalQte % 1 === 0 ? totalQte : totalQte.toFixed(2)}</div></div><div className="total-item"><div className="total-lbl">Poids total</div><div className="total-val">{totalPoids.toFixed(2)} kg</div></div></div><div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Poids calculé automatiquement : Qté × Poids unitaire + Balance</div></div>}</>)}
      </div>
      {confirmOpen && (<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}><div className="modal-box" style={{ maxWidth: 420 }}><div className="modal-header"><div className="modal-title">⚠️ Nouveau relevé</div></div><div className="modal-body" style={{ lineHeight: 1.6 }}>Cette action va <strong>effacer toutes les lignes actuelles</strong> du relevé en cours.<br /><br />Les données sauvegardées en base resteront jusqu'à la prochaine sauvegarde complète.<br /><br />Voulez-vous continuer ?</div><div className="modal-footer"><button className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>Annuler</button><button className="btn btn-danger" onClick={handleNouveauReleve}>Effacer et recommencer</button></div></div></div>)}
    </div>
  );
}
