/**
 * Script d'application ponctuel — NetRack : masquer `pct_vie_restante` dans
 * la liste des colonnes. A lancer une fois depuis la racine du depot :
 *
 *   node scripts/netrack-masquer-pct.mjs
 *
 * `pct_vie_restante` est un champ CALCULE, ajoute par enrichir() pour servir
 * la gravite d'expiration. La liste des colonnes etant derivee des champs
 * presents, il s'affichait comme une colonne du tableau. Il rejoint donc
 * `niveau_expiration` et `dans_referentiel` dans MASQUEES.
 *
 * Remplacement de texte exact, comparaison en LF, reecriture avec les fins de
 * ligne d'origine. Relance sans effet de bord.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LOGIC = 'src/features/inventaire-netrack/logic.js';

const EDITS = [
  [LOGIC,
    `  'niveau_expiration', 'dans_referentiel',
]);`,
    `  'niveau_expiration', 'dans_referentiel', 'pct_vie_restante',
]);`],
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
