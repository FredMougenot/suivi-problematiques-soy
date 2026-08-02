import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanningStore } from '../../store/usePlanningStore';
import {
  useCategoriesQuery, organiserCategories,
  useReglesCategorieQuery, useReferenceProduitsQuery,
} from '../inventaire-netrack/queries';
import {
  useCreerCategorie, useModifierCategorie, useSupprimerCategorie,
} from '../inventaire-netrack/mutations';
import LoadingOverlay from '../../design-system/LoadingOverlay';
import '../inventaire-netrack/inventaireNetrack.css';

const vierge = { parent_id: '', libelle: '', ordre: '', actif: true, notes: '' };

/**
 * Gestion de la nomenclature des categories (base_reference_categories).
 *
 * Deux niveaux : categorie (racine) et sous-categorie, cette derniere
 * facultative. Un meme libelle peut exister sous deux parents differents
 * (PAPIER sous LIGNE EH1 et sous LIGNE TBA) : ce sont deux noeuds distincts,
 * et c'est voulu puisqu'un produit n'appartient qu'a une seule ligne.
 *
 * L'ecran affiche pour chaque noeud son usage reel : combien de regles le
 * pointent, combien de produits en heritent. Sans ce chiffre, on ne sait pas
 * ce qu'on casse en renommant ou en supprimant.
 */
