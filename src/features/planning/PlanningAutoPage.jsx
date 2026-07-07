import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { supabase } from '../../lib/supabaseClient';
import { todayStr, fmtDateFR, fmtTimeTz } from '../../lib/planningDateHelpers';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useProductionQuery, useHistoriqueQuery, useOverridesQuery } from './queries';
import LigneCard from './components/LigneCard';
import QuaisCenterCard from './components/QuaisCenterCard';
import SlotsTable from './components/SlotsTable';
import './planning.css';

export default function PlanningAutoPage() {
  const queryClient = useQueryClient();
  const addToast = usePlanningStore((s) => s.addToast);
  const prodQ = useProductionQuery(true);
  const histQ = useHistoriqueQuery(true);
  const overridesQ = useOverridesQuery(true);
  const data = prodQ.data;

  useEffect(() => {
    const channel = supabase.channel('production_temps_reel').on('postgres_changes', { event: '*', schema: 'public', table: 'production_temps_reel' }, () => { queryClient.invalidateQueries({ queryKey: ['production'] }); addToast('Planning mis à jour automatiquement', 'success'); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, addToast]);

  useEffect(() => { if (prodQ.error) addToast('Erreur de chargement: ' + prodQ.error.message, 'error'); }, [prodQ.error, addToast]);

  const heuresReelles = useMemo(() => { const hr = {}; (histQ.data || []).forEach((h) => { hr[`${h.ligne}-${h.camion}`] = h.heure_fin; }); return hr; }, [histQ.data]);
  const heuresDepuisSlots = useMemo(() => { const hs = {}; ((data && data.slots) || []).forEach((slot) => { if (slot.ligne && slot.camion && slot.heureFinCamion && slot.heureFinCamion !== 'Déjà prêt') hs[`${slot.ligne}-${slot.camion}`] = slot.heureFinCamion; }); return hs; }, [data]);
  const lineProg = useMemo(() => ({ L1: { camions: (data && data.l1_camions) || [] }, L2: { camions: (data && data.l2_camions) || [] } }), [data]);
  const systemeActif = !(data && data.updated_at && (new Date() - new Date(data.updated_at)) / 60000 > 10);

  return (
    <div className="tool-main">
      <div className="maj-bar" style={{ paddingLeft: 60 }}>
        <div className="maj-info"><span className="maj-dot"></span>Dernière mise à jour N8n : <strong>{data && data.updated_at ? fmtTimeTz(data.updated_at) : 'Chargement…'}</strong></div>
        <div className={clsx('statut-systeme', systemeActif ? 'actif' : 'arrete')}><span className="statut-systeme-dot"></span><span>{systemeActif ? 'Système actif' : 'Système arrêté'}</span></div>
        <div className="maj-info">Date : <strong>{fmtDateFR(todayStr())}</strong></div>
      </div>
      <div className="plan-sec-h"><div><div className="sec-title">Lignes de production</div><div className="sec-sub">Heures de fin estimées par camion</div></div></div>
      {!data ? (<div className="empty-state"><div className="empty-state-icon">📡</div><div className="empty-state-title">{prodQ.isLoading ? 'Chargement…' : "Aucune donnée disponible pour aujourd'hui."}</div></div>) : (
        <div className="lignes-grid"><LigneCard numero={1} data={data} heuresReelles={heuresReelles} heuresDepuisSlots={heuresDepuisSlots} /><QuaisCenterCard /><LigneCard numero={2} data={data} heuresReelles={heuresReelles} heuresDepuisSlots={heuresDepuisSlots} /></div>
      )}
      <div className="plan-sec-h" style={{ marginTop: 10 }}><div><div className="sec-title">Slots de ramassage</div><div className="sec-sub">Planning du transporteur · 06h00 à 22h00</div></div></div>
      <div className="slots-outer">{data ? <SlotsTable slots={data.slots} lineProg={lineProg} overrides={overridesQ.data || { L1: [], L2: [] }} /> : <div className="empty-state"><div className="empty-state-title">Chargement…</div></div>}</div>
    </div>
  );
}
