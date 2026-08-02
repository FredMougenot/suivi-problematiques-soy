import { useMemo, useState, useEffect } from 'react';
import {
  CHAMPS_REGLE, OPERATEURS, SORTIES_REGLE,
  regleVierge, validerRegle, apercuRegle,
} from '../logic';
import { useCategoriesQuery, organiserCategories } from '../queries';

const LIGNES_APERCU = 8;

const memeId = (a, b) => String(a ?? '') === String(b ?? '');

/**
 * Attributs qu'une 2e condition peut arbitrer.
 * Categorie et sous-categorie en sont exclues : elles viennent desormais
 * de la nomenclature, et les arbitrer par du texte libre rouvrirait
 * exactement la porte qu'on vient de fermer.
 */
const SORTIES_AUTORISEES = SORTIES_REGLE.filter(
  (s) => s.cle === 'client' || s.cle === 'poids_unitaire',
);

/**
 * Editeur d'une regle, avec apercu calcule sur l'inventaire courant.
 * L'apercu est le point central : il montre l'effet reel de la regle
 * avant l'enregistrement, y compris les lignes qu'elle prend a une
 * autre regle.
 *
 * A l'enregistrement, base_reference_produits est recalculee en base :
 * c'est ce recalcul qui fait foi, l'apercu n'est qu'une simulation locale.
 *
 * Categorie et sous-categorie sont DEUX champs distincts, tous deux
 * toujours visibles. En base, une seule valeur est enregistree,
 * `categorie_id` : celui de la sous-categorie quand elle est choisie,
 * celui de la categorie sinon — le parent se retrouve depuis l'enfant.
 *
 * Aucun de ces champs ne porte de texte d'aide sous la liste : les blocs
 * du formulaire sont alignes par le bas, une ligne de texte sous un seul
 * champ decalerait tous les autres.
 *
 * Le TRAXcode ne figure pas ici : il appartient au referentiel produits
 * et se saisit produit par produit, depuis la page.
 */
