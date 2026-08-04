import { useEffect, useState } from 'react';
import { ChampTrax } from './ChampTrax';

/**
 * TiroirLot — le detail d'une FEUILLE de la grille, ouvert par-dessus le
 * tableau, et le point de SAISIE du stock usine.
 *
 * ══ POURQUOI LA SAISIE EST ICI ═══════════════════════════════
 * On est deja sur le produit : son numero est connu, son referentiel aussi.
 * Un ecran de saisie separe obligerait a le rechercher une seconde fois, et
 * a risquer une faute de frappe sur le code.
 *
 * Le formulaire n'apparait que si le groupe designe UN produit : sur un
 * groupe melange, on ne saurait pas a quel produit rattacher la ligne.
 *
 * ══ L'ETAT VIT DANS L'URL ═══════════════════════════════════════
 * Le groupe ouvert est un parametre (`grp=<chemin>`) : « Copier le lien »
 * doit reproduire ce qu'on voit, tiroir compris. Seul le formulaire garde un
 * etat local — une saisie en cours n'a rien a faire dans une adresse.
 *
 * Le `position: fixed` fonctionne parce qu'aucun ancetre de la surface ne
 * porte de `transform` — regle posee sur le hub, a ne pas casser.
 */

const VIDE = {
  no_lot: '', no_sous_lot: '', qte: '', etiquette: '',
  no_comm_client: '', date_lot: '', date_expiration: '', note: '',
};

function FormulaireUsine({ noProduit, ajouter }) {
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState(VIDE);
  const [erreur, setErreur] = useState(null);

  const champ = (cle) => ({
    value: f[cle],
    onChange: (e) => setF((p) => ({ ...p, [cle]: e.target.value })),
  });

  const envoyer = async () => {
    setErreur(null);
    try {
      await ajouter.mutateAsync({ ...f, no_produit: noProduit });
      setF(VIDE);
      setOuvert(false);
    } catch (e) {
      setErreur(e.message || 'Enregistrement impossible.');
    }
  };

  if (!ouvert) {
    return (
      <button className="btn btn-secondary nr-usine-ouvrir" onClick={() => setOuvert(true)}>
        + Ajouter un item usine
      </button>
    );
  }

  return (
    <section className="nr-usine-form">
      <div className="nr-tiroir-lbl">Nouvel item — emplacement Usine</div>

      <div className="nr-usine-grille">
        <label>
          <span>N° lot</span>
          <input type="text" {...champ('no_lot')} />
        </label>
        <label>
          <span>N° sous-lot</span>
          <input type="text" {...champ('no_sous_lot')} />
        </label>
        <label>
          <span>Quantité</span>
          <input type="number" step="any" {...champ('qte')} />
        </label>
        <label>
          <span>Étiquette</span>
          <input type="text" {...champ('etiquette')} />
        </label>
        <label>
          <span>Date lot</span>
          <input type="date" {...champ('date_lot')} />
        </label>
        <label>
          <span>Best before</span>
          <input type="date" {...champ('date_expiration')} />
        </label>
        <label>
          <span>PO client</span>
          <input type="text" {...champ('no_comm_client')} />
        </label>
        <label className="nr-usine-large">
          <span>Note</span>
          <input type="text" {...champ('note')} />
        </label>
      </div>

      {erreur && <div className="nr-usine-erreur">{erreur}</div>}

      <div className="nr-usine-actions">
        <button
          className="btn btn-primary"
          onClick={envoyer}
          disabled={ajouter.isPending}
        >
          {ajouter.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => { setF(VIDE); setErreur(null); setOuvert(false); }}
        >
          Annuler
        </button>
      </div>
    </section>
  );
}

