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
import './nomenclature.css';

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
 *
 * La page porte sa propre feuille de style (nomenclature.css) et n'emprunte
 * celle d'aucune autre feature.
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
      const cle = String(r.categorie_id);
      m.set(cle, (m.get(cle) || 0) + 1);
    }
    return m;
  }, [reglesQ.data]);

  const reglesDe = (c) => reglesParNoeud.get(String(c.id)) || 0;

  /**
   * Nombre de produits par noeud. Le referentiel ne stocke que les libelles,
   * pas l'id : on compare donc sur le couple (categorie, sous_categorie),
   * ce qui suffit puisque ce couple identifie le noeud de facon unique.
   */
  const produitsParChemin = useMemo(() => {
    const m = new Map();
    for (const p of produitsQ.data || []) {
      if (!p.categorie) continue;
      m.set(p.categorie, (m.get(p.categorie) || 0) + 1);
      if (p.sous_categorie) {
        const cle = p.categorie + '\u0000' + p.sous_categorie;
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

  async function supprimerNoeud(id) {
    try {
      await supprimer.mutateAsync(id);
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
  const reglesRattachees = (reglesQ.data || []).filter((r) => r.categorie_id).length;
  const produits = produitsQ.data || [];

  return (
    <div className="tool-main">
      <div className="sec-h" style={{ marginBottom: 8, paddingLeft: 60 }}>
        <div>
          <div className="sec-t">Nomenclature des catégories</div>
          <div className="sec-s">
            Liste fermée des catégories et sous-catégories utilisables par les règles
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
          <div className="kpi-val">{reglesRattachees}</div>
          <div className="kpi-sub">sur {(reglesQ.data || []).length} règles actives</div>
        </div>
        <div className="kpi-card kpi-poids">
          <div className="kpi-lbl">Produits catégorisés</div>
          <div className="kpi-val">{produits.filter((p) => p.categorie).length}</div>
          <div className="kpi-sub">
            {produits.filter((p) => !p.categorie).length} sans catégorie
          </div>
        </div>
      </div>

      <div className="nom-bandeau">
        Un même libellé peut exister sous deux parents différents — <b>PAPIER</b> sous
        <b> LIGNE EH1</b> et sous <b>LIGNE TBA</b> sont deux entrées distinctes, ce qui
        est correct puisqu'un produit n'appartient qu'à une seule ligne. Renommer une
        entrée met à jour les règles qui la pointent et relance le recalcul.
      </div>

      <div className="table-shell dt-glow">
        {enCours ? <LoadingOverlay /> : liste.length === 0 ? (
          <div className="nom-vide">Aucune catégorie. Créez-en une pour commencer.</div>
        ) : (
          <table className="data-table nom-table">
            <thead>
              <tr>
                <th className="nom-th">Catégorie / Sous-catégorie</th>
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
                const nbRegles = reglesDe(c);
                const nbProduits = produitsDe(c);
                return (
                  <tr key={c.id} className={c.actif === false ? 'nom-inactive' : undefined}>
                    <td className={c.profondeur === 0 ? 'nom-cell-0' : 'nom-cell-1'}>
                      <span className={c.profondeur === 0 ? 'nom-titre' : 'nom-enfant'}>
                        {c.libelle}
                      </span>
                    </td>
                    <td className="nom-num nom-faible">{c.ordre ?? '—'}</td>
                    <td className={'nom-num' + (nbRegles === 0 ? ' nom-zero' : '')}>{nbRegles}</td>
                    <td className={'nom-num' + (nbProduits === 0 ? ' nom-zero' : '')}>{nbProduits}</td>
                    <td className="nom-notes">{c.notes || '—'}</td>
                    <td>
                      <span className="nom-etat" data-v={c.actif === false ? 'inactive' : 'active'}>
                        {c.actif === false ? 'inactive' : 'active'}
                      </span>
                    </td>
                    <td className="nom-actions">
                      {c.profondeur === 0 && (
                        <button
                          className="btn btn-secondary nom-mini"
                          onClick={() => ouvrirCreation(c.id)}
                          title="Ajouter une sous-catégorie"
                        >+ sous-cat.</button>
                      )}
                      <button
                        className="btn btn-secondary nom-mini"
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
              <div className="nom-ligne">
                <div className="field nom-large">
                  <label className="field-label">Parent</label>
                  <select
                    className="field-select"
                    value={brouillon.parent_id ?? ''}
                    onChange={(e) => setBrouillon((b) => ({ ...b, parent_id: e.target.value }))}
                  >
                    <option value="">— aucun (catégorie de premier niveau) —</option>
                    {racines
                      .filter((r) => String(r.id) !== String(brouillon.id ?? ''))
                      .map((r) => <option key={r.id} value={r.id}>{r.libelle}</option>)}
                  </select>
                </div>
                <div className="field nom-petit">
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

              <div className="nom-ligne">
                <div className="field nom-large">
                  <label className="field-label">Libellé</label>
                  <input
                    className="field-input"
                    value={brouillon.libelle}
                    onChange={(e) => setBrouillon((b) => ({ ...b, libelle: e.target.value }))}
                    placeholder="ex. PAPIER"
                  />
                </div>
                <label className="nom-case">
                  <input
                    type="checkbox"
                    checked={brouillon.actif !== false}
                    onChange={(e) => setBrouillon((b) => ({ ...b, actif: e.target.checked }))}
                  />
                  Active
                </label>
              </div>

              <div className="nom-ligne">
                <div className="field nom-large">
                  <label className="field-label">Notes</label>
                  <input
                    className="field-input"
                    value={brouillon.notes ?? ''}
                    onChange={(e) => setBrouillon((b) => ({ ...b, notes: e.target.value }))}
                  />
                </div>
              </div>

              {brouillon.id && reglesParNoeud.get(String(brouillon.id)) > 0 && (
                <div className="nom-avertissement">
                  ⚠ {reglesParNoeud.get(String(brouillon.id))} règle(s) pointent cette
                  entrée. La renommer mettra à jour la référence produits.
                </div>
              )}
            </div>

            <div className="modal-footer">
              {brouillon.id && (
                <button
                  className="btn btn-secondary nom-suppr"
                  onClick={() => supprimerNoeud(brouillon.id)}
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
