import { useEffect, useState } from 'react';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useGhCategoriesQuery, useSaveCategoryMutation, useDeleteCategoryMutation, useGhPoidsQuery, useSaveAllPoidsMutation, useCorrespondanceQuery, useSaveCorrespondanceMutation, useDeleteCorrespondanceMutation } from './queries';
import { COLORS, EMOJIS } from './logic';
import CategoriesList from './components/CategoriesList';
import CategoryEditor from './components/CategoryEditor';
import PoidsTable from './components/PoidsTable';
import CorrespondanceSection from './components/CorrespondanceSection';
import './parametres-gh.css';

let tmpCatIdCounter = 0;

export default function ParametresGhPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const [section, setSection] = useState('categories');
  const categoriesQ = useGhCategoriesQuery();
  const saveCatMutation = useSaveCategoryMutation();
  const deleteCatMutation = useDeleteCategoryMutation();
  const poidsQ = useGhPoidsQuery();
  const saveAllPoidsMutation = useSaveAllPoidsMutation();
  const corrQ = useCorrespondanceQuery();
  const saveCorrMutation = useSaveCorrespondanceMutation();
  const deleteCorrMutation = useDeleteCorrespondanceMutation();
  const [localCategories, setLocalCategories] = useState([]);
  const [activeCatId, setActiveCatId] = useState(null);
  const [localPoids, setLocalPoids] = useState([]);

  useEffect(() => { if (categoriesQ.data) setLocalCategories(categoriesQ.data); }, [categoriesQ.data]);
  useEffect(() => { if (poidsQ.data) setLocalPoids(poidsQ.data); }, [poidsQ.data]);

  const activeCat = localCategories.find((c) => c.id === activeCatId);

  function createCategory() { const id = 'cat_' + Date.now() + '_' + (tmpCatIdCounter++); setLocalCategories((prev) => [...prev, { id, name: 'Nouvelle catégorie', icon: EMOJIS[Math.floor(Math.random() * EMOJIS.length)], color: COLORS[localCategories.length % COLORS.length], rules: [] }]); setActiveCatId(id); }
  function updateActiveCat(updated) { setLocalCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c))); }
  async function saveActiveCat() { try { await saveCatMutation.mutateAsync(activeCat); addToast('Catégorie sauvegardée ✓', 'success'); } catch (e) { addToast('Erreur : ' + e.message, 'error'); } }
  async function deleteActiveCat() { if (!confirm('Supprimer cette catégorie ?')) return; try { await deleteCatMutation.mutateAsync(activeCat.id); setLocalCategories((prev) => prev.filter((c) => c.id !== activeCat.id)); setActiveCatId(null); addToast('Catégorie supprimée', 'success'); } catch (e) { addToast('Erreur : ' + e.message, 'error'); } }
  function updatePoidsRow(idx, field, val) { setLocalPoids((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p))); }
  function addPoidsRow() { setLocalPoids((prev) => [...prev, { id: 'poids_' + Date.now(), code: '', description: '', poids_unitaire: 0, matchType: 'exact', ajout_manuel: false }]); }
  function deletePoidsRow(idx) { if (!confirm('Supprimer ce poids ?')) return; setLocalPoids((prev) => prev.filter((_, i) => i !== idx)); }
  async function saveAllPoids() { try { await saveAllPoidsMutation.mutateAsync(localPoids); addToast('Poids sauvegardés ✓', 'success'); } catch (e) { addToast('Erreur : ' + e.message, 'error'); } }
  async function saveCorr(form) { try { await saveCorrMutation.mutateAsync(form); addToast(form.id ? 'Modifié ✓' : 'Ajouté ✓', 'success'); } catch (e) { addToast('Erreur : ' + e.message, 'error'); } }
  async function deleteCorr(row) { if (!confirm(`Supprimer "${row.trax}" ?`)) return; try { await deleteCorrMutation.mutateAsync(row.id); addToast('Supprimé', 'success'); } catch (e) { addToast('Erreur : ' + e.message, 'error'); } }

  return (
    <div className="tool-main-full">
      <div className="sec-h" style={{ marginBottom: 8, paddingLeft: 60 }}>
        <div>
          <div className="sec-t">Paramètres GH</div>
          <div className="sec-s">Catégories, poids unitaires et correspondances de codes produits</div>
        </div>
      </div>
      <div className="param-layout">
        <div className="param-sidebar">
          <div className="sidebar-section">Navigation</div>
          <div className={`cat-nav-item${section === 'categories' ? ' active' : ''}`} onClick={() => setSection('categories')}><div className="cat-nav-icon">📂</div><div className="cat-nav-name">Catégories</div><div className="cat-nav-count">{localCategories.length}</div></div>
          <div className={`cat-nav-item${section === 'poids' ? ' active' : ''}`} onClick={() => setSection('poids')}><div className="cat-nav-icon">⚖️</div><div className="cat-nav-name">Poids</div><div className="cat-nav-count">{localPoids.length}</div></div>
          <div className={`cat-nav-item${section === 'correspondance' ? ' active' : ''}`} onClick={() => setSection('correspondance')}><div className="cat-nav-icon">🔗</div><div className="cat-nav-name">Correspondance</div><div className="cat-nav-count">{corrQ.data?.length || 0}</div></div>
        </div>
        <div className="param-main">
          {section === 'categories' && (
            <div>
              {!activeCat ? (
                <>
                  <div className="sec-h" style={{ marginBottom: 16 }}>
                    <div><div className="sec-t">Catégories d'inventaire</div><div className="sec-s">Règles de catégorisation des produits GH</div></div>
                    <button className="btn btn-primary" onClick={createCategory}>Nouvelle catégorie</button>
                  </div>
                  <CategoriesList categories={localCategories} onEdit={setActiveCatId} />
                </>
              ) : (
                <>
                  <div className="sec-h" style={{ marginBottom: 16 }}>
                    <div><div className="sec-t">{activeCat.icon} {activeCat.name}</div><div className="sec-s">Modifier la catégorie</div></div>
                    <button className="btn btn-secondary" onClick={() => setActiveCatId(null)}>← Retour</button>
                  </div>
                  <CategoryEditor cat={activeCat} allCategories={localCategories} onChange={updateActiveCat} onSave={saveActiveCat} onDelete={deleteActiveCat} onBack={() => setActiveCatId(null)} saving={saveCatMutation.isPending} />
                </>
              )}
            </div>
          )}
          {section === 'poids' && (
            <div>
              <div className="sec-h" style={{ marginBottom: 16 }}>
                <div><div className="sec-t">Poids unitaires</div><div className="sec-s">Poids unitaire (kg) par code produit</div></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={addPoidsRow}>Ajouter un produit</button>
                  <button className="btn btn-primary" onClick={saveAllPoids} disabled={saveAllPoidsMutation.isPending}>{saveAllPoidsMutation.isPending ? 'Enregistrement…' : 'Sauvegarder'}</button>
                </div>
              </div>
              <PoidsTable poidsList={localPoids} onUpdate={updatePoidsRow} onDelete={deletePoidsRow} />
            </div>
          )}
          {section === 'correspondance' && (
            <>
              <div className="sec-h" style={{ marginBottom: 16 }}>
                <div><div className="sec-t">Correspondance TRAX</div><div className="sec-s">Codes TRAX ↔ codes internes SOY</div></div>
              </div>
              <CorrespondanceSection rows={corrQ.data || []} onSave={saveCorr} onDelete={deleteCorr} saving={saveCorrMutation.isPending} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
