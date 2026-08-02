/**
 * Script d'application ponctuel — NetRack : arborescence par defaut et ordre
 * de la nomenclature. A lancer une fois depuis la racine du depot :
 *
 *   node scripts/netrack-arbre-nomenclature.mjs
 *
 * Il n'invente rien : il applique des remplacements de texte exacts et
 * s'arrete au premier motif introuvable, sans rien ecrire. Relance sans
 * risque — il detecte le travail deja fait. Supprimable apres coup.
 *
 * FINS DE LIGNE : sous Windows les fichiers du disque sont en CRLF alors que
 * les motifs ci-dessous sont en LF. Tout est donc compare en LF, et chaque
 * fichier est reecrit avec les fins de ligne qu'il avait avant — sinon la
 * moindre comparaison multi-lignes echoue et le diff Git explose.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = 'src/features/inventaire-netrack/InventaireNetrackPage.jsx';
const ARBRE = 'src/features/inventaire-netrack/arbre.js';

/** [fichier, motif, remplacement] */
const EDITS = [
  [ARBRE,
    ` * noye au milieu d'une liste de produits.
 */
function trierNoeuds(liste, tri) {`,
    ` * noye au milieu d'une liste de produits.
 *
 * Categories et sous-categories suivent l'ordre defini dans la NOMENCLATURE
 * (colonne \`ordre\` de base_reference_categories) : c'est un ordre metier, il
 * doit primer sur l'alphabet. Il ne s'applique qu'au tri naturel — des que
 * l'utilisateur clique une colonne numerique, son choix l'emporte. Les
 * produits, eux, n'ont pas de rang et restent alphabetiques.
 */
function trierNoeuds(liste, tri) {`],

  [ARBRE,
    `    if (a.est_produit !== b.est_produit) return a.est_produit ? 1 : -1;
    if (NUM.has(colonne)) {`,
    `    if (a.est_produit !== b.est_produit) return a.est_produit ? 1 : -1;
    if (!NUM.has(colonne)
      && a.rang !== undefined && b.rang !== undefined
      && a.rang !== b.rang) {
      return (a.rang - b.rang) * sens;
    }
    if (NUM.has(colonne)) {`],

  [ARBRE,
    `export function construireArbre(lignes, tri) {
  const racine = noeud('', '', -1);`,
    `export function construireArbre(lignes, tri, rangs) {
  const racine = noeud('', '', -1);
  const rangDe = (cle) => (rangs && rangs.has(cle) ? rangs.get(cle) : undefined);`],

  [ARBRE,
    `    const nCat = enfant(racine, cat, cat, 0);`,
    `    const nCat = enfant(racine, cat, cat, 0);
    if (nCat.rang === undefined) nCat.rang = rangDe(cat);`],

  [ARBRE,
    `      nSc = enfant(nCat, l.sous_categorie, l.sous_categorie, 1);
      parent = nSc;`,
    `      nSc = enfant(nCat, l.sous_categorie, l.sous_categorie, 1);
      if (nSc.rang === undefined) nSc.rang = rangDe(cat + '\\u0000' + l.sous_categorie);
      parent = nSc;`],

  [PAGE,
    `import { useEffect, useMemo, useState, useCallback } from 'react';`,
    `import { useEffect, useMemo, useState, useCallback, useRef } from 'react';`],

  [PAGE,
    `import {
  useInventaireNetrackQuery, useReglesCategorieQuery, useReferenceProduitsQuery,
} from './queries';`,
    `import {
  useInventaireNetrackQuery, useReglesCategorieQuery, useReferenceProduitsQuery,
  useCategoriesQuery, organiserCategories,
} from './queries';`],

  [PAGE,
    `  const referenceQ = useReferenceProduitsQuery();`,
    `  const referenceQ = useReferenceProduitsQuery();
  const categoriesQ = useCategoriesQuery();`],

  [PAGE,
    `  const [deplies, setDeplies] = useState(() => new Set());`,
    `  /**
   * Vue par defaut AU CHARGEMENT seulement. Chaque valeur du parametre garde
   * exactement le sens qu'elle a toujours eu (lot, produit, arbre) : on ecrit
   * vue=arbre plutot que de redefinir ce que signifie un parametre absent,
   * pour qu'un lien deja partage reste fidele a ce qu'il montrait.
   *
   * La garde ne joue qu'une fois : ensuite l'utilisateur revient a « par lot »
   * sans etre ramene a l'arborescence au rendu suivant.
   */
  const vueInitialisee = useRef(false);
  useEffect(() => {
    if (vueInitialisee.current) return;
    vueInitialisee.current = true;
    if (!vueBrute) majParams({ vue: 'arbre' });
  }, [vueBrute, majParams]);

  const [deplies, setDeplies] = useState(() => new Set());`],

  [PAGE,
    `  const arbre = useMemo(
    () => (vue === 'arbre' ? construireArbre(filtrees, tri) : []),
    [vue, filtrees, tri],
  );`,
    `  /**
   * Rang de chaque noeud de la nomenclature, dans l'ordre exact qu'affiche
   * l'ecran Nomenclature (colonne \`ordre\`, puis alphabetique a egalite).
   * Les libelles servent de cle : l'inventaire ne porte pas les identifiants
   * de categorie. Une sous-categorie est identifiee par son couple
   * (parent, libelle) — un meme libelle peut exister sous deux parents.
   */
  const rangsNomenclature = useMemo(() => {
    const m = new Map();
    organiserCategories(categoriesQ.data || []).forEach((c, i) => {
      m.set(c.profondeur === 0 ? c.libelle : c.parent_libelle + '\\u0000' + c.libelle, i);
    });
    return m;
  }, [categoriesQ.data]);

  const arbre = useMemo(
    () => (vue === 'arbre' ? construireArbre(filtrees, tri, rangsNomenclature) : []),
    [vue, filtrees, tri, rangsNomenclature],
  );`],
];

const contenus = new Map();
const avaitCrlf = new Map();

const lire = (f) => {
  if (!contenus.has(f)) {
    const brut = readFileSync(f, 'utf8');
    avaitCrlf.set(f, brut.includes('\r\n'));
    contenus.set(f, brut.split('\r\n').join('\n'));
  }
  return contenus.get(f);
};

let appliques = 0;
let deja = 0;

for (const [fichier, motif, remplacement] of EDITS) {
  const contenu = lire(fichier);
  if (contenu.includes(remplacement)) { deja += 1; continue; }
  const n = contenu.split(motif).length - 1;
  if (n !== 1) {
    console.error(`\nECHEC — motif trouve ${n} fois dans ${fichier} :\n${motif}\n`);
    console.error("Aucun fichier n'a ete modifie. Le depot est intact.");
    process.exit(1);
  }
  contenus.set(fichier, contenu.replace(motif, remplacement));
  appliques += 1;
}

for (const [f, contenu] of contenus) {
  const sortie = avaitCrlf.get(f) ? contenu.split('\n').join('\r\n') : contenu;
  writeFileSync(f, sortie, 'utf8');
}

console.log(`${appliques} modification(s) appliquee(s), ${deja} deja en place.`);
console.log('Verifiez la page NetRack, puis commitez.');
