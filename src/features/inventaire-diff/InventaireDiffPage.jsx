import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useGhCategoriesFullQuery } from '../shared/ghSharedQueries';
import { useSnapshotsQuery, useSaveSnapshotMutation } from './queries';
import { computeDiff, getCategoryForRow } from './logic';
import { exportDiffPdf } from './exportDiffPdf';
import DiffCategorySidebar from './components/DiffCategorySidebar';
import DiffView from './components/DiffView';
import SnapshotConfirmModal from './components/SnapshotConfirmModal';
import './inventaireDiff.css';

export default function InventaireDiffPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const [activeCat, setActiveCat] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const categoriesQ = useGhCategoriesFullQuery();
  const snapshotsQ = useSnapshotsQuery();
  const saveMutation = useSaveSnapshotMutation();

  const categories = categoriesQ.data || [];
  const precData = snapshotsQ.data?.precData || [];
  const actData = snapshotsQ.data?.actData || [];

  const hasSnapshots = precData.length > 0 && actData.length > 0;

  const diffRows = useMemo(() => {
    if (!hasSnapshots || !categories.length) return [];
    return computeDiff(precData, actData, categories);
  }, [precData, actData, categories, hasSnapshots]);

  const filteredDiff = useMemo(() => {
    return diffRows.filter((row) => {
      if (activeCat === 'NO_CAT') return !row._cat;
      if (activeCat !== null) {
        if (!row._cat) return false;
        let c = row._cat, found = false;
        while (c) { if (c.id === activeCat) { found = true; break; } c = categories.find((x) => x.id === c.parent_id); }
        if (!found) return false;
      }
      return true;
    });
  }, [diffRows, activeCat, categories]);

  const kpis = {
    newCount: diffRows.filter((r) => r.type === 'new').length,
    modCount: diffRows.filter((r) => r.type === 'mod').length,
    goneCount: diffRows.filter((r) => r.type === 'gone').length,
  };

  function handleSaveSnapshot() {
    saveMutation.mutate(categories, {
      onSuccess: () => { setConfirmOpen(false); addToast('État sauvegardé ✓', 'success'); },
      onError: (e) => addToast('Erreur : ' + e.message, 'error'),
    });
  }

  function handleExportPdf() {
    try { exportDiffPdf(filteredDiff, categories); addToast('PDF exporté ✓', 'success'); }
    catch (e) { addToast('Erreur PDF : ' + e.message, 'error'); }
  }

  const precDate = precData[0]?.saved_at;
  const actDate = actData[0]?.saved_at;
  const isLoading = categoriesQ.isLoading || snapshotsQ.isLoading;

  return (
    <div className="tool-main">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Link to="/inventaire-gh" className="btn btn-secondary">← Inventaire GH</Link>
      </div>
      <div className="page-eyebrow">Comparaison hebdomadaire</div>
      <div className="page-title">Inventaire Diff — Changements</div>
      <div className="page-sub">Affiche uniquement les items nouveaux ou modifiés par rapport au relevé précédent. Les items inchangés ne sont pas affichés.</div>

      <div className="snap-info">
        <div className="snap-block"><div className="snap-lbl">État précédent</div><div className="snap-val">{precDate ? new Date(precDate).toLocaleDateString('fr-CA') : 'Aucun'}</div></div>
        <div className="snap-divider"></div>
        <div className="snap-block"><div className="snap-lbl">État actuel</div><div className="snap-val">{actDate ? new Date(actDate).toLocaleDateString('fr-CA') : 'Aucun'}</div></div>
        <div className="snap-divider"></div>
        <div className="snap-block"><div className="snap-lbl">Lignes actuel</div><div className="snap-val">{actData.length > 0 ? actData.length + ' lignes' : '—'}</div></div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card kpi-new"><div className="kpi-lbl">🟢 Nouveaux</div><div className="kpi-val">{hasSnapshots ? kpis.newCount : '—'}</div><div className="kpi-sub">items absents avant</div></div>
        <div className="kpi-card kpi-mod"><div className="kpi-lbl">🟡 Modifiés</div><div className="kpi-val">{hasSnapshots ? kpis.modCount : '—'}</div><div className="kpi-sub">quantité ou poids changé</div></div>
        <div className="kpi-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--ruby),transparent)' }}></div>
          <div className="kpi-lbl" style={{ color: 'var(--ruby)' }}>🔴 Disparus</div><div className="kpi-val">{hasSnapshots ? kpis.goneCount : '—'}</div><div className="kpi-sub">items absents maintenant</div>
        </div>
        <div className="kpi-card kpi-snap"><div className="kpi-lbl">📊 Total changements</div><div className="kpi-val">{hasSnapshots ? kpis.newCount + kpis.modCount + kpis.goneCount : '—'}</div><div className="kpi-sub">sur l'inventaire global</div></div>
      </div>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setConfirmOpen(true)}>Sauvegarder l'état actuel</button>
        <button className="btn btn-primary" onClick={handleExportPdf} disabled={diffRows.length === 0}>Exporter PDF</button>
      </div>

      <div className="diff-layout">
        {isLoading ? (
          <div className="spinner-box" style={{ gridColumn: '1 / -1' }}><div className="spinner-ring"></div> Chargement…</div>
        ) : !hasSnapshots ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">📸</div>
            <div className="empty-state-title">Aucun état précédent disponible.</div>
            <div className="empty-state-sub">Cliquez <strong>Sauvegarder l'état actuel</strong> pour créer le premier relevé.</div>
          </div>
        ) : (
          <>
            <DiffCategorySidebar categories={categories} diffRows={diffRows} activeCat={activeCat} onSelectCat={setActiveCat} />
            <div className="diff-content">
              <DiffView filteredDiff={filteredDiff} categories={categories} />
            </div>
          </>
        )}
      </div>

      <SnapshotConfirmModal open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleSaveSnapshot} saving={saveMutation.isPending} />
    </div>
  );
}
