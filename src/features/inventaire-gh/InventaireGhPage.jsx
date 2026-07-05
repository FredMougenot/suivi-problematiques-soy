import { useEffect, useMemo, useState } from 'react';
import { usePlanningStore } from '../../store/usePlanningStore';
import {
  useGhSessionQuery, useConnectGhMutation, useLoadGhInventoryMutation,
  useGhCategoriesQuery, useGhPoidsQuery, useTraxCodesQuery, useAddTraxMutation,
} from './queries';
import { parseInventoryHtml, sortByExpiration, matchesCategory, getPoidsUnitaire } from './logic';
import {
  loadCamions, persistCamions, addSelectionToCamion, removeItemFromCamion,
  adjustItemQty as adjustItemQtyFn, markCamionSent,
} from './camionsLogic';
import { exportGhCamionPdf } from './exportGhPdf';
import CategorySidebar from './components/CategorySidebar';
import CamionsSection from './components/CamionsSection';
import InventoryTable from './components/InventoryTable';
import TraxModal from './components/TraxModal';
import CommandePanel from './components/CommandePanel';
import './inventaireGh.css';

function loadStoredInventory() {
  try {
    const saved = localStorage.getItem('gh_inventory');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export default function InventaireGhPage() {
  const addToast = usePlanningStore((s) => s.addToast);

  const [allInventory, setAllInventory] = useState(loadStoredInventory);
  const [activeCatId, setActiveCatId] = useState(allInventory.length ? 'EMPTY_TABLE' : null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterProduit, setFilterProduit] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [traxModal, setTraxModal] = useState({ open: false, code: '', desc: '' });
  const [{ camions, camionActifId: initialCamionActifId }] = useState(loadCamions);
  const [camionsList, setCamionsList] = useState(camions);
  const [camionActifId, setCamionActifId] = useState(initialCamionActifId);
  const [exportingPdf, setExportingPdf] = useState(false);

  const sessionQ = useGhSessionQuery();
  const connectMutation = useConnectGhMutation();
  const loadInventoryMutation = useLoadGhInventoryMutation();
  const categoriesQ = useGhCategoriesQuery();
  const poidsQ = useGhPoidsQuery();
  const traxQ = useTraxCodesQuery();
  const addTraxMutation = useAddTraxMutation();

  const categories = categoriesQ.data || [];
  const poidsList = poidsQ.data || [];
  const traxCodes = traxQ.data || new Set();
  const session = sessionQ.data;

  useEffect(() => {
    try { localStorage.setItem('gh_inventory', JSON.stringify(allInventory)); } catch { /* ignore */ }
  }, [allInventory]);

  useEffect(() => { persistCamions(camionsList); }, [camionsList]);

  const camionActif = camionsList.find((c) => c.id === camionActifId) || null;

  function handleAddCamion() {
    const numero = camionsList.length + 1;
    const nouveau = { id: 'cam_' + Date.now(), nom: 'Camion ' + numero, items: [], dateCreation: new Date().toISOString() };
    setCamionsList((prev) => [...prev, nouveau]);
    addToast('Camion ' + numero + ' créé', 'success');
  }

  function handleDeleteCamion(camionId) {
    if (camionsList.length <= 1) { addToast('Impossible de supprimer le dernier camion', 'error'); return; }
    const camion = camionsList.find((c) => c.id === camionId);
    if (!camion) return;
    if (camion.items.length > 0 && !confirm(`Voulez-vous vraiment supprimer "${camion.nom}" ? Il contient ${camion.items.length} item(s).`)) return;
    setCamionsList((prev) => prev.filter((c) => c.id !== camionId));
    if (camionActifId === camionId) {
      const remaining = camionsList.filter((c) => c.id !== camionId);
      setCamionActifId(remaining[0]?.id || null);
    }
    addToast('Camion supprimé', 'info');
  }

  function handleAddSelectionToTruck() {
    if (!camionActif) { addToast('Aucun camion sélectionné', 'error'); return; }
    const { camion: updated, addedCount } = addSelectionToCamion(camionActif, filtered, selectedRows, poidsList);
    setCamionsList((prev) => prev.map((c) => (c.id === camionActif.id ? updated : c)));
    setSelectedRows(new Set());
    addToast('Ajouté ' + addedCount + ' item(s) au ' + camionActif.nom + ' ✓', 'success');
  }

  function handleRemoveFromCamion(key) {
    if (!camionActif) return;
    setCamionsList((prev) => prev.map((c) => (c.id === camionActif.id ? removeItemFromCamion(c, key) : c)));
  }

  function handleAdjustQty(key, delta) {
    if (!camionActif) return;
    setCamionsList((prev) => prev.map((c) => (c.id === camionActif.id ? adjustItemQtyFn(c, key, delta) : c)));
  }

  function handleClearCommande() {
    if (!camionActif) return;
    if (camionActif.items.length > 0 && !confirm(`Voulez-vous vraiment effacer tous les items du ${camionActif.nom} ?`)) return;
    setCamionsList((prev) => prev.map((c) => (c.id === camionActif.id ? { ...c, items: [] } : c)));
    addToast('Camion vidé', 'info');
  }

  function handleMarkSent() {
    if (!camionActif) return;
    setCamionsList((prev) => prev.map((c) => (c.id === camionActif.id ? markCamionSent(c) : c)));
    addToast('Items marqués comme envoyés ✓', 'success');
  }

  function handleExportGhPdf() {
    if (!camionActif) return;
    setExportingPdf(true);
    try {
      exportGhCamionPdf(camionActif);
    } catch (e) {
      addToast('Erreur PDF : ' + e.message, 'error');
    } finally {
      setExportingPdf(false);
    }
  }

  const divisions = useMemo(() => [...new Set(allInventory.map((r) => r.division).filter(Boolean))].sort(), [allInventory]);
  const produits = useMemo(() => [...new Set(allInventory.map((r) => r.no_produit).filter(Boolean))].sort(), [allInventory]);

  const filtered = useMemo(() => {
    let rows;
    if (activeProduct) {
      rows = allInventory.filter((r) => (r._raw?.[1] || '') === activeProduct);
      return sortByExpiration(rows);
    }
    if (activeCatId === 'EMPTY_TABLE') return [];
    if (activeCatId === null) {
      rows = allInventory.filter((r) => {
        if (filterDivision && r.division !== filterDivision) return false;
        if (filterProduit && r.no_produit !== filterProduit) return false;
        if (search) {
          const raw = r._raw || [];
          const s = [raw[1], raw[2], raw[13], raw[16], raw[17]].join(' ').toLowerCase();
          if (!s.includes(search.toLowerCase())) return false;
        }
        return true;
      });
      return sortByExpiration(rows);
    }
    if (activeCatId === 'NO_CATEGORY') {
      rows = allInventory.filter((r) => !categories.some((cat) => matchesCategory(r, cat)));
      return sortByExpiration(rows);
    }
    const cat = categories.find((c) => c.id === activeCatId);
    if (!cat) return [];
    rows = allInventory.filter((r) => matchesCategory(r, cat));
    return sortByExpiration(rows);
  }, [allInventory, activeCatId, activeProduct, filterDivision, filterProduit, search, categories]);

  function handleSelectCategory(catId) {
    setActiveProduct(null);
    setActiveCatId(catId);
    setSelectedRows(new Set());
  }

  function handleSelectProduct(produit) {
    setActiveProduct(produit);
    setSelectedRows(new Set());
  }

  function handleToggleSelect(keys, mode) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (mode === 'add-range') { keys.forEach((k) => next.add(k)); return next; }
      keys.forEach((k) => { if (next.has(k)) next.delete(k); else next.add(k); });
      return next;
    });
  }

  const selectionStats = useMemo(() => {
    let qty = 0, weight = 0;
    filtered.forEach((r) => {
      const key = r._idx !== undefined ? 'row_' + r._idx : r.no_lot + r.no_produit;
      if (!selectedRows.has(key)) return;
      const raw = r._raw || [];
      const code = raw[1] || '';
      const qte = parseFloat(raw[8] || 0);
      qty += qte;
      weight += qte * getPoidsUnitaire(poidsList, code);
    });
    return { count: selectedRows.size, qty: Math.round(qty), weight: weight.toFixed(1) };
  }, [selectedRows, filtered, poidsList]);

  async function handleConnect() {
    try {
      await connectMutation.mutateAsync();
      addToast('Connecté à GH Logistics ✓', 'success');
      handleLoadInventory();
    } catch (e) {
      addToast('Connexion GH échouée : ' + e.message, 'error');
    }
  }

  async function handleLoadInventory() {
    if (!session?.id1 && !connectMutation.data?.id1) { addToast("Connectez-vous d'abord", 'error'); return; }
    const id1 = connectMutation.data?.id1 || session?.id1;
    try {
      const html = await loadInventoryMutation.mutateAsync(id1);
      const items = parseInventoryHtml(html);
      if (!items.length) { addToast('Aucune donnée trouvée dans la réponse GH.', 'error'); return; }
      setAllInventory(items);
      setActiveCatId('EMPTY_TABLE');
      setActiveProduct(null);
      addToast(items.length + ' items chargés ✓', 'success');
    } catch (e) {
      addToast('Erreur : ' + e.message, 'error');
    }
  }

  function handleTraxOpen(code, desc) { setTraxModal({ open: true, code, desc }); }
  function handleTraxSave({ codeTrax, codeInt, desig }) {
    addTraxMutation.mutate({ codeTrax, codeInt, desig }, {
      onSuccess: () => { setTraxModal({ open: false, code: '', desc: '' }); addToast('Ajouté à la correspondance ✓', 'success'); },
      onError: (e) => addToast('Erreur : ' + e.message, 'error'),
    });
  }

  const isConnected = !!(session?.id1 || connectMutation.data?.id1);

  return (
    <div className="tool-main" style={{ padding: 0 }}>
      <div className="gh-status">
        <div className={`gh-dot${isConnected ? ' connected' : ''}`}></div>
        <span className="gh-status-text">{isConnected ? 'Connecté à GH Logistics' : 'Non connecté'}</span>
        {session?.updated_at && <span className="gh-timestamp">Dernière connexion : {new Date(session.updated_at).toLocaleString('fr-CA')}</span>}
        <button className="btn btn-primary" onClick={handleConnect} disabled={connectMutation.isPending}>
          {connectMutation.isPending ? 'Connexion…' : 'Se connecter à GH'}
        </button>
        <button className="btn btn-secondary" onClick={handleLoadInventory} disabled={!isConnected || loadInventoryMutation.isPending}>
          {loadInventoryMutation.isPending ? 'Chargement…' : "Rafraîchir l'inventaire"}
        </button>
        {allInventory.length > 0 && <span className="count-badge">{filtered.length} / {allInventory.length} items</span>}
      </div>

      <div className="gh-search-bar">
        <div className="search-wrap" style={{ flex: 2 }}>
          <input className="gh-search" placeholder="Rechercher par code, description, lot…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%' }} />
        </div>
        <select className="fsel-sm" value={filterDivision} onChange={(e) => setFilterDivision(e.target.value)}>
          <option value="">Toutes les divisions</option>
          {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="fsel-sm" value={filterProduit} onChange={(e) => setFilterProduit(e.target.value)}>
          <option value="">Tous les produits</option>
          {produits.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="gh-page-layout">
        <CategorySidebar
          categories={categories} allInventory={allInventory} activeCatId={activeCatId}
          onSelectCategory={handleSelectCategory} onSelectProduct={handleSelectProduct}
          extraContent={
            <CamionsSection
              camions={camionsList} camionActifId={camionActifId}
              onSelectCamion={setCamionActifId} onAddCamion={handleAddCamion} onDeleteCamion={handleDeleteCamion}
            />
          }
        />

        <div className="gh-content" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          <div>
            <div className="inv-tbl-wrap">
              {allInventory.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '.84rem' }}>Connectez-vous à GH pour charger l'inventaire.</div>
              ) : (
                <InventoryTable
                  filtered={filtered} poidsList={poidsList} traxCodes={traxCodes}
                  selectedRows={selectedRows} onToggleSelect={handleToggleSelect} onTraxOpen={handleTraxOpen}
                />
              )}
            </div>

            {selectedRows.size > 0 && (
              <div className="selection-bar">
                <div className="selection-info">
                  <div className="selection-count"><span>{selectionStats.count}</span> ligne(s) sélectionnée(s)</div>
                  <div className="selection-stats">
                    <span className="sel-stat"><strong>{selectionStats.qty}</strong> unités</span>
                    <span className="sel-stat"><strong>{selectionStats.weight}</strong> kg</span>
                  </div>
                </div>
                <button className="btn-add-to-truck" onClick={handleAddSelectionToTruck}>🚚 Ajouter au camion</button>
              </div>
            )}
          </div>

          <CommandePanel
            camion={camionActif} onRemoveItem={handleRemoveFromCamion} onAdjustQty={handleAdjustQty}
            onClear={handleClearCommande} onMarkSent={handleMarkSent} onExportPdf={handleExportGhPdf} exporting={exportingPdf}
          />
        </div>
      </div>

      <TraxModal
        open={traxModal.open} initialCode={traxModal.code} initialDesc={traxModal.desc}
        onClose={() => setTraxModal({ open: false, code: '', desc: '' })}
        onSave={handleTraxSave} saving={addTraxMutation.isPending}
      />
    </div>
  );
}
