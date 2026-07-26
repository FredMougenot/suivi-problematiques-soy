import { useMemo, useState, useEffect } from 'react';
import {
  CHAMPS_REGLE, OPERATEURS, SORTIES_REGLE,
  regleVierge, validerRegle, apercuRegle, nombre,
} from '../logic';

const LIGNES_APERCU = 8;

/**
 * Editeur d'une regle, avec apercu calcule sur l'inventaire courant.
 * L'apercu est le point central : il montre l'effet reel de la regle
 * avant l'enregistrement, y compris les lignes qu'elle prend a une
 * autre regle.
 */
export default function EditeurRegle({
  open, regle, regles, lignes, onFermer, onEnregistrer, onSupprimer, enCours,
}) {
  const [brouillon, setBrouillon] = useState(regleVierge);

  useEffect(() => {
    if (open) setBrouillon(regle ? { ...regleVierge, ...regle } : regleVierge);
  }, [open, regle]);

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
            ci-dessous leur sont attribuées.
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
                <label className="field-label" title="Plus petit = evalue en premier">Priorité</label>
                <input
                  className="field-input"
                  type="number"
                  min="1"
                  value={brouillon.priorite}
                  onChange={set('priorite')}
                />
              </div>
            </div>
          </div>

          <div className="nr-ed-bloc">
            <div className="nr-ed-titre">Valeurs attribuées</div>
            <div className="nr-ed-grille">
              <div className="field">
                <label className="field-label">Catégorie</label>
                <input className="field-input" value={brouillon.categorie || ''} onChange={set('categorie')} />
              </div>
              <div className="field">
                <label className="field-label">Sous-catégorie</label>
                <input className="field-input" value={brouillon.sous_categorie || ''} onChange={set('sous_categorie')} />
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
              <div className="field">
                <label className="field-label">TRAXcode</label>
                <input className="field-input" value={brouillon.trax_code || ''} onChange={set('trax_code')} />
              </div>
            </div>
          </div>

          <div className="nr-ed-bloc">
            <div className="nr-ed-titre">
              Condition 2 — facultative
              <span className="nr-ed-aide">
                Évaluée seulement si la condition 1 est vraie. Elle arbitre
                <strong> une seule valeur</strong> ; les autres restent celles ci-dessus.
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
                    {SORTIES_REGLE.map((s) => (
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
