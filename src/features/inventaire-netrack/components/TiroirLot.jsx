import { useEffect } from 'react';
import { ChampTrax } from './ChampTrax';

/**
 * TiroirLot — le detail d'une FEUILLE de la grille, ouvert par-dessus le
 * tableau.
 *
 * Avec les axes par defaut la feuille est un lot et le tiroir montre ses
 * sous-lots, mais le composant ne suppose rien : il affiche les lignes
 * brutes du groupe, quel que soit le dernier axe choisi. Les attributs du
 * produit ne s'affichent que si le groupe designe UN produit — sinon ils
 * n'auraient pas de valeur unique.
 *
 * ══ L'ETAT VIT DANS L'URL ═══════════════════════════════════════
 * Le groupe ouvert est un parametre (`grp=<chemin>`) : « Copier le lien »
 * doit reproduire ce qu'on voit, tiroir compris. Aucun etat propre ici.
 *
 * Le `position: fixed` fonctionne parce qu'aucun ancetre de la surface ne
 * porte de `transform` — regle posee sur le hub, a ne pas casser.
 */
export default function TiroirLot({ detail, onFermer, onEnregistrerTrax }) {
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
                {!produit && <th>Produit</th>}
                <th>Lot</th>
                <th>Sous-lot</th>
                <th style={{ textAlign: 'right' }}>Qté</th>
                <th style={{ textAlign: 'right' }}>Poids</th>
                <th>Date lot</th>
                <th>Best before</th>
                <th style={{ textAlign: 'right' }}>Jours</th>
                <th>PO client</th>
              </tr>
            </thead>
            <tbody>
              {tries.map((l) => (
                <tr key={l.id} data-exp={l.niveau_expiration || undefined}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>
    </>
  );
}
