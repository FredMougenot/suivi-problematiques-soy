import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlanningStore } from '../../store/usePlanningStore';
import { buildRowContext } from './rules';
import { useParamsQuery, useCamionsQuery, useSaveRowMutation, useDeleteRowMutation, todayStr } from './queries';
import { exportPlanningPdf } from './exportPdf';
import CamionsTable from './components/CamionsTable';
import AddCamionModal from './components/AddCamionModal';
import TimelineLine from './components/TimelineLine';
import './camions.css';
import LoadingOverlay from '../../design-system/LoadingOverlay';

function fmtDateLbl(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function PlanningCamionsPage() {
  const { role } = useAuthStore();
  const addToast = usePlanningStore((s) => s.addToast);
  const [dateStr, setDateStr] = useState(todayStr());
  const [rows, setRows] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [virtualMin, setVirtualMin] = useState(null);
  const rowRefs = useRef({});
  const outerRef = useRef(null);
  const paramsQ = useParamsQuery();
  const camionsQ = useCamionsQuery(dateStr);
  const saveMutation = useSaveRowMutation(dateStr);
  const deleteMutation = useDeleteRowMutation(dateStr);
  const params = paramsQ.data || {};
  const isToday = dateStr === todayStr();

  useEffect(() => { if (camionsQ.data) setRows(camionsQ.data); }, [camionsQ.data]);

  const context = useMemo(() => {
    if (!Object.keys(params).length) return null;
    return buildRowContext(dateStr, rows, params);
  }, [dateStr, rows, params]);

  useEffect(() => {
    if (!context || !context.vNonLivre || context.delaiH == null) return;
    const nowMs = Date.now();
    context.all.forEach((entry) => {
      const idx = entry.idx;
      const r = rows[idx];
      if (!r) return;
      const eff = context.effective(idx);
      if (eff.statutLigne !== (params['statut_ligne']?.[0]?.valeur || 'ACTIF')) return;
      if (r.heure_reelle) return;
      const hPlanif = r.heure_planif || entry.h;
      if (!hPlanif) return;
      const limiteMs = new Date(dateStr + 'T' + hPlanif + ':00').getTime() + context.delaiH * 3600000;
      if (nowMs >= limiteMs && r.statut_ligne !== context.vNonLivre) handleFieldChange(idx, 'statut_ligne', context.vNonLivre, true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, dateStr]);

  function buildPayload(idx, extra = {}) {
    const r = rows[idx] || {};
    const eff = context.effective(idx);
    const slot = context.all.find((s) => s.idx === idx);
    return { id: r.id, heure_planif: r.heure_planif || slot?.h || '00:00', statut_ligne: eff.statutLigne, type_camion: eff.typeCamion || null, num_arrivee: r.num_arrivee || null, num_depart: eff.isBobtail ? null : (r.num_depart || null), dest_arrivee: r.dest_arrivee || null, destination: eff.destination || null, description: eff.description || null, statut: eff.statutArrivee || null, chargement: eff.isBobtail ? null : (eff.chargement || null), heure_reelle: r.heure_reelle || null, etat_verification: r.etat_verification || null, ...extra };
  }

  function handleFieldChange(idx, field, value, saveImmediately = false) {
    setRows((prev) => ({ ...prev, [idx]: { ...(prev[idx] || { slot_index: idx }), [field]: value } }));
    if (saveImmediately) {
      setTimeout(() => { setRows((current) => { const payload = buildPayload(idx, { [field]: value }); saveMutation.mutate({ idx, payload }, { onError: (e) => addToast('Erreur: ' + e.message, 'error') }); return current; }); }, 0);
    }
  }

  async function handleSaveAll() {
    if (!context) return;
    let errors = 0;
    for (const entry of context.all) {
      const idx = entry.idx;
      if (!rows[idx] && !entry.extra) continue;
      try { await saveMutation.mutateAsync({ idx, payload: buildPayload(idx) }); } catch { errors++; }
    }
    if (errors > 0) addToast(`${errors} erreur(s) lors de la sauvegarde`, 'error');
    else addToast('Tableau sauvegardé ✓', 'success');
  }

  function handleDeleteRow(idx, id) {
    if (!confirm('Supprimer ce camion supplémentaire ?')) return;
    deleteMutation.mutate(id, { onSuccess: () => { setRows((prev) => { const next = { ...prev }; delete next[idx]; return next; }); addToast('Camion supplémentaire supprimé.', 'info'); }, onError: (e) => addToast('Erreur: ' + e.message, 'error') });
  }

  function handleAddCamion({ heure, type, numero, dest }) {
    const used = Object.keys(rows).map(Number).filter((i) => i >= 10);
    const newIdx = used.length > 0 ? Math.max(...used) + 1 : 10;
    setRows((prev) => ({ ...prev, [newIdx]: { slot_index: newIdx, heure_planif: heure, type_camion: type || null, destination: dest || null } }));
    setModalOpen(false);
    setTimeout(() => { saveMutation.mutate({ idx: newIdx, payload: { heure_planif: heure, type_camion: type || null, num_arrivee: numero || null, destination: dest || null, statut_ligne: params['statut_ligne']?.[0]?.valeur || 'ACTIF' } }, { onError: (e) => addToast('Erreur: ' + e.message, 'error') }); }, 0);
  }

  function changeDay(delta) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDateStr(d.toISOString().slice(0, 10));
  }

  if (paramsQ.isLoading || camionsQ.isLoading || !context) return <LoadingOverlay />;

  return (
    <div className="tool-main">
      <div className="date-nav-bar" style={{ paddingLeft: 60 }}>
        <button className="date-nav-arr" onClick={() => changeDay(-1)}>←</button>
        <div className="date-nav-label">{fmtDateLbl(dateStr)}{isToday && <span className="date-nav-today-chip">Aujourd'hui</span>}</div>
        <button className="date-nav-arr" onClick={() => changeDay(1)}>→</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 4px 0' }}>
        {role !== 'viewer' ? <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Ajouter un camion</button> : <span />}
        <div style={{ display: 'flex', gap: 8 }}>
          {role !== 'viewer' && <Link to="/parametres-planning" className="btn btn-ghost">Paramètres</Link>}
          <button className="btn btn-ghost" onClick={() => exportPlanningPdf(dateStr, rows, context, params)}>Export PDF</button>
        </div>
      </div>

      <div style={{ position: 'relative' }} ref={outerRef}>
        <CamionsTable dateStr={dateStr} rows={rows} params={params} context={context} role={role} onFieldChange={handleFieldChange} onDeleteRow={handleDeleteRow} rowRefs={rowRefs} />
        <TimelineLine isToday={isToday} rows={rows} all={context.all} rowRefs={rowRefs} outerRef={outerRef} virtualMin={virtualMin} setVirtualMin={setVirtualMin} />
      </div>

      {isToday && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0 0' }}>
          <span style={{ fontSize: '.62rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' }}>⏱ Test</span>
          <input type="range" min={0} max={840} defaultValue={0} style={{ flex: 1, accentColor: 'var(--amber)', transform: 'translateZ(0)' }} onInput={(e) => setVirtualMin(6 * 60 + parseInt(e.target.value))} />
          <button className="btn btn-ghost" onClick={() => setVirtualMin(null)}>Maintenant</button>
        </div>
      )}

      {role !== 'viewer' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '18px 0 8px' }}>
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder tout'}</button>
        </div>
      )}

      <AddCamionModal open={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleAddCamion} />
    </div>
  );
}
