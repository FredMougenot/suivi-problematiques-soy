import { useMemo } from 'react';

/**
 * FiltreNomenclature — deux lignes de VALEURS, pas de noms de champs.
 *
 * Ligne 1 : les categories reellement presentes dans le releve.
 * Ligne 2 : les sous-categories de la categorie choisie, et elle seule.
 *
 * ══ POURQUOI LES VALEURS PLUTOT QUE LA NOMENCLATURE ════════════════
 * Les libelles sont tires des lignes affichees, pas de
 * base_reference_categories : une categorie definie mais vide ce matin
 * n'apparait pas, et un trou de referentiel (« sans categorie ») apparait.
 * L'ecran montre ce qui EST en stock, pas ce qui pourrait l'etre.
 *
 * Chaque pastille porte son nombre de lignes : sans ce nombre, on clique a
 * l'aveugle et on tombe souvent sur du vide.
 *
 * C'est un FILTRE — il restreint ce qu'on regarde. A ne pas confondre avec
 * les axes juste au-dessus, qui decident comment c'est regroupe.
 */
export default function FiltreNomenclature({
  lignes, categorie, sousCategorie, onCategorie, onSousCategorie,
}) {
  const { cats, sous } = useMemo(() => {
    const parCat = new Map();
    const parSous = new Map();

    for (const l of lignes) {
      const c = l.categorie || '(sans catégorie)';
      parCat.set(c, (parCat.get(c) || 0) + 1);

      const correspond = categorie === '(sans)' ? !l.categorie : l.categorie === categorie;
      if (categorie && correspond) {
        const s = l.sous_categorie || '(sans sous-catégorie)';
        parSous.set(s, (parSous.get(s) || 0) + 1);
      }
    }

    const trier = (m) => [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }));

    return { cats: trier(parCat), sous: trier(parSous) };
  }, [lignes, categorie]);

  // La valeur portee par l'URL pour « sans categorie » differe du libelle
  // affiche : le filtre existant attend '(sans)'.
  const valeurCat = (libelle) => (libelle === '(sans catégorie)' ? '(sans)' : libelle);

  const total = lignes.length;
  const totalSous = sous.reduce((s, [, n]) => s + n, 0);

  return (
    <div className="nr-nomen">
      <div className="nr-nomen-ligne">
        <span className="nr-nomen-lbl">Catégorie</span>
        <button
          className="nr-val"
          aria-pressed={categorie === ''}
          onClick={() => { onCategorie(''); onSousCategorie(''); }}
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
              onSousCategorie('');
              onCategorie(categorie === v ? '' : v);
            }}
          >
            {libelle}<span className="nr-val-n">{n.toLocaleString('fr-CA')}</span>
          </button>
        ))}
      </div>

      {/* La 2e ligne n'existe que si la 1re a tranche : afficher des
          sous-categories sans parent melangerait des homonymes — PAPIER
          existe sous LIGNE EH1 ET sous LIGNE TBA. */}
      {categorie !== '' && (
        <div className="nr-nomen-ligne nr-nomen-sous">
          <span className="nr-nomen-lbl">Sous-catégorie</span>
          {sous.length === 0 ? (
            <span className="nr-faible">aucune sous-catégorie ici</span>
          ) : (
            <>
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
                  data-vide={libelle === '(sans sous-catégorie)' ? '1' : undefined}
                  aria-pressed={sousCategorie === libelle}
                  onClick={() => onSousCategorie(sousCategorie === libelle ? '' : libelle)}
                >
                  {libelle}<span className="nr-val-n">{n.toLocaleString('fr-CA')}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
