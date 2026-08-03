import { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { COLONNES_ARBRE } from '../arbre';
import { ChampTrax, BadgeCompte } from './ChampTrax';

/**
 * ArbreNetrack — l'arborescence Categorie → Sous-categorie → Produit → Lot.
 *
 * ══ LE LOT EST UNE FEUILLE ═══════════════════════════════════════
 * Un clic sur un lot ouvre le tiroir lateral au lieu de deplier ses
 * sous-lots. 624 lots tiennent dans un tableau, 5 658 sous-lots non — et
 * chez PBC une vingtaine de sous-lots par lot ne different souvent que par
 * leur numero.
 *
 * ══ VIRTUALISATION ══════════════════════════════════════════════
 * Seules les lignes visibles sont montees, encadrees par deux <tr> d'espace
 * qui reproduisent la hauteur du reste. Consequence OBLIGATOIRE :
 * `table-layout: fixed` et des largeurs declarees ci-dessous. Une largeur
 * calculee sur le contenu sauterait a chaque defilement, puisque le contenu
 * mesure change en permanence.
 *
 * L'element qui defile est la coquille de la page (`scrollRef`) : l'en-tete
 * colle a son sommet et reste lisible sur toute la hauteur.
 */

const INDENT = 22;

/** Hauteur presumee d'une ligne, affinee par mesure reelle des le 1er rendu. */
const HAUTEUR = 34;

/** Une entree par colonne, chevron compris. null = absorbe le reste. */
const LARGEURS = [28, null, 110, 220, 78, 66, 105, 115, 105, 105, 95, 110];

const nb = (v) => (typeof v === 'number' ? v.toLocaleString('fr-CA') : v);

/**
 * Aplatit l'arbre, en ne descendant que dans les branches ouvertes. Un
 * tableau plat se rend bien plus vite qu'un imbriquement de <table>, et le
 * decalage visuel suffit a montrer le niveau.
 */
function aplatir(noeuds, deplies, sortie = []) {
  for (const n of noeuds) {
    sortie.push(n);
    if (n.est_lot || !deplies.has(n.cle)) continue;
    aplatir(n.enfants, deplies, sortie);
  }
  return sortie;
}

/**
 * Valeur d'un champ de sous-lot lue au niveau du lot. Une seule valeur
 * distincte : on l'affiche. Plusieurs : on affiche leur NOMBRE, jamais la
 * premiere — 158 lots sur 668 portent plusieurs PO client, en montrer un
 * seul serait faux une fois sur quatre. Le detail est dans le tiroir.
 */
function valeurLot(n, cle, pluriel) {
  const s = n.valeurs && n.valeurs[cle];
  if (!s || s.size === 0) return { texte: '—', multiple: false, titre: undefined };
  if (s.size === 1) return { texte: [...s][0], multiple: false, titre: undefined };
  return { texte: s.size + ' ' + pluriel, multiple: true, titre: [...s].join(' · ') };
}

function CelluleLot({ n, cle, pluriel, classe }) {
  const { texte, multiple, titre } = valeurLot(n, cle, pluriel);
  return (
    <td className={classe} data-multiple={multiple ? '1' : undefined} title={titre}>
      {texte}
    </td>
  );
}

export default function ArbreNetrack({
  arbre, deplies, tri, scrollRef, lotOuvert = '',
  onTrier, onBasculer, onOuvrirLot, onTrax,
}) {
  const lignes = useMemo(() => aplatir(arbre, deplies), [arbre, deplies]);

  const virtuel = useVirtualizer({
    count: lignes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => HAUTEUR,
    overscan: 14,
  });

  const visibles = virtuel.getVirtualItems();
  const avant = visibles.length ? visibles[0].start : 0;
  const apres = visibles.length
    ? virtuel.getTotalSize() - visibles[visibles.length - 1].end
    : 0;
  const NB_COL = COLONNES_ARBRE.length + 1;

  return (
    <table className="data-table nr-large nr-arbre-table">
      <colgroup>
        {LARGEURS.map((l, i) => (
          <col key={i} style={l === null ? undefined : { width: l }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th style={{ width: 28 }} aria-label="Déplier" />
          {COLONNES_ARBRE.map((c) => (
            <th
              key={c.cle}
              className="nr-th"
              style={{ textAlign: c.num ? 'right' : 'left' }}
              onClick={() => onTrier(c.cle)}
            >
              {c.libelle}
              {tri.colonne === c.cle && (
                <span className="nr-fleche">{tri.sens === 1 ? '▲' : '▼'}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {avant > 0 && (
          <tr aria-hidden="true" className="nr-espace">
            <td colSpan={NB_COL} style={{ height: avant, padding: 0, border: 0 }} />
          </tr>
        )}

        {visibles.map((v) => {
          const n = lignes[v.index];
          const ouvert = deplies.has(n.cle);
          // Un produit se reconnait a son drapeau, pas a sa profondeur :
          // sans sous-categorie il remonte d'un niveau.
          const estProduit = n.est_produit;
          const estLot = n.est_lot;
          const partiel = n.nb_poids_connus > 0 && n.nb_poids_connus < n.nb_lots;

          return (
            <tr
              key={n.cle}
              ref={virtuel.measureElement}
              data-index={v.index}
              className={'nr-ligne-groupe' + (estLot ? ' nr-lot-feuille' : '')}
              data-niv={n.niv ?? n.profondeur}
              data-produit={estProduit ? '1' : undefined}
              data-exp={n.niveau || undefined}
              aria-selected={estLot && n.no_produit + '~' + n.no_lot === lotOuvert
                ? true : undefined}
              onClick={() => (estLot ? onOuvrirLot(n) : onBasculer(n.cle))}
            >
              <td className="nr-chevron">{estLot ? '›' : ouvert ? '▾' : '▸'}</td>

              <td
                className="nr-arbre-cell"
                style={{ paddingLeft: 8 + (n.niv ?? n.profondeur) * INDENT }}
              >
                <BadgeCompte compte={n.comptes && n.comptes.size === 1 ? [...n.comptes][0] : null} />
                <span className={estProduit || estLot ? 'nr-mono' : 'nr-arbre-titre'}>
                  {n.libelle}
                </span>
                {/* Le nombre de sous-lots vit dans la colonne du libelle : il
                    decrit le lot lui-meme, il n'a pas a squatter une autre
                    colonne dont ce n'est pas le sens. */}
                {estLot && (
                  <span className="nr-faible">
                    {' · ' + n.nb_lots + (n.nb_lots > 1 ? ' sous-lots' : ' sous-lot')}
                  </span>
                )}
              </td>

              <td>
                {estProduit ? (
                  <ChampTrax code={n.no_produit} valeur={n.trax_code} onEnregistrer={onTrax} />
                ) : ''}
              </td>

              <td className={'nr-desc' + (estProduit ? '' : ' nr-faible')}>
                {estProduit ? (n.description || '—') : ''}
              </td>

              <td className="nr-num">{estProduit || estLot ? '' : nb(n.nb_produits)}</td>
              <td className="nr-num">{estLot ? '' : nb(n.nb_lots)}</td>
              <td className="nr-num">{nb(n.qte)}</td>

              <td
                className="nr-num"
                data-partiel={partiel ? '1' : undefined}
                title={partiel
                  ? 'Poids connu sur ' + n.nb_poids_connus + ' lot(s) sur ' + n.nb_lots
                  : undefined}
              >
                {n.poids === null || n.nb_poids_connus === 0 ? '—' : nb(n.poids)}
                {partiel && (
                  <span className="nr-partiel"> ({Math.round(n.nb_poids_connus / n.nb_lots * 100)} %)</span>
                )}
              </td>

              {/* Date lot, Best before et PO client appartiennent au sous-lot.
                  Le LOT les agrege : valeur unique si ses sous-lots
                  concordent, comptage sinon. Un agregat superieur n'a pas de
                  date propre — son echeance se lit dans « Jours rest. ». */}
              {estLot ? (
                <>
                  <CelluleLot n={n} cle="date_lot" pluriel="dates" classe="nr-mono nr-faible" />
                  <CelluleLot
                    n={n}
                    cle="date_expiration"
                    pluriel="dates"
                    classe="nr-mono nr-jours"
                  />
                </>
              ) : (
                <>
                  <td />
                  <td />
                </>
              )}

              <td className="nr-num nr-jours" data-n={n.niveau || undefined}>
                {n.jours_min === null ? '—' : nb(n.jours_min)}
              </td>

              {estLot
                ? <CelluleLot n={n} cle="no_comm_client" pluriel="PO" classe="nr-mono nr-faible" />
                : <td />}
            </tr>
          );
        })}

        {apres > 0 && (
          <tr aria-hidden="true" className="nr-espace">
            <td colSpan={NB_COL} style={{ height: apres, padding: 0, border: 0 }} />
          </tr>
        )}
      </tbody>
    </table>
  );
}
