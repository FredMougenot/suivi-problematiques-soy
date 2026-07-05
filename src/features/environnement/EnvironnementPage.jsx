import { useState } from 'react';
import { usePlanningStore } from '../../store/usePlanningStore';
import {
  useEnvRowsQuery, useEnvHistoryQuery, useSaveVerifMutation, useDeleteVerifMutation,
  useCreateProblemesBulkMutation, usePilierCritereTitreQuery,
} from './queries';
import { VERIFS_FIXES, localToday, isToday, changeDayStr, getEnvLimit, saveEnvLimit, getNcParams, saveNcParams, computeNcSeries } from './logic';
import VerifTable from './components/VerifTable';
import EnvCharts from './components/EnvCharts';
import { AddVerifModal, NcParamsModal, NcConfirmModal } from './components/EnvModals';
import { exportEnvironnementPdf } from './exportEnvironnementPdf';
import './environnement.css';

export default function EnvironnementPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const [curDate, setCurDate] = useState(localToday());
  const [weekLimit, setWeekLimit] = useState(getEnvLimit('week'));
  const [monthLimit, setMonthLimit] = useState(getEnvLimit('month'));
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [paramsModalOpen, setParamsModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingLocalRows, setPendingLocalRows] = useState({});

  const rowsQ = useEnvRowsQuery(curDate);
  const historyQ = useEnvHistoryQuery();
  const titreQ = usePilierCritereTitreQuery();
  const saveMutation = useSaveVerifMutation();
  const deleteMutation = useDeleteVerifMutation();
  const createBulkMutation = useCreateProblemesBulkMutation();

  const baseRows = rowsQ.data || {};
  const rows = { ...baseRows, ...pendingLocalRows };
  const series = computeNcSeries(historyQ.data || {});
  const pageTitle = titreQ.data || 'Conformité environnement';

  function setConf(key, field, val) {
    setPendingLocalRows((prev) => {
      const cur = prev[key] || rows[key] || { verif_key: key, date_jour: curDate };
      let next;
      if (val) next = { ...cur, conforme: field === 'conforme', non_conforme: field === 'non_conforme' };
      else next = { ...cur, [field]: false };
      return { ...prev, [key]: next };
    });
  }

  function changeDay(delta) {
    setCurDate((d) => changeDayStr(d, delta));
    setPendingLocalRows({});
  }

  async function handleAddVerif(label) {
    const key = 'extra_' + Date.now();
    const newRow = { verif_key: key, label, date_jour: curDate, conforme: false, non_conforme: false };
    setPendingLocalRows((prev) => ({ ...prev, [key]: newRow }));
    setAddModalOpen(false);
    try {
      await saveMutation.mutateAsync({ verif_key: key, date_jour: curDate, label, conforme: false, non_conforme: false, updated_at: new Date().toISOString() });
      addToast('Vérification ajoutée ✓', 'success');
    } catch (e) { addToast('Erreur : ' + e.message, 'error'); }
  }

  async function handleDelete(key, id) {
    if (!confirm('Supprimer cette vérification ?')) return;
    try {
      await deleteMutation.mutateAsync({ id, dateJour: curDate });
      setPendingLocalRows((prev) => { const n = { ...prev }; delete n[key]; return n; });
      addToast('Supprimé', 'success');
    } catch (e) { addToast('Erreur : ' + e.message, 'error'); }
  }

  async function handleSaveAll() {
    const allKeys = [...VERIFS_FIXES, ...Object.keys(rows).filter((k) => k.startsWith('extra_'))];
    let errors = 0;
    for (const key of allKeys) {
      const r = rows[key] || {};
      if (!r.id && !r.conforme && !r.non_conforme) continue;
      try {
        await saveMutation.mutateAsync({ verif_key: key, date_jour: curDate, label: r.label || key, conforme: !!r.conforme, non_conforme: !!r.non_conforme, updated_at: new Date().toISOString() });
      } catch { errors++; }
    }
    setPendingLocalRows({});
    if (errors) addToast(errors + ' erreur(s) lors de la sauvegarde', 'error');
    else addToast('Tout sauvegardé ✓', 'success');
  }

  function handleOpenNcModal() {
    const allKeys = [...VERIFS_FIXES, ...Object.keys(rows).filter((k) => k.startsWith('extra_'))];
    const ncList = allKeys.filter((key) => rows[key]?.non_conforme).map((key) => ({ key, label: rows[key].label || key }));
    if (ncList.length === 0) { addToast('Aucune ligne non-conforme détectée.', 'info'); return; }
    setPendingLocalRows((p) => ({ ...p, __ncList: ncList }));
    setConfirmModalOpen(true);
  }

  const ncList = pendingLocalRows.__ncList || [];

  async function handleSubmitNc() {
    const params = getNcParams();
    const payload = ncList.map((item) => ({
      intitule: item.label,
      description: 'Non-conformité détectée le ' + curDate + ' lors de la vérification environnement : ' + item.label,
      pilier: params.pilier, priorite: params.priorite, statut: params.statut,
      responsable: params.responsable || null, soumis_par: params.soumis_par || 'Environnement auto',
    }));
    try {
      await createBulkMutation.mutateAsync(payload);
      setConfirmModalOpen(false);
      const n = payload.length;
      addToast(n + ' problématique' + (n > 1 ? 's' : '') + ' créée' + (n > 1 ? 's' : '') + ' dans le registre ✓', 'success');
    } catch (e) { addToast('Erreur : ' + e.message, 'error'); }
  }

  function handleExportPdf() {
    try { exportEnvironnementPdf(rows, curDate, pageTitle); addToast('PDF exporté ✓', 'success'); }
    catch (e) { addToast('Erreur PDF : ' + e.message, 'error'); }
  }

  function updateWeekLimit(v) { setWeekLimit(v === '' ? null : Number(v)); saveEnvLimit('week', v); }
  function updateMonthLimit(v) { setMonthLimit(v === '' ? null : Number(v)); saveEnvLimit('month', v); }

  const d = new Date(curDate + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('fr-CA', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="tool-main">
      <div className="sec-h" style={{ marginBottom: 8 }}>
        <div><div className="sec-t">🌿 {pageTitle}</div><div className="sec-s">Vérifications quotidiennes de conformité environnementale</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={handleExportPdf}>📄 Exporter PDF</button>
          <button className="btn btn-ghost" onClick={() => setParamsModalOpen(true)}>⚙️ Paramètres</button>
        </div>
      </div>

      <div className="date-nav">
        <button className="date-arr" onClick={() => changeDay(-1)}>←</button>
        <div className="date-lbl">{dateLabel}{isToday(curDate) && <span className="today-chip">Aujourd'hui</span>}</div>
        <button className="date-arr" onClick={() => changeDay(1)}>→</button>
      </div>

      <EnvCharts series={series} weekLimit={weekLimit} monthLimit={monthLimit} onChangeWeekLimit={updateWeekLimit} onChangeMonthLimit={updateMonthLimit} />

      <div style={{ marginBottom: 8 }}>
        <button className="btn btn-primary" onClick={() => setAddModalOpen(true)}>+ Ajouter une vérification</button>
      </div>

      {rowsQ.isLoading ? (
        <div className="spinner-box"><div className="spinner-ring"></div> Chargement…</div>
      ) : (
        <VerifTable rows={rows} onSetConf={setConf} onDelete={handleDelete} />
      )}

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '16px 0 4px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleSaveAll}>💾 Sauvegarder tout</button>
        <button className="btn-submit-nc" onClick={handleOpenNcModal}>⚠ Soumettre les non-conformités</button>
      </div>

      <AddVerifModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onConfirm={handleAddVerif} />
      <NcParamsModal open={paramsModalOpen} onClose={() => setParamsModalOpen(false)} params={getNcParams()} onSave={(p) => { saveNcParams(p); setParamsModalOpen(false); addToast('Paramètres enregistrés ✓', 'success'); }} />
      <NcConfirmModal open={confirmModalOpen} ncList={ncList} onClose={() => setConfirmModalOpen(false)} onConfirm={handleSubmitNc} submitting={createBulkMutation.isPending} />
    </div>
  );
}
