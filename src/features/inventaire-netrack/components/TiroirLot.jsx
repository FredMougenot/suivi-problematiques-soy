import { useEffect } from 'react';
import { ChampTrax } from './ChampTrax';

/**
 * TiroirLot — le detail d'un lot, ouvert par-dessus le tableau.
 *
 * ══ POURQUOI UN TIROIR PLUTOT QU'UN DEPLIAGE ════════════════════
 * Le tiroir peut porter ce qui n'a pas sa place dans une ligne de tableau :
 * les attributs du produit et la saisie du TRAXcode, qui n'avaient jusqu'ici
 * aucun endroit naturel. Contrepartie assumee : un seul lot a la fois.
 *
 * ══ L'ETAT VIT DANS L'URL ═══════════════════════════════════════
 * Le lot ouvert est un parametre (`lot=<produit>~<lot>`), comme tout le
 * reste de l'ecran : « Copier le lien » doit reproduire ce qu'on voit, y
 * compris le tiroir. Le composant ne garde donc aucun etat propre.
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

  const { no_produit, no_lot, lignes, produit } = detail;

  // Les sous-lots restent tries par urgence : le premier est celui a sortir.
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
      <aside className="nr-tiroir" role="dialog" aria-label={'Lot ' + no_lot}>
        <header className="nr-tiroir-tete">
          <div>
            <div className="nr-tiroir-sur">Lot</div>
            <div className="nr-tiroir-titre nr-mono">{no_lot || '(sans n° lot)'}</div>
          </div>
          <button className="btn btn-secondary" onClick={onFermer} aria-label="Fermer">✕</button>
        </header>

        <div className="nr-tiroir-corps">
          <section className="nr-tiroir-bloc">
            <div className="nr-tiroir-lbl">Produit</div>
            <div className="nr-mono nr-tiroir-val">{no_produit}</div>
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
                code={no_produit}
                valeur={produit.trax_code}
                onEnregistrer={onEnregistrerTrax}
              />
            </div>
          </section>

          <section className="nr-tiroir-totaux">
            <span><b>{tries.length}</b> sous-lot(s)</span>
            <span><b>{nb(Math.round(qte * 100) / 100)}</b> qté</span>
            <span>
              <b>{avecPoids.length ? nb(Math.round(poids * 100) / 100) : '—'}</b> poids
              {avecPoids.length > 0 && avecPoids.length < tries.length
                && ' (sur ' + avecPoids.length + '/' + tries.length + ')'}
            </span>
          </section>

          <table className="data-table nr-sous-table">
            <thead>
              <tr>
                <th>Sous-lot</th>
                <th>Étiquette</th>
                <th>N° comm.</th>
                <th style={{ textAlign: 'right' }}>Qté</th>
                <th style={{ textAlign: 'right' }}>Poids</th>
                <th>Expiration</th>
                <th style={{ textAlign: 'right' }}>Jours</th>
              </tr>
            </thead>
            <tbody>
              {tries.map((l) => (
                <tr key={l.id} data-exp={l.niveau_expiration || undefined}>
                  <td className="nr-mono">{l.no_sous_lot || '—'}</td>
                  <td className="nr-mono">{l.etiquette || '—'}</td>
                  <td className="nr-mono">{l.no_comm_client || '—'}</td>
                  <td className="nr-num">{l.unite2_qte_inv || '—'}</td>
                  <td className="nr-num">{l.poids_total === null ? '—' : nb(l.poids_total)}</td>
                  <td className="nr-mono nr-jours" data-n={l.niveau_expiration || undefined}>
                    {l.date_expiration || '—'}
                  </td>
                  <td className="nr-num nr-jours" data-n={l.niveau_expiration || undefined}>
                    {l.jours_expiration === null ? '—' : nb(l.jours_expiration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>
    </>
  );
}
