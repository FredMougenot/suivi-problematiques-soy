import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useGhCategoriesFullQuery, useGhPoidsListQuery, useTraxMapQuery, getPoidsUnitaire } from '../shared/ghSharedQueries';
import { useUsineStockQuery } from './queries';
import { matchesCategory, getCategoryForRow, loadGhRowsFromStorage, fmtDate } from './logic';
import { exportGlobalPdf } from './exportGlobalPdf';
import { exportGlobalExcel } from './exportGlobalExcel';
import GlobalCategorySidebar from './components/GlobalCategorySidebar';
import StockView from './components/StockView';
import './inventaireGlobal.css';
import LoadingOverlay from '../../design-system/LoadingOverlay';

export default function InventaireGlobalPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const [search, setSearch] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [activeCat, setActiveCat] = useState(null);
  const [ghRefreshKey, setGhRefreshKey] = useState(0);
  const categoriesQ = useGhCategoriesFullQuery();
  const poidsQ = useGhPoidsListQuery();
  const traxMapQ = useTraxMapQuery();
  const usineQ = useUsineStockQuery();
  const categories = categoriesQ.data || [];
  const poidsList = poidsQ.data || [];
  const traxMap = traxMapQ.data || new Map();
  const usineRows = usineQ.data?.rows || [];
  const dateReleveUsine = usineQ.data?.dateReleve || null;
  const ghRows = useMemo(() => loadGhRowsFromStorage(poidsList, getPoidsUnitaire), [poidsList, ghRefreshKey]);
  const allRows = useMemo(() => { const combined = [...usineRows, ...ghRows]; combined.forEach((row) => { row._cat = getCategoryForRow(row, categories); }); return combined; }, [usineRows, ghRows, categories]);
  const filteredRows = useMemo(() => allRows.filter((row) => { if (locFilter && row.source !== locFilter) return false; if (activeCat === 'NO_CAT') { if (row._cat) return false; } else if (activeCat !== null) { const cat = categories.find((c) => c.id === activeCat); if (!cat) return false; if (row.source === 'gh') { if (!matchesCategory(row._original || row, cat)) return false; } else { if (!row._cat) return false; let c = row._cat, found = false; while (c) { if (c.id === activeCat) { found = true; break; } c = categories.find((x) => x.id === c.parent_id); } if (!found) return false; } } if (search) { const haystack = [row.code_produit, row.description, row.no_lot, row.notes].join(' ').toLowerCase(); if (!haystack.includes(search.toLowerCase())) return false; } return true; }), [allRows, locFilter, activeCat, search, categories]);
  const kpis = useMemo(() => { const rows = filteredRows.length > 0 ? filteredRows : allRows; const totalPoids = rows.reduce((s, r) => s + (parseFloat(r.poids_total) || 0), 0); return { total: rows.length, usine: rows.filter((r) => r.source === 'usine').length, gh: rows.filter((r) => r.source === 'gh').length, poids: totalPoids }; }, [filteredRows, allRows]);

  function handleRefresh() { setGhRefreshKey((k) => k + 1); usineQ.refetch(); categoriesQ.refetch(); poidsQ.refetch(); traxMapQ.refetch(); addToast('Actualisé ✓', 'success'); }
  function handleExportPdf() { try { exportGlobalPdf(filteredRows, dateReleveUsine, traxMap); addToast('PDF exporté ✓', 'success'); } catch (e) { addToast('Erreur PDF : ' + e.message, 'error'); } }
  function handleExportExcel() { try { exportGlobalExcel(filteredRows, categories, traxMap); addToast('Excel exporté ✓', 'success'); } catch (e) { addToast('Erreur Excel : ' + e.message, 'error'); } }

  const isLoading = categoriesQ.isLoading || usineQ.isLoading;
  const noGhData = ghRows.length === 0;

  return (
    <div className="tool-main">
      <div style={{ paddingLeft: 60 }}>
        <div className="page-eyebrow">Vue consolidée</div>
        <div className="page-title">Inventaire Global — Usine + GH</div>
        <div className="page-sub">Stock combiné de l'usine et de l'entrepôt GH Logistics. Classé par catégorie, code produit et numéro de lot.</div>
      </div>
      {noGhData && <div className="info-banner"><span>ⓘ</span><span>Stock GH non disponible — connectez-vous à GH Logistics.</span></div>}
      <div className="kpi-grid">
        <div className="kpi-card kpi-global"><div className="kpi-lbl">🌐 Total global</div><div className="kpi-val">{kpis.total}</div><div className="kpi-sub">lignes de stock</div></div>
        <div className="kpi-card kpi-usine"><div className="kpi-lbl">🏭 Stock usine</div><div className="kpi-val">{kpis.usine}</div><div className="kpi-sub">relevé : {dateReleveUsine ? fmtDate(dateReleveUsine) : '—'}</div></div>
        <div className="kpi-card kpi-gh"><div className="kpi-lbl">🏪 Stock GH</div><div className="kpi-val">{kpis.gh}</div><div className="kpi-sub">entrepôt externe</div></div>
        <div className="kpi-card kpi-poids"><div className="kpi-lbl">⚖️ Poids total</div><div className="kpi-val">{kpis.poids > 0 ? kpis.poids.toFixed(0) : '—'}</div><div className="kpi-sub">kg combinés</div></div>
      </div>
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="gib-search-wrap"><span className="search-icon">⌕</span><input type="text" placeholder="Rechercher code, lot, description…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select className="fsel" value={locFilter} onChange={(e) => setLocFilter(e.target.value)}><option value="">Tous les emplacements</option><option value="usine">🏭 Usine seulement</option><option value="gh">🏪 GH seulement</option></select>
          <button className="btn btn-secondary" onClick={handleRefresh}>Actualiser</button>
          <Link to="/inventaire-usine" className="btn btn-secondary">Saisie usine</Link>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleExportPdf} disabled={allRows.length === 0}>Exporter PDF</button>
          <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg,#1d7044,#2a9a5e)', transform: 'translateZ(0)'}} onClick={handleExportExcel} disabled={allRows.length === 0}>Exporter Excel</button>
        </div>
      </div>
      <div className="global-layout">
        <GlobalCategorySidebar categories={categories} allRows={allRows} activeCat={activeCat} onSelectCat={(c) => setActiveCat(c)} onSelectCode={(code) => { setActiveCat(null); setSearch(code); }} />
        <div className="global-content">{isLoading ? <LoadingOverlay /> : <StockView filteredRows={filteredRows} categories={categories} traxMap={traxMap} />}</div>
      </div>
    </div>
  );
}