export default function TiroirLot({
  detail, onFermer, onEnregistrerTrax, ajouterUsine, supprimerUsine,
}) {
  useEffect(() => {
    if (!detail) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, onFermer]);

  if (!detail) return null;

  const { titre, chemin, lignes, produit } = detail;

  // Tri par urgence : le premier est celui a sortir.
  const tries = [...lignes].sort((a, b) => {
    const A = a.jours_expiration;
    const B = b.jours_expiration;
    if (A === null && B === null) return 0;
    if (A === null) return 1;
    if (B === null) return -1;
    return A - B;
  });

  const qte = tries.reduce((s, l) => s + (Number(l.unite2_qte_inv) || 0), 0);
  const avecPoids = tries.filter((l) => l.poids_total !== null && l.poids_total !== undefined);
  const poids = avecPoids.reduce((s, l) => s + l.poids_total, 0);

  const nb = (v) => (typeof v === 'number' ? v.toLocaleString('fr-CA') : v);

  return (
    <>
      <div className="nr-tiroir-voile" onClick={onFermer} aria-hidden="true" />
      <aside className="nr-tiroir" role="dialog" aria-label={'Détail ' + titre}>
        <header className="nr-tiroir-tete">
          <div>
            <div className="nr-tiroir-sur">{chemin.slice(0, -1).join(' › ') || 'Détail'}</div>
            <div className="nr-tiroir-titre nr-mono">{titre}</div>
          </div>
          <button className="btn btn-secondary" onClick={onFermer} aria-label="Fermer">✕</button>
        </header>

        <div className="nr-tiroir-corps">
          {produit && (
            <>
              <section className="nr-tiroir-bloc">
                <div className="nr-tiroir-lbl">Produit</div>
                <div className="nr-mono nr-tiroir-val">{produit.no_produit}</div>
                <div className="nr-faible">{produit.description || '—'}</div>
              </section>

              <section className="nr-tiroir-grille">
                <div>
                  <div className="nr-tiroir-lbl">Compte</div>
                  <div>{produit.client || '—'}</div>
                </div>
                <div>
                  <div className="nr-tiroir-lbl">Client</div>
                  <div>{produit.client_regle || '—'}</div>
                </div>
                <div>
                  <div className="nr-tiroir-lbl">Catégorie</div>
                  <div>{produit.categorie || '—'}</div>
                </div>
                <div>
                  <div className="nr-tiroir-lbl">Sous-catégorie</div>
                  <div>{produit.sous_categorie || '—'}</div>
                </div>
                <div>
                  <div className="nr-tiroir-lbl">Poids unitaire</div>
                  <div>{produit.poids_unitaire ?? '—'}</div>
                </div>
                <div>
                  <div className="nr-tiroir-lbl">TRAXcode</div>
                  <ChampTrax
                    code={produit.no_produit}
                    valeur={produit.trax_code}
                    onEnregistrer={onEnregistrerTrax}
                  />
                </div>
              </section>

              {ajouterUsine && (
                <FormulaireUsine noProduit={produit.no_produit} ajouter={ajouterUsine} />
              )}
            </>
          )}

          <section className="nr-tiroir-totaux">
            <span><b>{tries.length}</b> ligne(s)</span>
            <span><b>{nb(Math.round(qte * 100) / 100)}</b> qté</span>
            <span>
              <b>{avecPoids.length ? nb(Math.round(poids * 100) / 100) : '—'}</b> poids
              {avecPoids.length > 0 && avecPoids.length < tries.length
                && ' (sur ' + avecPoids.length + '/' + tries.length + ')'}
            </span>
          </section>

          {/* Sans agregation : c'est le seul endroit ou une valeur multiple
              se lit en detail, ligne par ligne. */}
          <table className="data-table nr-sous-table">
            <thead>
              <tr>
                <th>Emplacement</th>
                {!produit && <th>Produit</th>}
                <th>Lot</th>
                <th>Sous-lot</th>
                <th style={{ textAlign: 'right' }}>Qté</th>
                <th style={{ textAlign: 'right' }}>Poids</th>
                <th>Date lot</th>
                <th>Best before</th>
                <th style={{ textAlign: 'right' }}>Jours</th>
                <th>PO client</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {tries.map((l) => {
                const estUsine = String(l.id || '').startsWith('us-');
                return (
                  <tr key={l.id} data-exp={l.niveau_expiration || undefined}>
                    <td>
                      <span className="nr-empl" data-usine={estUsine ? '1' : undefined}>
                        {l.emplacement || '—'}
                      </span>
                    </td>
                    {!produit && <td className="nr-mono">{l.no_produit || '—'}</td>}
                    <td className="nr-mono">{l.no_lot || '—'}</td>
                    <td className="nr-mono">{l.no_sous_lot || '—'}</td>
                    <td className="nr-num">{l.unite2_qte_inv || '—'}</td>
                    <td className="nr-num">{l.poids_total === null ? '—' : nb(l.poids_total)}</td>
                    <td className="nr-mono nr-faible">{l.date_lot || '—'}</td>
                    <td className="nr-mono nr-jours" data-n={l.niveau_expiration || undefined}>
                      {l.date_expiration || '—'}
                    </td>
                    <td className="nr-num nr-jours" data-n={l.niveau_expiration || undefined}>
                      {l.jours_expiration === null ? '—' : nb(l.jours_expiration)}
                    </td>
                    <td className="nr-mono nr-faible">{l.no_comm_client || '—'}</td>
                    <td>
                      {/* Seules les lignes usine sont supprimables : celles de
                          l'entreposeur sont reecrites au prochain releve, les
                          effacer ne servirait a rien. */}
                      {estUsine && supprimerUsine && (
                        <button
                          className="nr-usine-suppr"
                          aria-label="Supprimer cette ligne usine"
                          disabled={supprimerUsine.isPending}
                          onClick={() => supprimerUsine.mutate(l.id)}
                        >✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </aside>
    </>
  );
}
