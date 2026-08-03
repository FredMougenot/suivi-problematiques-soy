import { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AXES, COLONNES_PIVOT, agregerTexte } from '../pivot';
import { ChampTrax, BadgeCompte } from './ChampTrax';

/**
 * GrillePivot — le tableau de l'inventaire, regroupe selon des axes
 * composables.
 *
 * ══ LA BARRE D'AXES EST L'ECRAN ═══════════════════════════════
 * Tout se joue en haut : l'ordre des pastilles EST la hierarchie du tableau.
 * Retirer un axe, en deplacer un, en ajouter un — le tableau se recompose.
 * L'ancienne arborescence n'est plus qu'une configuration parmi d'autres.
 *
 * ══ VIRTUALISATION ══════════════════════════════════════════════
 * Seules les lignes visibles sont montees, encadrees par deux <tr> d'espace.
 * D'ou `table-layout: fixed` et des largeurs declarees : une largeur calculee
 * sur le contenu sauterait a chaque defilement.
 *
 * ══ UNE FEUILLE OUVRE LE TIROIR ═══════════════════════════════
 * Le dernier axe ne se deplie pas : ses lignes brutes vivent dans le tiroir
 * lateral. Avec les axes par defaut la feuille est un lot, mais c'est vrai
 * quel que soit le dernier axe choisi.
 */

const INDENT = 20;
const HAUTEUR = 34;

/** Une entree par colonne, chevron compris. null = absorbe le reste. */
const LARGEURS = [28, null, 110, 210, 76, 66, 105, 112, 102, 102, 92, 108];

const nb = (v) => (typeof v === 'number' ? v.toLocaleString('fr-CA') : v);

function aplatir(noeuds, deplies, sortie = []) {
  for (const n of noeuds) {
    sortie.push(n);
    if (!n.enfants.length || !deplies.has(n.cle)) continue;
    aplatir(n.enfants, deplies, sortie);
  }
  return sortie;
}

/** Barre des axes : l'ordre des pastilles est la hierarchie. */
function BarreAxes({ axes, onAxes }) {
  const dispo = Object.keys(AXES).filter((a) => !axes.includes(a));

  const retirer = (i) => onAxes(axes.filter((_, k) => k !== i));
  const deplacer = (i, d) => {
    const suivant = [...axes];
    const j = i + d;
    if (j < 0 || j >= suivant.length) return;
    [suivant[i], suivant[j]] = [suivant[j], suivant[i]];
    onAxes(suivant);
  };

  return (
    <div className="nr-axes">
      <span className="nr-faible">Regrouper par :</span>

      {axes.map((a, i) => (
        <span key={a} className="nr-axe">
          <button
            className="nr-axe-fl"
            onClick={() => deplacer(i, -1)}
            disabled={i === 0}
            aria-label={'Déplacer ' + AXES[a].libelle + ' vers la gauche'}
          >‹</button>
          <span className="nr-axe-l">{AXES[a].libelle}</span>
          <button
            className="nr-axe-fl"
            onClick={() => deplacer(i, 1)}
            disabled={i === axes.length - 1}
            aria-label={'Déplacer ' + AXES[a].libelle + ' vers la droite'}
          >›</button>
          <button
            className="nr-axe-x"
            onClick={() => retirer(i)}
            aria-label={'Retirer ' + AXES[a].libelle}
          >✕</button>
        </span>
      ))}

      {axes.length === 0 && <span className="nr-faible">aucun axe — liste à plat</span>}

      {dispo.length > 0 && (
        <select
          className="fsel nr-axe-ajout"
          value=""
          onChange={(e) => { if (e.target.value) onAxes([...axes, e.target.value]); }}
        >
          <option value="">+ Ajouter un axe</option>
          {dispo.map((a) => <option key={a} value={a}>{AXES[a].libelle}</option>)}
        </select>
      )}
    </div>
  );
}

