import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlanningStore } from '../../store/usePlanningStore';
import {
  useProblemesQuery, useResponsablesQuery, useCreateProblemeMutation, useUpdateProblemeMutation, useCloturerProblemeMutation,
} from './queries';
import { PILIERS, fmtDate, fmtId, retardJours, isIncomplet, filterProblemes, localToday } from './logic';
import { StatutBadge } from './components/Badges';
import ProblemeCharts from './components/ProblemeCharts';
import EditProblemeModal from './components/EditProblemeModal';
import PdfFormatModal from './components/PdfFormatModal';
import DateNav from './components/DateNav';
import { exportProblematiquesPdf } from './exportProblematiquesPdf';
import './problematiques.css';

export default function ProblematiquesPage() {
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === 'admin';
  const addToast = usePlanningStore((s) => s.addToast);
  const [searchParams, setSearchParams] = useSearchParams();

  const [curDate, setCurDate] = useState(localToday());
  const [search, setSearch] = useState('');
  const [pilierFilter, setPilierFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState(searchParams.get('statut') || '');
  const [showCloture, setShowCloture] = useState(false);
  const [incompletOnly, setIncompletOnly] = useState(searchParams.get('incomplet') === '1');
  const [activePilierChart, setActivePilierChart] = useState(searchParams.get('pilier') || '');
  const [editModal, setEditModal] = useState({ open: false, id: null });
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const problemesQ = useProblemesQuery();
  const responsablesQ = useResponsablesQuery();
  const createMutation = useCreateProblemeMutation();
  const updateMutation = useUpdateProblemeMutation();
  const cloturerMutation = useCloturerProblemeMutation();

  const allProblems = problemesQ.data || [];
  const responsables = responsablesQ.data || [];

  // Appliquer le filtre pilier venant de l'URL (navigation depuis le tableau de bord)
  useEffect(() => {
    const urlPilier = searchParams.get('pilier');
    if (urlPilier) { setPilierFilter(urlPilier); setActivePilierChart(urlPilier); }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => filterProblemes(allProblems, {
    search, pilier: pilierFilter, statut: statutFilter, showCloture, incomplet: incompletOnly, dateCutoff: curDate,
  }), [allProblems, search, pilierFilter, statutFilter, showCloture, incompletOnly, curDate]);

  const incompletCount = useMemo(() => allProblems.filter((p) => !['Clôturé', 'Annulé'].includes(p.statut) && isIncomplet(p)).length, [allProblems]);

  function selectPilierBtn(pilier) {
    if (activePilierChart === pilier) { setActivePilierChart(''); setPilierFilter(''); return; }
    setActivePilierChart(pilier);
    setPilierFilter(pilier);
    setIncompletOnly(false);
  }

  function toggleIncomplet() {
    setIncompletOnly((v) => !v);
    setActivePilierChart('');
  }

  function handleOpenNew() { setEditModal({ open: true, id: null }); }
  function handleOpenEdit(id) { setEditModal({ open: true, id }); }
  function handleCloseModal() { setEditModal({ open: false, id: null }); }

  function handleSaveModal(form) {
    const payload = {
      intitule: form.intitule.trim(), pilier: form.pilier, statut: form.statut, priorite: form.priorite,
      responsable: form.responsable || null, description: form.description || null, cause: form.cause || null,
      action: form.action || null, resultat: form.resultat || null, date_prevue: form.date_prevue || null,
      date_resolue: form.date_resolue || null, updated_at: new Date().toISOString(),
    };
    if (editModal.id) {
      updateMutation.mutate({ id: editModal.id, payload }, {
        onSuccess: () => { handleCloseModal(); addToast('Modifications enregistrées ✓', 'success'); },
        onError: (e) => addToast('Erreur : ' + e.message, 'error'),
      });
    } else {
      createMutation.mutate({ ...payload, created_at: new Date().toISOString(), soumis_par: 'registre' }, {
        onSuccess: () => { handleCloseModal(); addToast('Problématique soumise ✓', 'success'); },
        onError: (e) => addToast('Erreur : ' + e.message, 'error'),
      });
    }
  }

  function handleCloturer(id) {
    if (!confirm('Clôturer cette problématique ?')) return;
    cloturerMutation.mutate(id, {
      onSuccess: () => addToast('Problématique clôturée ✓', 'success'),
      onError: (e) => addToast('Erreur : ' + e.message, 'error'),
    });
  }

  function handleExportPdf(format) {
    try { exportProblematiquesPdf(filtered, format, pilierFilter); addToast('PDF exporté ✓', 'success'); }
    catch (e) { addToast('Erreur PDF : ' + e.message, 'error'); }
  }

  return (
    <div className="tool-main">
      <div className="sec-h" style={{ marginBottom: 8 }}>
        <div><div className="sec-t">Registre des problématiques</div><div className="sec-s">Toutes les problématiques, filtrables par pilier, statut, date</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setPdfModalOpen(true)}>📄 Exporter PDF</button>
          <button className="btn btn-primary" onClick={handleOpenNew}>⊕ Soumettre une problématique</button>
        </div>
      </div>

      <DateNav date={curDate} onChange={setCurDate} showTodayButton={false} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div className="pilier-btns">
          <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', alignSelf: 'center', whiteSpace: 'nowrap' }}>Graphiques :</span>
          <button className={`pilier-btn${!activePilierChart && !incompletOnly ? ' active' : ''}`} onClick={() => { setActivePilierChart(''); setPilierFilter(''); setIncompletOnly(false); }}>Tous</button>
          {PILIERS.map((p) => (
            <button key={p} className={`pilier-btn${activePilierChart === p ? ' active' : ''}`} onClick={() => selectPilierBtn(p)}>{p}</button>
          ))}
          <button className={`pilier-btn${incompletOnly ? ' active' : ''}`} onClick={toggleIncomplet}>
            ⚠ Incomplètes {incompletCount > 0 && <span style={{ background: 'var(--amber)', color: '#0F1118', fontSize: '.6rem', fontWeight: 800, padding: '1px 5px', borderRadius: 10, marginLeft: 4 }}>{incompletCount}</span>}
          </button>
        </div>
      </div>

      {activePilierChart && (
        <div className="chart-panel">
          <div className="chart-panel-header">
            <div>
              <div style={{ fontSize: '.65rem', fontWeight: 800, color: 'var(--copper)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>Analyse par pilier</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activePilierChart}</div>
            </div>
          </div>
          <ProblemeCharts pilier={activePilierChart} probs={allProblems.filter((p) => p.pilier === activePilierChart)} mode="active" editable />
        </div>
      )}

      <div className="filters">
        <div className="srch-wrap"><span className="srch-ico">⌕</span><input type="text" className="srch-inp" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="fsel" value={pilierFilter} onChange={(e) => { setPilierFilter(e.target.value); setActivePilierChart(''); }}>
          <option value="">Tous les piliers</option>
          {PILIERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="fsel" value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option>À traiter</option><option>En cours</option><option>Résolu</option><option>Annulé</option><option>Clôturé</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: '.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 4 }}>
          <input type="checkbox" checked={showCloture} onChange={(e) => setShowCloture(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--copper)' }} />
          Afficher les clôturées / résolues
        </label>
      </div>

      <div className="table-shell" style={{ touchAction: 'pan-x' }}>
        <table className="data-table" style={{ minWidth: 1300 }}>
          <thead>
            <tr>
              <th>ID</th><th>Statut</th><th>Soumis le</th><th>Intitulé</th><th>Cause</th><th>Action</th><th>Résultat</th>
              <th>Resp.</th><th>Date prévue</th><th>Retard</th><th>Date résolue</th>{isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={12}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">Aucune problématique trouvée.</div></div></td></tr>
            ) : filtered.map((p) => {
              const retard = retardJours(p);
              return (
                <tr key={p.id}>
                  <td><span className="c-id">#{fmtId(p.id)}</span></td>
                  <td><StatutBadge statut={p.statut} /></td>
                  <td style={{ fontSize: '.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(p.created_at)}</td>
                  <td>
                    <div style={{ lineHeight: 1.3, maxHeight: '6.5em', overflow: 'hidden' }}>
                      <span style={{ fontSize: '.86rem', fontWeight: 500, color: 'var(--text-primary)' }}>{p.intitule}</span>
                      {p.description && <span style={{ display: 'block', fontSize: '.76rem', color: 'var(--text-secondary)', marginTop: 3 }}>{p.description}</span>}
                    </div>
                  </td>
                  <td><div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', maxHeight: '8em', overflow: 'hidden' }}>{p.cause || <span style={{ color: 'var(--text-faint)', fontSize: '.75rem' }}>—</span>}</div></td>
                  <td><div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', maxHeight: '8em', overflow: 'hidden' }}>{p.action || <span style={{ color: 'var(--text-faint)', fontSize: '.75rem' }}>—</span>}</div></td>
                  <td><div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', maxHeight: '8em', overflow: 'hidden' }}>{p.resultat || <span style={{ color: 'var(--text-faint)', fontSize: '.75rem' }}>—</span>}</div></td>
                  <td style={{ fontSize: '.75rem', color: 'var(--text-secondary)' }}>{p.responsable || <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>
                  <td>{p.date_prevue ? <span style={{ fontSize: '.78rem', color: 'var(--text-secondary)' }}>{fmtDate(p.date_prevue)}</span> : <span style={{ color: 'var(--text-faint)', fontSize: '.75rem' }}>—</span>}</td>
                  <td style={{ textAlign: 'center' }}>{retard ? <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--ruby)' }}>+{retard}j</span> : <span style={{ color: 'var(--text-faint)', fontSize: '.75rem' }}>—</span>}</td>
                  <td>{p.date_resolue ? <span style={{ fontSize: '.78rem', color: 'var(--emerald)' }}>{fmtDate(p.date_resolue)}</span> : <span style={{ color: 'var(--text-faint)', fontSize: '.75rem' }}>—</span>}</td>
                  {isAdmin && (
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(p.id)}>Modifier</button>
                      {p.statut !== 'Clôturé' && <button className="btn btn-primary btn-sm" onClick={() => handleCloturer(p.id)}>Clôturer</button>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditProblemeModal open={editModal.open} problemeId={editModal.id} allProblems={allProblems} responsables={responsables} onClose={handleCloseModal} onSave={handleSaveModal} saving={createMutation.isPending || updateMutation.isPending} />
      <PdfFormatModal open={pdfModalOpen} onClose={() => setPdfModalOpen(false)} onExport={handleExportPdf} />
    </div>
  );
}
