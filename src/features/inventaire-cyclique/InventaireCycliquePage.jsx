import { useEffect, useMemo, useState } from 'react';
import { usePlanningStore } from '../../store/usePlanningStore';
import {
  useParamItemsQuery, useStockQuery, useHistoryQuery,
  useSaveAllStockMutation, useDeleteStockRowMutation, useSubmitNcMutation,
} from './queries';
import { localToday, BASE_ITEMS, buildVerifRows } from './logic';
import { exportInventaireCycliquePdf } from './exportInventaireCycliquePdf';
import VerifTable from './components/VerifTable';
import IcCharts from './components/IcCharts';
import StockTable from './components/StockTable';
import HistorySearch from './components/HistorySearch';
import './inventaireCyclique.css';

export default function InventaireCycliquePage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const [dateStr, setDateStr] = useState(localToday());
  const [stockRows, setStockRows] = useState({});
  const [nextExtra, setNextExtra] = useState(100);

  const paramItemsQ = useParamItemsQuery();
  const stockQ = useStockQuery(dateStr);
  const historyQ = useHistoryQuery();
  const saveAllMutation = useSaveAllStockMutation(dateStr);
  const deleteRowMutation = useDeleteStockRowMutation(dateStr);
  const submitNcMutation = useSubmitNcMutation();

  const paramItems = paramItemsQ.data || [];

  useEffect(() => {
    if (stockQ.data) {
      setStockRows(stockQ.data);
      const maxIdx = Math.max(99, ...Object.keys(stockQ.data).map(Number));
      setNextExtra(maxIdx + 1);
    }
  }, [stockQ.data]);

  const today = localToday();
  const { rows: verifRows, kpis } = useMemo(() => buildVerifRows(paramItems, today), [paramItems, today]);

  function changeDate(delta) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDateStr(d.toISOString().slice(0, 10));
  }

  function handleFieldChange(idx, field, value) {
    setStockRows((prev) => ({ ...prev, [idx]: { ...(prev[idx] || { item_index: idx }), [field]: value } }));
  }

  function handleAddItem() {
    const idx = nextExtra;
    setNextExtra(idx + 1);
    setStockRows((prev) => ({ ...prev, [idx]: { item_index: idx, label: '' } }));
  }

  function handleDeleteRow(idx) {
    if (!confirm('Supprimer cet item ?')) return;
    deleteRowMutation.mutate(idx, {
      onSuccess: () => {
        setStockRows((prev) => { const next = { ...prev }; delete next[idx]; return next; });
        addToast('Item supprimé.', 'info');
      },
    });
  }

  function handleSaveAll() {
    const indices = [...BASE_ITEMS.map((it) => it.idx), ...Object.keys(stockRows).map(Number).filter((i) => i >= 100)];
    saveAllMutation.mutate({ stockRows, indices, paramItems }, {
      onSuccess: ({ errors }) => {
        if (errors > 0) addToast(`${errors} erreur(s).`, 'error');
        else addToast('Tout sauvegardé ✓', 'success');
      },
      onError: (e) => addToast('Erreur : ' + e.message, 'error'),
    });
  }

  function handleSubmitNc() {
    submitNcMutation.mutate(dateStr, {
      onSuccess: () => addToast('Non-conformité créée ✓', 'success'),
      onError: (e) => addToast('Erreur : ' + e.message, 'error'),
    });
  }

  function handleExportPdf() {
    exportInventaireCycliquePdf(paramItems);
  }

  const dateLbl = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="tool-main">
      <div className="ic-header-row">
        <div>
          <div className="page-eyebrow">Qualité</div>
          <div className="page-title">📋 Inventaire Cyclique</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={handleExportPdf}>📄 Export PDF</button>
        </div>
      </div>

      <div className="date-nav">
        <button className="nav-btn" onClick={() => changeDate(-1)}>←</button>
        <div className="date-lbl">{dateLbl}</div>
        <button className="nav-btn" onClick={() => changeDate(1)}>→</button>
        <button className="btn-today" onClick={() => setDateStr(localToday())}>Aujourd'hui</button>
      </div>

      {/* Section 1 — Vérifications cycliques */}
      <div className="section-divider">
        <div className="section-divider-title">✓ Vérifications cycliques</div>
        <div className="section-divider-line"></div>
      </div>
      {paramItemsQ.isLoading ? (
        <div className="spinner" style={{ display: 'flex' }}><div className="sp-ring"></div></div>
      ) : (
        <>
          <IcCharts paramItems={paramItems} />
          <VerifTable rows={verifRows} kpis={kpis} today={today} />
        </>
      )}

      {/* Section 2 — Comptage stock */}
      <div className="section-divider" style={{ marginTop: 36 }}>
        <div className="section-divider-title">📦 Comptage stock</div>
        <div className="section-divider-line"></div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <button className="btn-add" onClick={handleAddItem}>+ Ajouter un item</button>
      </div>
      {stockQ.isLoading ? (
        <div className="spinner" style={{ display: 'flex' }}><div className="sp-ring"></div></div>
      ) : (
        <StockTable stockRows={stockRows} paramItems={paramItems} onFieldChange={handleFieldChange} onDeleteRow={handleDeleteRow} />
      )}

      {/* Section 3 — Historique */}
      <div className="section-divider" style={{ marginTop: 36 }}>
        <div className="section-divider-title">🕐 Historique des comptages</div>
        <div className="section-divider-line"></div>
      </div>
      <HistorySearch historyData={historyQ.data || []} />

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '12px 0 4px', flexWrap: 'wrap' }}>
        <button className="btn-save-all" onClick={handleSaveAll} disabled={saveAllMutation.isPending}>
          💾 {saveAllMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder tout'}
        </button>
        <button onClick={handleSubmitNc} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 'var(--r-md)', background: 'var(--bg-raised)', border: '1px solid var(--ruby)', color: 'var(--ruby)', fontSize: '.86rem', fontWeight: 700, cursor: 'pointer' }}>
          ⚠ Soumettre les non-conformités
        </button>
      </div>
    </div>
  );
}
