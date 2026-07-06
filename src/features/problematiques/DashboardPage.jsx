import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProblemesQuery, useResponsablesQuery, useCriteresSeuilsQuery, useCreateProblemeMutation } from './queries';
import { localToday, localDate, fmtDate, fmtId, isIncomplet } from './logic';
import { StatutBadge, PrioriteBadge, PilierBadge } from './components/Badges';
import { PilierStatsBar, PrioriteStatsBar } from './components/PilierStatsBar';
import DateNav from './components/DateNav';
import CritereModal from './components/CritereModal';
import EditProblemeModal from './components/EditProblemeModal';
import { usePlanningStore } from '../../store/usePlanningStore';
import { GlowingShadow } from '../shared/GlowingShadow';
import './problematiques.css';

const CLOTURES = ['Clôturé', 'Annulé'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const addToast = usePlanningStore((s) => s.addToast);
  const [dashDate, setDashDate] = useState(localToday());
  const [critereOpen, setCritereOpen] = useState(null);
  const [newProbOpen, setNewProbOpen] = useState(false);

  const problemesQ = useProblemesQuery();
  const responsablesQ = useResponsablesQuery();
  const seuilsQ = useCriteresSeuilsQuery();
  const createMutation = useCreateProblemeMutation();

  const allProblems = problemesQ.data || [];
  const responsables = responsablesQ.data || [];
  const criteresSeuils = seuilsQ.data || {};

  const actives = useMemo(() => allProblems.filter((p) => {
    const created = localDate(p.created_at);
    if (created > dashDate) return false;
    if (CLOTURES.includes(p.statut)) return false;
    return true;
  }), [allProblems, dashDate]);

  const kpis = {
    total: actives.length,
    ouvert: actives.filter((p) => p.statut === 'À traiter').length,
    cours: actives.filter((p) => p.statut === 'En cours').length,
    resolu: actives.filter((p) => p.statut === 'Résolu').length,
    incomplet: actives.filter(isIncomplet).length,
  };

  const actifsPourStats = actives.filter((p) => ['À traiter', 'En cours', 'Résolu'].includes(p.statut));
  const recent = allProblems.filter((p) => localDate(p.created_at) === dashDate).slice(0, 5);

  function goToRegistre(statut) {
    navigate('/problematiques' + (statut ? '?statut=' + encodeURIComponent(statut) : ''));
  }
  function goToIncompletes() {
    navigate('/problematiques?incomplet=1');
  }
  function goToPilier(pilier) {
    navigate('/problematiques?pilier=' + encodeURIComponent(pilier));
  }

  function handleCreate(form) {
    if (!form.intitule || !form.pilier || !form.priorite || !form.description) {
      addToast('Champs obligatoires manquants.', 'error');
      return;
    }
    createMutation.mutate({ ...form, soumis_par: 'dashboard' }, {
      onSuccess: () => { setNewProbOpen(false); addToast('Problématique soumise ✓', 'success'); },
      onError: (e) => addToast('Erreur : ' + e.message, 'error'),
    });
  }

  return (
    <div className="tool-main">
      <div className="sec-h" style={{ marginBottom: 8 }}>
        <div><div className="sec-t">Tableau de bord</div><div className="sec-s">Vue d'ensemble des problématiques</div></div>
        <button className="btn btn-primary" onClick={() => setNewProbOpen(true)}>Soumettre une problématique</button>
      </div>

      <DateNav date={dashDate} onChange={setDashDate} />

      <div className="kpi-row">
        <div onClick={() => goToRegistre('')} style={{ cursor: 'pointer' }}>
          <GlowingShadow>
            <div><div className="kpi-top"><div className="kpi-lbl">Total actif</div></div><div className="kpi-val">{kpis.total}</div><div className="kpi-sub">Voir le registre →</div></div>
          </GlowingShadow>
        </div>
        <div onClick={() => goToRegistre('À traiter')} style={{ cursor: 'pointer' }}>
          <GlowingShadow>
            <div><div className="kpi-top"><div className="kpi-lbl">À traiter</div></div><div className="kpi-val">{kpis.ouvert}</div><div className="kpi-sub">Voir le registre →</div></div>
          </GlowingShadow>
        </div>
        <div onClick={() => goToRegistre('En cours')} style={{ cursor: 'pointer' }}>
          <GlowingShadow>
            <div><div className="kpi-top"><div className="kpi-lbl">En cours</div></div><div className="kpi-val">{kpis.cours}</div><div className="kpi-sub">Voir le registre →</div></div>
          </GlowingShadow>
        </div>
        <div onClick={() => goToRegistre('Résolu')} style={{ cursor: 'pointer' }}>
          <GlowingShadow>
            <div><div className="kpi-top"><div className="kpi-lbl">Résolues</div></div><div className="kpi-val">{kpis.resolu}</div><div className="kpi-sub">Voir le registre →</div></div>
          </GlowingShadow>
        </div>
        <div onClick={goToIncompletes} style={{ cursor: 'pointer' }}>
          <GlowingShadow>
            <div><div className="kpi-top"><div className="kpi-lbl">Incomplètes</div></div><div className="kpi-val">{kpis.incomplet}</div><div className="kpi-sub">Voir le registre →</div></div>
          </GlowingShadow>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-lbl">Par pilier</div>
          <PilierStatsBar activeProblems={actifsPourStats} criteresSeuils={criteresSeuils} onOpenCritere={setCritereOpen} />
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Par priorité</div>
          <PrioriteStatsBar activeProblems={actifsPourStats} />
        </div>
      </div>

      <div className="sec-h"><div><div className="sec-t">Nouveautés</div><div className="sec-s">Problématiques créées ce jour</div></div></div>
      <div className="table-shell">
        <table className="data-table">
          <thead><tr><th>ID</th><th>Intitulé</th><th>Pilier</th><th>Priorité</th><th>Statut</th><th>Date</th></tr></thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">Aucune problématique créée ce jour.</div></div></td></tr>
            ) : recent.map((p) => (
              <tr key={p.id}>
                <td><span className="c-id">#{fmtId(p.id)}</span></td>
                <td className="c-title">{p.intitule}</td>
                <td><PilierBadge pilier={p.pilier} /></td>
                <td><PrioriteBadge priorite={p.priorite} /></td>
                <td><StatutBadge statut={p.statut} /></td>
                <td style={{ fontSize: '.78rem', color: 'var(--text-secondary)' }}>{fmtDate(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {critereOpen && <CritereModal pilier={critereOpen} allProblems={allProblems} onClose={() => setCritereOpen(null)} />}
      <EditProblemeModal open={newProbOpen} problemeId={null} allProblems={allProblems} responsables={responsables} onClose={() => setNewProbOpen(false)} onSave={handleCreate} saving={createMutation.isPending} />
    </div>
  );
}
