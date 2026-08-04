import { useMemo } from 'react';

/**
 * FiltreNomenclature — deux lignes de VALEURS, pas de noms de champs.
 *
 * Ligne 1 : les categories reellement presentes dans le releve.
 * Ligne 2 : les sous-categories de la categorie choisie, et elle seule.
 *
 * ══ UN SEUL APPEL PAR CLIC ════════════════════════════════════
 * Changer de categorie doit AUSSI vider la sous-categorie — PAPIER n'existe
 * pas sous MATIERES PREMIERES. Mais deux appels successifs a majParams ne
 * fonctionnent pas : le second repart des parametres du rendu precedent et
 * ecrase le premier. C'est au parent de vider `sc` dans le meme appel que
 * `cat`.
 *
 * ══ TROIS ETATS, PAS DEUX ══════════════════════════════════════
 *   ''  → transitoire : la page bascule aussitot sur TOUTES.
 *   '*' → TOUTES : tout s'affiche, et la recherche porte sur tout.
 *   une valeur → cette categorie.
 *
 * ══ POURQUOI LES VALEURS PLUTOT QUE LA NOMENCLATURE ════════════════
 * Les libelles sont tires des lignes affichees, pas de
 * base_reference_categories : une categorie definie mais vide ce matin
 * n'apparait pas, et un trou de referentiel (« sans categorie ») apparait.
 * L'ecran montre ce qui EST en stock, pas ce qui pourrait l'etre.
 *
 * Chaque pastille porte son nombre de lignes : sans ce nombre, on clique a
 * l'aveugle et on tombe souvent sur du vide.
 */

export const TOUTES = '*';

const SANS_SOUS = '(sans sous-catégorie)';

export default function FiltreNomenclature({
  lignes, categorie, sousCategorie, onCategorie, onSousCategorie,
}) {
  const { cats, sous } = useMemo(() => {
    const parCat = new Map();
    const parSous = new Map();
    const cible = categorie && categorie !== TOUTES;

    for (const l of lignes) {
      const c = l.categorie || '(sans catégorie)';
      parCat.set(c, (parCat.get(c) || 0) + 1);

      if (!cible) continue;
      const correspond = categorie === '(sans)' ? !l.categorie : l.categorie === categorie;
      if (!correspond) continue;
      const s = l.sous_categorie || SANS_SOUS;
      parSous.set(s, (parSous.get(s) || 0) + 1);
    }

    const trier = (m) => [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }));

    return { cats: trier(parCat), sous: trier(parSous) };
  }, [lignes, categorie]);

  // La valeur portee par l'URL pour « sans categorie » differe du libelle
  // affiche : le filtre existant attend '(sans)'.
  const valeurCat = (libelle) => (libelle === '(sans catégorie)' ? '(sans)' : libelle);

  // Une categorie dont AUCUN produit n'a de sous-categorie n'a pas de 2e
  // niveau : afficher « Toutes » et « (sans sous-categorie) » reviendrait a
  // proposer un choix entre une seule chose et elle-meme.
  const aUnVraiNiveau = sous.some(([libelle]) => libelle !== SANS_SOUS);

  const total = lignes.length;
  const totalSous = sous.reduce((s, [, n]) => s + n, 0);

  return (
    <div className="nr-nomen">
      <div className="nr-nomen-ligne">
        <span className="nr-nomen-lbl">Catégorie</span>
        <button
          className="nr-val"
          aria-pressed={categorie === TOUTES}
          onClick={() => onCategorie(TOUTES)}
        >
          Toutes<span className="nr-val-n">{total.toLocaleString('fr-CA')}</span>
        </button>
        {cats.map(([libelle, n]) => (
          <button
            key={libelle}
            className="nr-val"
            data-vide={libelle === '(sans catégorie)' ? '1' : undefined}
            aria-pressed={categorie === valeurCat(libelle)}
            onClick={() => {
              const v = valeurCat(libelle);
              // Redescendre a TOUTES plutot qu'a rien : plus d'ecran vide.
              onCategorie(categorie === v ? TOUTES : v);
            }}
          >
            {libelle}<span className="nr-val-n">{n.toLocaleString('fr-CA')}</span>
          </button>
        ))}
      </div>

      {/* La 2e ligne n'existe que si la 1re a tranche sur UNE categorie, et
          seulement si cette categorie a de vraies sous-categories : afficher
          des sous-categories sans parent melangerait des homonymes — PAPIER
          existe sous LIGNE EH1 ET sous LIGNE TBA. */}
      {categorie !== '' && categorie !== TOUTES && aUnVraiNiveau && (
        <div className="nr-nomen-ligne nr-nomen-sous">
          <span className="nr-nomen-lbl">Sous-catégorie</span>
          <button
            className="nr-val"
            aria-pressed={sousCategorie === ''}
            onClick={() => onSousCategorie('')}
          >
            Toutes<span className="nr-val-n">{totalSous.toLocaleString('fr-CA')}</span>
          </button>
          {sous.map(([libelle, n]) => (
            <button
              key={libelle}
              className="nr-val"
              data-vide={libelle === SANS_SOUS ? '1' : undefined}
              aria-pressed={sousCategorie === libelle}
              onClick={() => onSousCategorie(sousCategorie === libelle ? '' : libelle)}
            >
              {libelle}<span className="nr-val-n">{n.toLocaleString('fr-CA')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