export default function EditeurRegle({
  open, regle, regles, lignes, onFermer, onEnregistrer, onSupprimer, enCours,
}) {
  const [brouillon, setBrouillon] = useState(regleVierge);
  const categoriesQ = useCategoriesQuery();

  const noeuds = useMemo(
    () => organiserCategories(categoriesQ.data || []).filter((c) => c.actif !== false),
    [categoriesQ.data],
  );

  const racines = useMemo(() => noeuds.filter((c) => c.profondeur === 0), [noeuds]);

  useEffect(() => {
    if (open) setBrouillon(regle ? { ...regleVierge, ...regle } : regleVierge);
  }, [open, regle]);

  /**
   * La regle ne stocke qu'un id. Pour reafficher les deux listes, on
   * remonte au parent quand l'id designe une sous-categorie.
   */
  const noeudChoisi = useMemo(
    () => noeuds.find((c) => memeId(c.id, brouillon.categorie_id)) || null,
    [noeuds, brouillon.categorie_id],
  );

  const idCategorie = noeudChoisi
    ? (noeudChoisi.profondeur === 1 ? noeudChoisi.parent_id : noeudChoisi.id)
    : '';
  const idSousCategorie = noeudChoisi && noeudChoisi.profondeur === 1 ? noeudChoisi.id : '';

  const sousCategories = useMemo(
    () => (idCategorie === ''
      ? []
      : noeuds.filter((c) => c.profondeur === 1 && memeId(c.parent_id, idCategorie))),
    [noeuds, idCategorie],
  );

  const erreurs = useMemo(() => validerRegle(brouillon), [brouillon]);

  const apercu = useMemo(
    () => (open ? apercuRegle(brouillon, regles, lignes) : null),
    [open, brouillon, regles, lignes],
  );

  if (!open) return null;

  const set = (cle) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setBrouillon((b) => ({ ...b, [cle]: v }));
  };

  /**
   * Renseigne l'id ET les libelles dans le brouillon. Les libelles ne sont
   * pas envoyes en base (le trigger les derive de categorie_id), mais
   * l'apercu et la validation en ont besoin pour montrer l'effet reel.
   */
  function appliquerChoix(idCat, idSousCat) {
    const cat = racines.find((c) => memeId(c.id, idCat)) || null;
    const sc = idSousCat === '' || idSousCat === null
      ? null
      : noeuds.find((c) => memeId(c.id, idSousCat)) || null;

    const retenu = sc || cat;
    setBrouillon((b) => ({
      ...b,
      categorie_id: retenu ? Number(retenu.id) : null,
      categorie: cat ? cat.libelle : '',
      sous_categorie: sc ? sc.libelle : '',
    }));
  }

  // Changer de categorie remet la sous-categorie a zero : celle d'avant
  // appartenait a un autre parent et n'aurait plus aucun sens.
  const choisirCategorie = (e) => appliquerChoix(e.target.value, '');
  const choisirSousCategorie = (e) => appliquerChoix(idCategorie, e.target.value);

  const aideSousCategorie = idCategorie === ''
    ? 'Choisissez d\'abord une catégorie'
    : sousCategories.length === 0
      ? 'Cette catégorie n\'a pas de sous-catégorie'
      : 'Facultative';

  const aCondition2 = Boolean(brouillon.champ2 && brouillon.operateur2 && brouillon.valeur2);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}
    >
      <div className="modal-box nr-editeur">
        <div className="modal-header">
          <div className="modal-title">
            {regle ? 'Modifier la règle n°' + regle.id : 'Nouvelle règle'}
          </div>
          <div className="modal-subtitle">
            La condition 1 définit quelles lignes sont concernées. Les valeurs
            ci-dessous leur sont attribuées, puis écrites dans la référence produits.
          </div>
        </div>

        <div className="modal-body">
          <div className="nr-ed-bloc">
            <div className="nr-ed-titre">Condition — quelles lignes ?</div>
            <div className="nr-ed-ligne">
              <div className="field">
                <label className="field-label">Champ</label>
                <select className="field-select" value={brouillon.champ} onChange={set('champ')}>
                  {CHAMPS_REGLE.map((c) => (
                    <option key={c.cle} value={c.cle}>{c.libelle}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Opérateur</label>
                <select className="field-select" value={brouillon.operateur} onChange={set('operateur')}>
                  {OPERATEURS.map((o) => (
                    <option key={o.cle} value={o.cle}>{o.libelle}</option>
                  ))}
                </select>
              </div>
              <div className="field nr-ed-large">
                <label className="field-label">Valeur</label>
                <input
                  className="field-input"
                  value={brouillon.valeur || ''}
                  onChange={set('valeur')}
                  placeholder="ex. DCA"
                />
              </div>
              <div className="field nr-ed-petit">
                <label
                  className="field-label"
                  title="Plus petit = evalue en premier. Seule la priorite departage deux regles concurrentes."
                >Priorité</label>
                <input
                  className="field-input"
                  type="number"
                  min="0"
                  value={brouillon.priorite}
                  onChange={set('priorite')}
                />
              </div>
            </div>
          </div>

          <div className="nr-ed-bloc">
            <div className="nr-ed-titre">Valeurs attribuées</div>
            <div className="nr-ed-ligne">
              <div className="field">
                <label className="field-label">Catégorie</label>
                <select
                  className="field-select"
                  value={idCategorie === '' ? '' : String(idCategorie)}
                  onChange={choisirCategorie}
                  disabled={categoriesQ.isLoading}
                  title="Se gère dans l'écran Nomenclature"
                >
                  <option value="">— aucune —</option>
                  {racines.map((c) => (
                    <option key={c.id} value={c.id}>{c.libelle}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Sous-catégorie</label>
                <select
                  className="field-select"
                  value={idSousCategorie === '' ? '' : String(idSousCategorie)}
                  onChange={choisirSousCategorie}
                  disabled={categoriesQ.isLoading || sousCategories.length === 0}
                  title={aideSousCategorie}
                >
                  <option value="">— aucune —</option>
                  {sousCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.libelle}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Poids unitaire</label>
                <input
                  className="field-input"
                  type="number"
                  step="any"
                  value={brouillon.poids_unitaire ?? ''}
                  onChange={set('poids_unitaire')}
                />
              </div>
              <div className="field">
                <label className="field-label">Client</label>
                <input className="field-input" value={brouillon.client || ''} onChange={set('client')} />
              </div>
            </div>
          </div>

          <div className="nr-ed-bloc">
            <div className="nr-ed-titre">
              Condition 2 — facultative
              <span className="nr-ed-aide">
                Évaluée seulement si la condition 1 est vraie. Elle arbitre
                <strong> une seule valeur</strong> ; les autres restent celles ci-dessus.
                La catégorie n'est pas arbitrable : elle vient de la nomenclature.
              </span>
            </div>
            <div className="nr-ed-ligne">
              <div className="field">
                <label className="field-label">Champ</label>
                <select className="field-select" value={brouillon.champ2 || ''} onChange={set('champ2')}>
                  <option value="">— aucune —</option>
                  {CHAMPS_REGLE.map((c) => (
                    <option key={c.cle} value={c.cle}>{c.libelle}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Opérateur</label>
                <select className="field-select" value={brouillon.operateur2 || ''} onChange={set('operateur2')}>
                  <option value="">—</option>
                  {OPERATEURS.map((o) => (
                    <option key={o.cle} value={o.cle}>{o.libelle}</option>
                  ))}
                </select>
              </div>
              <div className="field nr-ed-large">
                <label className="field-label">Valeur</label>
                <input
                  className="field-input"
                  value={brouillon.valeur2 || ''}
                  onChange={set('valeur2')}
                  placeholder={brouillon.operateur2 === 'regex' ? 'ex. EO|PROD' : 'ex. EO'}
                />
              </div>
            </div>

            {aCondition2 && (
              <div className="nr-ed-ligne">
                <div className="field">
                  <label className="field-label">Valeur arbitrée</label>
                  <select className="field-select" value={brouillon.colonne_sortie || ''} onChange={set('colonne_sortie')}>
                    <option value="">— choisir —</option>
                    {SORTIES_AUTORISEES.map((s) => (
                      <option key={s.cle} value={s.cle}>{s.libelle}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Si vrai</label>
                  <input className="field-input" value={brouillon.valeur_si_vrai || ''} onChange={set('valeur_si_vrai')} />
                </div>
                <div className="field">
                  <label className="field-label">Si faux</label>
                  <input className="field-input" value={brouillon.valeur_si_faux || ''} onChange={set('valeur_si_faux')} />
                </div>
              </div>
            )}
          </div>

          <div className="nr-ed-bloc">
            <div className="nr-ed-ligne">
              <div className="field nr-ed-large">
                <label className="field-label">Notes</label>
                <input className="field-input" value={brouillon.notes || ''} onChange={set('notes')} />
              </div>
              <label className="nr-ed-case">
                <input type="checkbox" checked={brouillon.actif !== false} onChange={set('actif')} />
                Règle active
              </label>
            </div>
          </div>

          {erreurs.length > 0 && (
            <div className="nr-ed-erreurs">
              {erreurs.map((e) => <div key={e}>⚠ {e}</div>)}
            </div>
          )}

          {/* Apercu : l'interet principal de l'editeur */}
          <div className="nr-ed-apercu">
            <div className="nr-ed-titre">Aperçu sur l'inventaire actuel</div>
            {!apercu || erreurs.length > 0 ? (
              <div className="nr-ed-vide">Complétez la condition pour voir l'effet.</div>
            ) : apercu.touchees === 0 ? (
              <div className="nr-ed-vide">
                Cette condition ne correspond à aucune ligne de l'inventaire.
              </div>
            ) : (
              <>
                <div className="nr-ed-stats">
                  <span><b>{apercu.touchees}</b> lignes concernées</span>
                  <span><b>{apercu.produits}</b> produits</span>
                  {apercu.reprises > 0 && (
                    <span className="nr-ed-alerte">
                      dont <b>{apercu.reprises}</b> reprises à une autre règle
                    </span>
                  )}
                  {apercu.perdues > 0 && (
                    <span className="nr-ed-alerte">
                      <b>{apercu.perdues}</b> lignes ne seraient plus couvertes
                    </span>
                  )}
                </div>
                <table className="data-table nr-ed-table">
                  <thead>
                    <tr>
                      <th>N° produit</th>
                      <th>Description</th>
                      <th>Catégorie</th>
                      <th>Client</th>
                      <th style={{ textAlign: 'right' }}>Poids u.</th>
                      <th>Règle actuelle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apercu.exemples.slice(0, LIGNES_APERCU).map((e) => (
                      <tr key={e.id}>
                        <td className="nr-mono">{e.no_produit}</td>
                        <td className="nr-tronque">{e.description || '—'}</td>
                        <td>{e.categorie || '—'}</td>
                        <td>{e.client || '—'}</td>
                        <td className="nr-num">{e.poids_unitaire ?? '—'}</td>
                        <td className="nr-faible">
                          {e.regle_actuelle === null ? 'aucune'
                            : e.regle_actuelle === regle?.id ? 'celle-ci'
                              : 'n° ' + e.regle_actuelle}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {apercu.touchees > LIGNES_APERCU && (
                  <div className="nr-ed-reste">
                    et {apercu.touchees - LIGNES_APERCU} autres lignes
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {regle && (
            <button
              className="btn btn-secondary nr-ed-suppr"
              onClick={() => onSupprimer(regle.id)}
              disabled={enCours}
            >Supprimer</button>
          )}
          <button className="btn btn-secondary" onClick={onFermer} disabled={enCours}>Annuler</button>
          <button
            className="btn btn-primary"
            onClick={() => onEnregistrer(brouillon)}
            disabled={enCours || erreurs.length > 0}
          >
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
