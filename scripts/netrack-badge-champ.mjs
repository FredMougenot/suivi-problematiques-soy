/**
 * Script d'application ponctuel — NetRack : corrige le champ lu par le badge
 * de compte. A lancer une fois depuis la racine du depot :
 *
 *   node scripts/netrack-badge-champ.mjs
 *
 * Le compte NetRack (EO / PBC) est porte par le champ `client` des lignes
 * d'inventaire ; `compte` n'est qu'un alias de la barre de recherche, et
 * `client_regle` designe le client final issu du referentiel. Le badge lisait
 * `compte` : toujours vide, donc jamais affiche.
 *
 * Remplacements de texte exacts, comparaison en LF, reecriture avec les fins
 * de ligne d'origine. S'arrete sans rien ecrire si un motif est introuvable
 * ou ambigu. Relance sans effet de bord.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = 'src/features/inventaire-netrack/InventaireNetrackPage.jsx';
const ARBRE = 'src/features/inventaire-netrack/arbre.js';

const EDITS = [
  [ARBRE,
    `  if (ligne.compte) n.comptes.add(ligne.compte);`,
    `  if (ligne.client) n.comptes.add(ligne.client);`],

  [PAGE,
    `                        <BadgeCompte compte={l.compte} />`,
    `                        <BadgeCompte compte={l.client} />`],
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