export default function GrillePivot({
  pivot, axes, deplies, tri, scrollRef, cleOuverte = '',
  onAxes, onTrier, onBasculer, onOuvrir, onTrax,
}) {
  const lignes = useMemo(() => aplatir(pivot, deplies), [pivot, deplies]);

  const virtuel = useVirtualizer({
    count: lignes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => HAUTEUR,
    overscan: 14,
  });

  const visibles = virtuel.getVirtualItems();
  const avant = visibles.length ? visibles[0].start : 0;
  const apres = visibles.length
    ? virtuel.getTotalSize() - visibles[visibles.length - 1].end : 0;
  const NB_COL = COLONNES_PIVOT.length + 1;

  return (
    <>
      <BarreAxes axes={axes} onAxes={onAxes} />

      <table className="data-table nr-large nr-arbre-table">
        <colgroup>
          {LARGEURS.map((l, i) => (
            <col key={i} style={l === null ? undefined : { width: l }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: 28 }} aria-label="Déplier" />
            {COLONNES_PIVOT.map((c) => (
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
            const feuille = !n.enfants.length;
            const ouvert = deplies.has(n.cle);
            const partiel = n.nb_poids_connus > 0 && n.nb_poids_connus < n.nb_lignes;
            // Le TRAXcode ne se saisit que si le groupe designe UN produit et
            // un seul : sur un groupe melange, on ne saurait pas quoi ecrire.
            const unProduit = n.produits.size === 1;
            const compte = agregerTexte(n, 'client_regle');

            return (
              <tr
                key={n.cle}
                ref={virtuel.measureElement}
                data-index={v.index}
                className={'nr-ligne-groupe' + (feuille ? ' nr-lot-feuille' : '')}
                data-niv={n.niv}
                data-produit={n.axe === 'produit' ? '1' : undefined}
                data-exp={n.niveau || undefined}
                aria-selected={feuille && n.cle === cleOuverte ? true : undefined}
                onClick={() => (feuille ? onOuvrir(n) : onBasculer(n.cle))}
              >
                <td className="nr-chevron">{feuille ? '›' : ouvert ? '▾' : '▸'}</td>

                <td className="nr-arbre-cell" style={{ paddingLeft: 8 + n.niv * INDENT }}>
                  <BadgeCompte compte={compte.multiple ? null : compte.texte} />
                  <span className={n.axe === 'produit' || n.axe === 'lot'
                    ? 'nr-mono' : 'nr-arbre-titre'}>
                    {n.libelle}
                  </span>
                  {feuille && n.nb_lignes > 1 && (
                    <span className="nr-faible">{' · ' + n.nb_lignes + ' lignes'}</span>
                  )}
                </td>

                <td>
                  {unProduit
                    ? (
                      <ChampTrax
                        code={[...n.produits][0]}
                        valeur={agregerTexte(n, 'trax_code').texte || null}
                        onEnregistrer={onTrax}
                      />
                    )
                    : ''}
                </td>

                {COLONNES_PIVOT.slice(2).map((c) => {
                  if (c.texte) {
                    const a = agregerTexte(n, c.texte, c.pluriel);
                    return (
                      <td
                        key={c.cle}
                        className={c.cle === 'description'
                          ? 'nr-desc'
                          : c.cle === 'date_expiration'
                            ? 'nr-mono nr-jours'
                            : 'nr-mono nr-faible'}
                        data-multiple={a.multiple ? '1' : undefined}
                        data-n={c.cle === 'date_expiration' ? (n.niveau || undefined) : undefined}
                        title={a.titre}
                      >
                        {a.texte || '—'}
                      </td>
                    );
                  }

                  if (c.cle === 'poids') {
                    return (
                      <td
                        key={c.cle}
                        className="nr-num"
                        data-partiel={partiel ? '1' : undefined}
                        title={partiel
                          ? 'Poids connu sur ' + n.nb_poids_connus + ' ligne(s) sur ' + n.nb_lignes
                          : undefined}
                      >
                        {n.poids === null ? '—' : nb(n.poids)}
                        {partiel && (
                          <span className="nr-partiel">
                            {' (' + Math.round(n.nb_poids_connus / n.nb_lignes * 100) + ' %)'}
                          </span>
                        )}
                      </td>
                    );
                  }

                  if (c.cle === 'jours_min') {
                    return (
                      <td key={c.cle} className="nr-num nr-jours" data-n={n.niveau || undefined}>
                        {n.jours_min === null ? '—' : nb(n.jours_min)}
                      </td>
                    );
                  }

                  return <td key={c.cle} className="nr-num">{nb(n[c.cle])}</td>;
                })}
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
    </>
  );
}
