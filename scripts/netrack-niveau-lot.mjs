/**
 * Script d'application ponctuel — NetRack : niveau LOT depliable dans
 * l'arborescence. A lancer une fois depuis la racine du depot :
 *
 *   node scripts/netrack-niveau-lot.mjs
 *
 * Remplacements de texte exacts, comparaison en LF (les fichiers du disque
 * sont en CRLF sous Windows), reecriture avec les fins de ligne d'origine.
 * S'arrete sans rien ecrire si un motif est introuvable ou ambigu.
 * Relance sans effet de bord. Supprimable apres coup.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = 'src/features/inventaire-netrack/InventaireNetrackPage.jsx';
const ARBRE = 'src/features/inventaire-netrack/arbre.js';

const EDITS = [
  [ARBRE,
    `    nProd.lignes.push(l);
    cumuler(nCat, l);`,
    `    // Niveau LOT : depliable comme les autres, il regroupe les sous-lots
    // d'un meme numero. Les lignes restent portees par ce noeud, donc un lot
    // sans sous-lot se deplie sur son unique ligne de detail.
    const nLot = enfant(nProd, '\\u0002' + (l.no_lot || ''), l.no_lot || '(sans n° lot)',
      nProd.profondeur + 1);
    nLot.est_lot = true;
    nLot.lignes.push(l);
    cumuler(nLot, l);

    nProd.lignes.push(l);
    cumuler(nCat, l);`],

  [ARBRE,
    `  { cle: 'libelle', libelle: 'Catégorie / Sous-catégorie / Produit' },`,
    `  { cle: 'libelle', libelle: 'Catégorie / Sous-catégorie / Produit / Lot' },`],

  [PAGE,
    `                    <td className="nr-num">{nb(n.nb_produits)}</td>`,
    `                    <td className="nr-num">{n.est_lot ? '' : nb(n.nb_produits)}</td>`],
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
