/**
 * Script d'application ponctuel — NetRack : indentation uniforme de
 * l'arborescence + badge du compte (EO / PBC). A lancer une fois depuis la
 * racine du depot :
 *
 *   node scripts/netrack-indentation-badge.mjs
 *
 * Prerequis : les scripts netrack-arbre-nomenclature, netrack-niveau-lot et
 * netrack-ligne-lot doivent avoir ete passes avant celui-ci.
 *
 * Remplacements de texte exacts, comparaison en LF (les fichiers du disque
 * sont en CRLF sous Windows), reecriture avec les fins de ligne d'origine.
 * S'arrete sans rien ecrire si un motif est introuvable ou ambigu.
 * Relance sans effet de bord. Supprimable apres coup.
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const PAGE = 'src/features/inventaire-netrack/InventaireNetrackPage.jsx';
const ARBRE = 'src/features/inventaire-netrack/arbre.js';
const CSS = 'src/features/inventaire-netrack/inventaireNetrack.css';

const EDITS = [
  [ARBRE,
    `    enfants: new Map(),
    lignes: [],`,
    `    enfants: new Map(),
    lignes: [],
    // Comptes NetRack rencontres sous ce noeud : un badge n'a de sens que si
    // toute la branche appartient a un seul compte.
    comptes: new Set(),`],

  [ARBRE,
    `function cumuler(n, ligne) {
  n.nb_lots += 1;`,
    `function cumuler(n, ligne) {
  n.nb_lots += 1;
  if (ligne.compte) n.comptes.add(ligne.compte);`],

  [ARBRE,
    `    const nCat = enfant(racine, cat, cat, 0);
    if (nCat.rang === undefined) nCat.rang = rangDe(cat);`,
    `    const nCat = enfant(racine, cat, cat, 0);
    if (nCat.rang === undefined) nCat.rang = rangDe(cat);
    // \`niv\` est le niveau d'INDENTATION, fixe par nature de noeud, la ou
    // \`profondeur\` suit l'arbre reel. Sans sous-categorie un produit remonte
    // d'un cran : l'indentation doit rester celle d'un produit, sinon deux
    // branches voisines ne s'alignent plus.
    nCat.niv = 0;`],

  [ARBRE,
    `      if (nSc.rang === undefined) nSc.rang = rangDe(cat + '\\u0000' + l.sous_categorie);
      parent = nSc;`,
    `      if (nSc.rang === undefined) nSc.rang = rangDe(cat + '\\u0000' + l.sous_categorie);
      nSc.niv = 1;
      parent = nSc;`],

  [ARBRE,
    `    const nProd = enfant(parent, '\\u0001' + prod, prod, parent.profondeur + 1);`,
    `    const nProd = enfant(parent, '\\u0001' + prod, prod, parent.profondeur + 1);
    nProd.niv = 2;`],

  [ARBRE,
    `    nLot.est_lot = true;`,
    `    nLot.est_lot = true;
    nLot.niv = 3;`],

  [PAGE,
    `                        style={{ paddingLeft: 8 + (r.parent.profondeur + 1) * INDENT }}
                      >
                        {l.etiquette && <span className="nr-faible">{l.etiquette} </span>}`,
    `                        style={{ paddingLeft: 8 + ((r.parent.niv ?? r.parent.profondeur) + 1) * INDENT }}
                      >
                        <BadgeCompte compte={l.compte} />
                        {l.etiquette && <span className="nr-faible">{l.etiquette} </span>}`],

  [PAGE,
    `                      style={{ paddingLeft: 8 + n.profondeur * INDENT }}
                    >
                      <span className={estProduit ? 'nr-mono' : 'nr-arbre-titre'}>{n.libelle}</span>`,
    `                      style={{ paddingLeft: 8 + (n.niv ?? n.profondeur) * INDENT }}
                    >
                      <BadgeCompte compte={n.comptes && n.comptes.size === 1 ? [...n.comptes][0] : null} />
                      <span className={estProduit ? 'nr-mono' : 'nr-arbre-titre'}>{n.libelle}</span>`],

  [PAGE,
    `/**
 * Aplatit l'arbre en lignes de tableau`,
    `/**
 * Badge du compte NetRack (EO / PBC), en tete de ligne. Rien ne s'affiche
 * quand une branche melange plusieurs comptes : un badge faux serait pire
 * qu'un badge absent. La largeur est fixe pour que les libelles restent
 * alignes, badge ou pas.
 */
function BadgeCompte({ compte }) {
  return <span className="nr-badge-compte" data-compte={compte || undefined}>{compte || ''}</span>;
}

/**
 * Aplatit l'arbre en lignes de tableau`],
];

const CSS_AJOUT = `
/* Badge du compte NetRack, en tete de chaque ligne de l'arborescence.
   Largeur fixe meme vide : les libelles doivent rester alignes entre une
   branche mono-compte et une branche qui en melange plusieurs. */
.nr-badge-compte {
  display: inline-block;
  width: 34px;
  margin-right: 8px;
  padding: 1px 0;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  line-height: 13px;
  text-align: center;
  vertical-align: 1px;
}
.nr-badge-compte[data-compte="EO"] {
  color: var(--copper);
  border-color: var(--copper-dim);
  background: var(--copper-dim);
}
.nr-badge-compte[data-compte="PBC"] {
  color: var(--sapphire);
  border-color: var(--sapphire-bg);
  background: var(--sapphire-bg);
}
`;

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

const css = readFileSync(CSS, 'utf8');
if (css.includes('.nr-badge-compte')) {
  deja += 1;
} else {
  const crlf = css.includes('\r\n');
  appendFileSync(CSS, crlf ? CSS_AJOUT.split('\n').join('\r\n') : CSS_AJOUT, 'utf8');
  appliques += 1;
}

console.log(`${appliques} modification(s) appliquee(s), ${deja} deja en place.`);
console.log('Verifiez la page NetRack, puis commitez.');
