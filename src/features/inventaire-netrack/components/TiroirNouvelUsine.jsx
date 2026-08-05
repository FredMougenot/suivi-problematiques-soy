import { useEffect, useMemo, useRef, useState } from 'react';
import FormulaireUsine from './FormulaireUsine';
import { useReferenceProduitsQuery } from '../queries';

/**
 * TiroirNouvelUsine — ajouter un item usine pour un produit qui n'est PAS
 * dans la liste affichee.
 *
 * ══ POURQUOI CHERCHER DANS LE REFERENTIEL ═══════════════════════
 * Chercher dans l'inventaire du jour serait circulaire : le produit qu'on
 * veut ajouter est justement celui qui n'y est pas. `base_reference_produits`
 * garde en revanche tout ce qui est deja passe chez l'entreposeur, avec son
 * libelle, sa categorie et son poids — tout se pre-remplit donc a la lecture.
 *
 * ══ LE CODE LIBRE EST UN GESTE EXPLICITE ═══════════════════════
 * Un produit absent meme du referentiel reste saisissable, mais il faut le
 * demander. Sinon une faute de frappe cree un produit fantome, sans
 * categorie ni poids. Ces lignes-la retombent dans la pastille « hors
 * referentiel », qui existe deja : elles ne se perdent pas silencieusement.
 */

const DUREE_FERMETURE = 200;
const MAX_RESULTATS = 12;

export default function TiroirNouvelUsine({ ouvert, onFermer, ajouter }) {
  const [ferme, setFerme] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [choisi, setChoisi] = useState(null);
  const [codeLibre, setCodeLibre] = useState(false);
  const refChamp = useRef(null);

  const { data: reference = [] } = useReferenceProduitsQuery();

  const fermer = () => {
    setFerme(true);
    setTimeout(() => {
      setFerme(false);
      setRecherche('');
      setChoisi(null);
      setCodeLibre(false);
      onFermer();
    }, DUREE_FERMETURE);
  };

  useEffect(() => {
    if (!ouvert) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') fermer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /**
   * Focus donne a la main plutot que par `autoFocus`.
   *
   * `autoFocus` laisse le navigateur amener le champ dans le champ de
   * vision. Le champ est dans un tiroir FIXE, mais la page est plus large
   * que la fenetre : le navigateur faisait defiler la PAGE pour un
   * element qui ne bouge pas, ce qui produisait un second mouvement
   * pendant le glissement du tiroir. preventScroll supprime ce reflexe.
   */
  useEffect(() => {
    if (!ouvert || !refChamp.current) return;
    refChamp.current.focus({ preventScroll: true });
  }, [ouvert]);

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (q.length < 2) return [];
    return reference
      .filter((p) => (p.code || '').toLowerCase().includes(q)
        || (p.nom || '').toLowerCase().includes(q))
      .slice(0, MAX_RESULTATS);
  }, [reference, recherche]);

  if (!ouvert) return null;

  const codeRetenu = choisi ? choisi.code : (codeLibre ? recherche.trim() : '');

  return (
    <>
      <div
        className="nr-tiroir-voile"
        data-ferme={ferme ? '1' : undefined}
        onClick={fermer}
        aria-hidden="true"
      />
      <aside
        className="nr-tiroir"
        data-ferme={ferme ? '1' : undefined}
        role="dialog"
        aria-label="Nouvel item usine"
      >
        <header className="nr-tiroir-tete">
          <div>
            <div className="nr-tiroir-sur">Emplacement Usine</div>
            <div className="nr-tiroir-titre">Nouvel item</div>
          </div>
          <button className="btn btn-secondary" onClick={fermer} aria-label="Fermer">✕</button>
        </header>

        <div className="nr-tiroir-corps">
          {choisi || codeLibre ? (
            <section className="nr-tiroir-bloc">
              <div className="nr-tiroir-lbl">Produit</div>
              <div className="nr-mono nr-tiroir-val">{codeRetenu}</div>
              <div className="nr-faible">
                {choisi ? (choisi.nom || '—') : 'Code hors référentiel'}
              </div>
              {choisi && (
                <div className="nr-faible">
                  {[choisi.categorie, choisi.sous_categorie, choisi.client]
                    .filter(Boolean).join(' · ') || '—'}
                </div>
              )}
              <button
                className="btn btn-secondary nr-usine-ouvrir"
                onClick={() => { setChoisi(null); setCodeLibre(false); }}
              >
                Changer de produit
              </button>
            </section>
          ) : (
            <section className="nr-usine-recherche">
              <div className="nr-tiroir-lbl">Produit</div>
              <input
                type="text"
                className="nr-usine-champ"
                ref={refChamp}
                placeholder="Code ou description…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />

              {recherche.trim().length >= 2 && (
                <>
                  <ul className="nr-usine-resultats">
                    {resultats.map((p) => (
                      <li key={p.code}>
                        <button onClick={() => setChoisi(p)}>
                          <span className="nr-mono">{p.code}</span>
                          <span className="nr-faible">{p.nom || '—'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {resultats.length === 0 && (
                    <div className="nr-faible">Aucun produit connu sous ce nom.</div>
                  )}

                  {/* Geste explicite : un code invente n'a ni categorie ni
                      poids, il retombera dans « hors referentiel ». */}
                  <button className="btn btn-secondary" onClick={() => setCodeLibre(true)}>
                    Utiliser « {recherche.trim()} » comme code hors référentiel
                  </button>
                </>
              )}
            </section>
          )}

          {codeRetenu && (
            <FormulaireUsine
              noProduit={codeRetenu}
              ajouter={ajouter}
              toujoursOuvert
              onEnregistre={fermer}
              onAnnuler={fermer}
            />
          )}
        </div>
      </aside>
    </>
  );
}
