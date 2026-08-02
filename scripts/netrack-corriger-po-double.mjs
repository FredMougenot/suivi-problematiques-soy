/**
 * Script d'application ponctuel — NetRack : supprime la colonne PO client en
 * DOUBLE. A lancer une fois depuis la racine :
 *
 *   node scripts/netrack-corriger-po-double.mjs
 *
 * CAUSE DU BUG — netrack-po-derniere-colonne.mjs testait « deja applique » en
 * cherchant le TEXTE DE REMPLACEMENT dans le fichier. Pour ses deux editions
 * de SUPPRESSION, ce texte (la ligne nb_produits, la cellule Produits)
 * existait deja avant modification : le script les a donc sautees tout en
 * ajoutant la nouvelle colonne en fin. Resultat : deux colonnes « PO client »,
 * 13 cellules par ligne pour 12 en-tetes, et un decalage de tout le tableau.
 *
 * Ce script-ci teste l'inverse — il saute une edition quand son MOTIF est
 * absent, ce qui ne peut pas se confondre avec un etat non modifie.
 *
 * Il retire les PREMIERES occurrences (celles placees avant la colonne
 * Produits) et conserve celles de la fin.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = 'src/features/inventaire-netrack/InventaireNetrackPage.jsx';
const ARBRE = 'src/features/inventaire-netrack/arbre.js';

const EDITS = [
  [ARBRE,
    `  { cle: 'no_comm_client', libelle: 'PO client', niveaux: 'detail' },
  { cle: 'nb_produits', libelle: 'Produits', num: true, niveaux: 'groupe' },`,
    `  { cle: 'nb_produits', libelle: 'Produits', num: true, niveaux: 'groupe' },`],

  [PAGE,
    `                    {/* PO client : porte par la ligne de detail, pas par un agregat. */}
                    <td />
                    <td className="nr-num">{estProduit || n.est_lot ? '' : nb(n.nb_produits)}</td>`,
    `                    <td className="nr-num">{estProduit || n.est_lot ? '' : nb(n.nb_produits)}</td>`],
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
  const n = contenu.split(motif).length - 1;
  if (n === 0) { deja += 1; continue; }
  if (n > 1) {
    console.error(`\nECHEC — motif trouve ${n} fois dans ${fichier}, ambigu :\n${motif}\n`);
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

// Controle final : autant de cellules que d'en-tetes, sur les deux types de
// lignes. C'est exactement ce qui manquait au script fautif.
const page = lire(PAGE);
const arbre = lire(ARBRE);
const colonnes = (arbre.split('COLONNES_ARBRE')[1] || '').split('];')[0];
const nbColonnes = (colonnes.match(/\{ cle:/g) || []).length;
const bloc = page.split("if (r.type === 'lot') {")[1] || '';
const detail = bloc.split('const n = r.n;')[0];
const noeud = (bloc.split('const n = r.n;')[1] || '').split("        ) : vue === 'produit'")[0];
const compter = (s) => (s.match(/<td[ />\n]/g) || []).length;

console.log(`${appliques} modification(s) appliquee(s), ${deja} deja en place.`);
console.log(`Colonnes declarees : ${nbColonnes} (+1 chevron = ${nbColonnes + 1} cellules attendues)`);
console.log(`Cellules ligne de detail : ${compter(detail)}`);
console.log(`Cellules ligne de noeud  : ${compter(noeud)}`);
if (compter(detail) !== nbColonnes + 1 || compter(noeud) !== nbColonnes + 1) {
  console.error('\nATTENTION : le compte ne tombe pas juste, le tableau sera decale.');
  process.exit(1);
}
console.log('Compte coherent. Verifiez la page NetRack, puis commitez.');
