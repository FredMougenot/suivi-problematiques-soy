import { useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AXES, COLONNES_PIVOT, agregerTexte } from '../pivot';
import { ChampTrax, BadgeCompte } from './ChampTrax';

/**
 * GrillePivot — le tableau de l'inventaire, regroupe selon des axes
 * composables.
 *
 * ══ LA BARRE D'AXES EST L'ECRAN ═══════════════════════════════
 * L'ordre des pastilles EST la hierarchie du tableau. On les GLISSE : depuis
 * la reserve vers la barre pour ajouter, dans la barre pour reordonner, de la
 * barre vers la reserve pour retirer. Un trait vertical montre ou la pastille
 * va tomber. Le clic reste possible en secours (ajout en fin, ✕ pour retirer)
 * — le glisser seul exclurait le clavier et le tactile approximatif.
 *
 * ══ AUCUN AXE = TABLEAU VIDE ═════════════════════════════════
 * Une barre vide n'affiche rien : c'est un etat legitime, pas une erreur a
 * rattraper en remettant des axes d'office. Les axes inconnus — dont le jeton
 * '-' qui encode le vide dans l'URL — sont ignores ici.
 *
 * ══ VIRTUALISATION ══════════════════════════════════════════════
 * Seules les lignes visibles sont montees, encadrees par deux <tr> d'espace.
 * D'ou `table-layout: fixed` : une largeur calculee sur le contenu sauterait
 * a chaque defilement.
 */

const INDENT = 20;
const HAUTEUR = 34;

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

function BarreAxes({ axes, onAxes }) {
  // { type: 'axe', i } quand on deplace une pastille deja posee,
  // { type: 'champ', nom } quand elle vient de la reserve.
  const [glisse, setGlisse] = useState(null);
  const [cible, setCible] = useState(null);

  const dispo = Object.keys(AXES).filter((a) => !axes.includes(a));

  const finir = () => { setGlisse(null); setCible(null); };

  const deposer = () => {
    if (!glisse) { finir(); return; }
    const suivant = [...axes];
    let idx = cible === null ? suivant.length : cible;

    if (glisse.type === 'axe') {
      const nom = axes[glisse.i];
      suivant.splice(glisse.i, 1);
      // Retirer l'element decale toutes les positions situees apres lui.
      if (idx > glisse.i) idx -= 1;
      suivant.splice(idx, 0, nom);
    } else if (!suivant.includes(glisse.nom)) {
      suivant.splice(idx, 0, glisse.nom);
    }

    finir();
    onAxes(suivant);
  };

  const survol = (e, i) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setCible(e.clientX < r.left + r.width / 2 ? i : i + 1);
  };

  const marque = (i) => (cible === i && glisse ? <span className="nr-axe-marque" /> : null);

  return (
    <div className="nr-axes">
      <div
        className="nr-axes-zone"
        onDragOver={(e) => { e.preventDefault(); if (cible === null) setCible(axes.length); }}
        onDrop={deposer}
      >
        <span className="nr-faible">Regrouper par :</span>

        {axes.map((a, i) => (
          <span key={a} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {marque(i)}
            <span
              className="nr-axe"
              draggable
              aria-grabbed={glisse && glisse.type === 'axe' && glisse.i === i ? true : undefined}
              onDragStart={() => setGlisse({ type: 'axe', i })}
              onDragEnd={finir}
              onDragOver={(e) => survol(e, i)}
            >
              <span className="nr-axe-poignee" aria-hidden="true">∷</span>
              <span className="nr-axe-l">{AXES[a].libelle}</span>
              <button
                className="nr-axe-x"
                onClick={() => onAxes(axes.filter((_, k) => k !== i))}
                aria-label={'Retirer ' + AXES[a].libelle}
              >✕</button>
            </span>
          </span>
        ))}

        {marque(axes.length)}

        {axes.length === 0 && (
          <span className="nr-faible">glisse un champ ici — sans axe, rien à afficher</span>
        )}
      </div>

      {dispo.length > 0 && (
        <div
          className="nr-axes-reserve"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            // Ramener une pastille dans la reserve, c'est la retirer.
            if (glisse && glisse.type === 'axe') {
              const suivant = axes.filter((_, k) => k !== glisse.i);
              finir();
              onAxes(suivant);
            } else finir();
          }}
        >
          <span className="nr-faible">Champs :</span>
          {dispo.map((a) => (
            <span
              key={a}
              className="nr-champ"
              draggable
              title="Glisse-le dans la barre, ou clique pour l'ajouter à la fin"
              onDragStart={() => setGlisse({ type: 'champ', nom: a })}
              onDragEnd={finir}
              onClick={() => onAxes([...axes, a])}
            >
              {AXES[a].libelle}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GrillePivot({
  pivot, axes, deplies, tri, scrollRef, cleOuverte = '',
  onAxes, onTrier, onBasculer, onOuvrir, onTrax,
}) {
  const axesValides = useMemo(() => (axes || []).filter((a) => AXES[a]), [axes]);

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
      <BarreAxes axes={axesValides} onAxes={onAxes} />

      {axesValides.length === 0 ? null : (
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
      )}
    </>
  );
}
