import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useStatsParamsQuery, useSaveStatsParamsMutation, useCamionsRangeQuery } from './queries';
import { getRange, periodLabel, todayStr, analyze } from './logic';
import { exportStatsPdf } from './exportStatsPdf';
import KpiRow from './components/KpiRow';
import DayTimeline from './components/DayTimeline';
import Heatmap from './components/Heatmap';
import TrendChart from './components/TrendChart';
import DistChart from './components/DistChart';
import DestinationBars from './components/DestinationBars';
import WorstSlots from './components/WorstSlots';
import StatsParamsModal from './components/StatsParamsModal';
import './statsPonctualite.css';
import LoadingOverlay from '../../design-system/LoadingOverlay';

export default function StatsPonctualitePage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const [period, setPeriod] = useState('day');
  const [curDate, setCurDate] = useState(todayStr());
  const [paramsOpen, setParamsOpen] = useState(false);

  const statsParamsQ = useStatsParamsQuery();
  const saveParamsMutation = useSaveStatsParamsMutation();
  const { start, end } = getRange(period, curDate);
  const camionsQ = useCamionsRangeQuery(start, end);

  const seuils = statsParamsQ.data || { seuil1: 30, seuil2: 60, objectif: 80, slActif: 'ACTIF', slInactif: 'INACTIF', slNonLivre: null };
  const data = camionsQ.data || [];

  const A = useMemo(() => analyze(data, seuils), [data, seuils]);

  function navigate(dir) {
    const d = new Date(curDate + 'T00:00:00');
    if (period === 'day') d.setDate(d.getDate() + dir);
    else if (period === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurDate(d.toISOString().slice(0, 10));
  }

  function handleSaveParams(vals) {
    saveParamsMutation.mutate(vals, {
      onSuccess: () => { addToast('Paramètres enregistrés ✓', 'success'); setParamsOpen(false); },
      onError: (e) => addToast('Erreur : ' + (e?.message || 'Table stats_parametres introuvable.'), 'error'),
    });
  }

  async function handleExportPdf() {
    try {
      await exportStatsPdf({ cachedData: data, period, curDate, seuils, A });
    } catch (e) {
      addToast('Erreur export PDF : ' + (e?.message || e), 'error');
    }
  }

  const isLoading = statsParamsQ.isLoading || camionsQ.isLoading;

  return (
    <div className="tool-main">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Link to="/planning-camions" className="btn btn-secondary">← Planning</Link>
        <div className="tool-title">Radar de Ponctualité</div>
      </div>

      <div className="sp-controls">
        <div className="period-tabs">
          {['day', 'week', 'month'].map((p) => (
            <button key={p} className={`ptab-sp${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
              {p === 'day' ? 'Journée' : p === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
        <button className="nav-btn-sp" onClick={() => navigate(-1)}>←</button>
        <div className="period-lbl-sp">{periodLabel(period, curDate)}</div>
        <button className="nav-btn-sp" onClick={() => navigate(1)}>→</button>
        <div className="sp-actions">
          <button className="btn btn-ghost" onClick={handleExportPdf}>Export PDF</button>
          <button className="btn btn-ghost" onClick={() => setParamsOpen(true)}>Paramètres</button>
        </div>
      </div>

      <div className="dash">
        {isLoading ? (
          <LoadingOverlay />
        ) : (
          <>
            <KpiRow A={A} seuils={seuils} />

            {period === 'day' ? (
              <div className="panels-row panels-2 anim d2">
                <div className="panel">
                  <div className="ph">
                    <div className="ph-eye">Détail journée</div>
                    <div className="ph-title">Timeline des arrivées</div>
                    <div className="ph-sub">Camions ACTIFS uniquement · Inactifs affichés mais exclus des stats</div>
                  </div>
                  <DayTimeline data={data} seuils={seuils} />
                </div>
                <div className="panel">
                  <div className="ph">
                    <div className="ph-eye">Distribution</div>
                    <div className="ph-title">Amplitude des retards</div>
                    <div className="ph-sub">Camions actifs arrivés avec retard uniquement</div>
                  </div>
                  <DistChart retards={A.retards} seuils={seuils} />
                </div>
              </div>
            ) : (
              <>
                <div className="panels-row anim d2">
                  <div className="panel panel-full">
                    <div className="ph">
                      <div className="ph-eye">Carte de chaleur</div>
                      <div className="ph-title">Ponctualité par créneau horaire & journée</div>
                      <div className="ph-sub">Taux de ponctualité ≤{seuils.seuil1}min · Tolérance critique {seuils.seuil2}min · Survol pour détail</div>
                    </div>
                    <Heatmap data={data} start={start} end={end} seuils={seuils} />
                  </div>
                </div>
                <div className="panels-row panels-2 anim d3">
                  <div className="panel">
                    <div className="ph">
                      <div className="ph-eye">Évolution</div>
                      <div className="ph-title">Taux de ponctualité par jour</div>
                      <div className="ph-sub">Camions actifs arrivés uniquement · Objectif {seuils.objectif}%</div>
                    </div>
                    <div id="trend-chart-box"><TrendChart data={data} start={start} end={end} seuils={seuils} /></div>
                  </div>
                  <div className="panel">
                    <div className="ph">
                      <div className="ph-eye">Distribution</div>
                      <div className="ph-title">Amplitude des retards</div>
                      <div className="ph-sub">Vert ≤{seuils.seuil1}min · Orange ≤{seuils.seuil2}min · Rouge &gt;{seuils.seuil2}min</div>
                    </div>
                    <DistChart retards={A.retards} seuils={seuils} />
                  </div>
                </div>
              </>
            )}

            <div className="panels-row panels-2 anim d4">
              <div className="panel">
                <div className="ph">
                  <div className="ph-eye">Par destination</div>
                  <div className="ph-title">Ponctualité selon la destination</div>
                  <div className="ph-sub">Camions ACTIFS arrivés · tolérance ≤{seuils.seuil1} min</div>
                </div>
                <DestinationBars data={data} seuils={seuils} />
              </div>
              <div className="panel">
                <div className="ph">
                  <div className="ph-eye">Points chauds</div>
                  <div className="ph-title">Créneaux les plus problématiques</div>
                  <div className="ph-sub">Camions ACTIFS en retard · Orange &gt;{seuils.seuil1}min · Rouge &gt;{seuils.seuil2}min</div>
                </div>
                <WorstSlots data={data} seuils={seuils} />
              </div>
            </div>
          </>
        )}
      </div>

      <StatsParamsModal
        open={paramsOpen} onClose={() => setParamsOpen(false)}
        seuils={seuils} onSave={handleSaveParams} saving={saveParamsMutation.isPending}
      />
    </div>
  );
}