export default function NomenclaturePage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const naviguer = useNavigate();
  const categoriesQ = useCategoriesQuery();
  const reglesQ = useReglesCategorieQuery();
  const produitsQ = useReferenceProduitsQuery();

  const creer = useCreerCategorie();
  const modifier = useModifierCategorie();
  const supprimer = useSupprimerCategorie();
  const enCoursEcriture = creer.isPending || modifier.isPending || supprimer.isPending;

  const [brouillon, setBrouillon] = useState(null); // { id? , ...champs }

  const liste = useMemo(
    () => organiserCategories(categoriesQ.data || []),
    [categoriesQ.data],
  );

  const racines = useMemo(
    () => liste.filter((c) => c.profondeur === 0),
    [liste],
  );

  /** Nombre de regles pointant chaque noeud. */
  const reglesParNoeud = useMemo(() => {
    const m = new Map();
    for (const r of reglesQ.data || []) {
      if (r.categorie_id === null || r.categorie_id === undefined) continue;
      m.set(r.categorie_id, (m.get(r.categorie_id) || 0) + 1);
    }
    return m;
  }, [reglesQ.data]);

  /**
   * Nombre de produits par noeud. Le referentiel ne stocke que les libelles,
   * pas l'id : on compare donc sur le couple (categorie, sous_categorie),
   * ce qui suffit puisque ce couple identifie le noeud de facon unique.
   */
  const produitsParChemin = useMemo(() => {
    const m = new Map();
    for (const p of produitsQ.data || []) {
      if (!p.categorie) continue;
      const cat = p.categorie;
      m.set(cat, (m.get(cat) || 0) + 1);
      if (p.sous_categorie) {
        const cle = cat + '\u0000' + p.sous_categorie;
        m.set(cle, (m.get(cle) || 0) + 1);
      }
    }
    return m;
  }, [produitsQ.data]);

  const produitsDe = (c) => (c.profondeur === 0
    ? produitsParChemin.get(c.libelle) || 0
    : produitsParChemin.get(c.parent_libelle + '\u0000' + c.libelle) || 0);

  function ouvrirCreation(parentId) {
    setBrouillon({ ...vierge, parent_id: parentId ?? '' });
  }

  function ouvrirEdition(c) {
    setBrouillon({
      id: c.id,
      parent_id: c.parent_id ?? '',
      libelle: c.libelle,
      ordre: c.ordre ?? '',
      actif: c.actif !== false,
      notes: c.notes ?? '',
    });
  }

  async function enregistrer() {
    if (!brouillon || !String(brouillon.libelle).trim()) {
      addToast('Le libellé est obligatoire', 'error');
      return;
    }
    try {
      if (brouillon.id) {
        await modifier.mutateAsync(brouillon);
        addToast('Catégorie modifiée ✓', 'success');
      } else {
        await creer.mutateAsync(brouillon);
        addToast('Catégorie créée ✓', 'success');
      }
      setBrouillon(null);
    } catch (e) {
      // Violation d'unicite : le message brut de Postgres n'aide pas.
      const msg = String(e.message || '');
      addToast(
        msg.includes('unique') || msg.includes('duplicate')
          ? 'Ce libellé existe déjà au même niveau.'
          : 'Enregistrement impossible : ' + msg,
        'error',
      );
    }
  }

  async function supprimerNoeud(c) {
    const usages = (reglesParNoeud.get(c.id) || 0);
    if (usages > 0) {
      addToast(usages + ' règle(s) utilisent cette catégorie — modifiez-les d\'abord', 'error');
      return;
    }
    try {
      await supprimer.mutateAsync(c.id);
      addToast('Catégorie supprimée ✓', 'success');
      setBrouillon(null);
    } catch (e) {
      const msg = String(e.message || '');
      addToast(
        msg.includes('violates foreign key')
          ? 'Impossible : cette catégorie est encore utilisée ou porte des sous-catégories.'
          : 'Suppression impossible : ' + msg,
        'error',
      );
    }
  }

  const enCours = categoriesQ.isLoading || reglesQ.isLoading || produitsQ.isLoading;
  const enErreur = categoriesQ.error || reglesQ.error || produitsQ.error;

  const nbRacines = racines.length;
  const nbEnfants = liste.length - nbRacines;

  return (
    <div className="tool-main">
      <div className="sec-h" style={{ marginBottom: 8, paddingLeft: 60 }}>
        <div>
          <div className="sec-t">Nomenclature des catégories</div>
          <div className="sec-s">
            Liste fermée des catégories et sous-catégories utilisables par les règles
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sans menu lateral, cet ecran serait un cul-de-sac. */}
          <button className="btn btn-secondary" onClick={() => naviguer('/inventaire-netrack')}>
            ← Inventaire
          </button>
          <button className="btn btn-secondary" onClick={() => categoriesQ.refetch()}>
            Actualiser
          </button>
          <button className="btn btn-primary" onClick={() => ouvrirCreation('')}>
            Nouvelle catégorie
          </button>
        </div>
      </div>

      {enErreur && (
        <div className="info-banner">
          <span>ⓘ</span>
          <span>Lecture impossible : {enErreur.message}</span>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card kpi-global">
          <div className="kpi-lbl">Catégories</div>
          <div className="kpi-val">{nbRacines}</div>
          <div className="kpi-sub">{nbEnfants} sous-catégorie(s)</div>
        </div>
        <div className="kpi-card kpi-gh">
          <div className="kpi-lbl">Règles rattachées</div>
          <div className="kpi-val">{(reglesQ.data || []).filter((r) => r.categorie_id).length}</div>
          <div className="kpi-sub">sur {(reglesQ.data || []).length} règles actives</div>
        </div>
        <div className="kpi-card kpi-poids">
          <div className="kpi-lbl">Produits catégorisés</div>
          <div className="kpi-val">
            {(produitsQ.data || []).filter((p) => p.categorie).length}
          </div>
          <div className="kpi-sub">
            {(produitsQ.data || []).filter((p) => !p.categorie).length} sans catégorie
          </div>
        </div>
      </div>

      <div className="nr-analyse">
        <div className="nr-analyse-t">
          Un même libellé peut exister sous deux parents différents — <b>PAPIER</b> sous
          <b> LIGNE EH1</b> et sous <b>LIGNE TBA</b> sont deux entrées distinctes, ce qui
          est correct puisqu'un produit n'appartient qu'à une seule ligne. Renommer une
          entrée mettra à jour les règles qui la pointent et relancera le recalcul.
        </div>
      </div>

      <div className="table-shell dt-glow">
        {enCours ? <LoadingOverlay /> : liste.length === 0 ? (
          <div className="nr-vide">Aucune catégorie. Créez-en une pour commencer.</div>
        ) : (
          <table className="data-table nr-large">
            <thead>
              <tr>
                <th className="nr-th">Catégorie / Sous-catégorie</th>
                <th style={{ textAlign: 'right' }}>Ordre</th>
                <th style={{ textAlign: 'right' }}>Règles</th>
                <th style={{ textAlign: 'right' }}>Produits</th>
                <th>Notes</th>
                <th>État</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {liste.map((c) => {
                const nbRegles = reglesParNoeud.get(c.id) || 0;
                const nbProduits = produitsDe(c);
                return (
                  <tr key={c.id} data-niv={c.profondeur} style={c.actif === false ? { opacity: .45 } : undefined}>
                    <td
                      className="nr-arbre-cell"
                      style={{ paddingLeft: 8 + c.profondeur * 22 }}
                    >
                      <span className={c.profondeur === 0 ? 'nr-arbre-titre' : ''}>
                        {c.libelle}
                      </span>
                    </td>
                    <td className="nr-num nr-faible">{c.ordre ?? '—'}</td>
                    <td className={'nr-num' + (nbRegles === 0 ? ' nr-manquant' : '')}>{nbRegles}</td>
                    <td className={'nr-num' + (nbProduits === 0 ? ' nr-manquant' : '')}>{nbProduits}</td>
                    <td className="nr-tronque nr-faible">{c.notes || '—'}</td>
                    <td>
                      {c.actif === false
                        ? <span className="nr-verdict" data-v="vide">inactive</span>
                        : <span className="nr-verdict" data-v="utile">active</span>}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {c.profondeur === 0 && (
                        <button
                          className="btn btn-secondary nr-mini"
                          onClick={() => ouvrirCreation(c.id)}
                          title="Ajouter une sous-catégorie"
                        >+ sous-cat.</button>
                      )}
                      <button
                        className="btn btn-secondary nr-mini"
                        onClick={() => ouvrirEdition(c)}
                      >Modifier</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {brouillon && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setBrouillon(null); }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">
                {brouillon.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </div>
              <div className="modal-subtitle">
                Sans parent, l'entrée est une catégorie. Avec un parent, c'est une
                sous-catégorie.
              </div>
            </div>

            <div className="modal-body">
              <div className="nr-ed-ligne">
                <div className="field nr-ed-large">
                  <label className="field-label">Parent</label>
                  <select
                    className="field-select"
                    value={brouillon.parent_id ?? ''}
                    onChange={(e) => setBrouillon((b) => ({ ...b, parent_id: e.target.value }))}
                  >
                    <option value="">— aucun (catégorie de premier niveau) —</option>
                    {racines
                      .filter((r) => r.id !== brouillon.id)
                      .map((r) => <option key={r.id} value={r.id}>{r.libelle}</option>)}
                  </select>
                </div>
                <div className="field nr-ed-petit">
                  <label className="field-label" title="Laisser vide pour un tri alphabétique">
                    Ordre
                  </label>
                  <input
                    className="field-input"
                    type="number"
                    value={brouillon.ordre ?? ''}
                    onChange={(e) => setBrouillon((b) => ({ ...b, ordre: e.target.value }))}
                  />
                </div>
              </div>

              <div className="nr-ed-ligne">
                <div className="field nr-ed-large">
                  <label className="field-label">Libellé</label>
                  <input
                    className="field-input"
                    value={brouillon.libelle}
                    onChange={(e) => setBrouillon((b) => ({ ...b, libelle: e.target.value }))}
                    placeholder="ex. PAPIER"
                  />
                </div>
                <label className="nr-ed-case">
                  <input
                    type="checkbox"
                    checked={brouillon.actif !== false}
                    onChange={(e) => setBrouillon((b) => ({ ...b, actif: e.target.checked }))}
                  />
                  Active
                </label>
              </div>

              <div className="nr-ed-ligne">
                <div className="field nr-ed-large">
                  <label className="field-label">Notes</label>
                  <input
                    className="field-input"
                    value={brouillon.notes ?? ''}
                    onChange={(e) => setBrouillon((b) => ({ ...b, notes: e.target.value }))}
                  />
                </div>
              </div>

              {brouillon.id && (reglesParNoeud.get(brouillon.id) || 0) > 0 && (
                <div className="nr-ed-erreurs" style={{ color: '#e0c072', borderColor: 'rgba(214,168,56,.4)', background: 'rgba(214,168,56,.1)' }}>
                  ⚠ {reglesParNoeud.get(brouillon.id)} règle(s) pointent cette entrée.
                  La renommer mettra à jour la référence produits.
                </div>
              )}
            </div>

            <div className="modal-footer">
              {brouillon.id && (
                <button
                  className="btn btn-secondary nr-ed-suppr"
                  onClick={() => supprimerNoeud({ id: brouillon.id })}
                  disabled={enCoursEcriture}
                >Supprimer</button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => setBrouillon(null)}
                disabled={enCoursEcriture}
              >Annuler</button>
              <button
                className="btn btn-primary"
                onClick={enregistrer}
                disabled={enCoursEcriture}
              >
                {enCoursEcriture ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
