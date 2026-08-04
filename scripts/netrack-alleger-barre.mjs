/**
 * Allege la barre d'outils de l'ecran Inventaire NetRack :
 *   - les 3 listes deroulantes a droite de la recherche (categorie,
 *     expiration, stock) — la premiere faisait doublon avec la ligne de
 *     valeurs, les deux autres sont couvertes par les pastilles d'exceptions ;
 *   - le bouton « Reinitialiser » ;
 *   - les 4 boutons de depliage (Tout replier / Un niveau / Deux niveaux /
 *     Tout deplier).
 *
 *   node scripts/netrack-alleger-barre.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');

function lire(chemin) {
  if (!existsSync(chemin)) throw new Error('Fichier introuvable : ' + chemin);
  const brut = readFileSync(chemin, 'utf8');
  return { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n') };
}

function couper(texte, nom, debut, fin, remplacement) {
  const i = texte.indexOf(debut);
  if (i === -1) throw new Error('[' + nom + '] repere de debut introuvable');
  const j = texte.indexOf(fin, i);
  if (j === -1) throw new Error('[' + nom + '] repere de fin introuvable');
  return texte.slice(0, i) + remplacement + texte.slice(j);
}

const page = lire(PAGE);
let t = page.texte;

if (!t.includes('nr-arbre-outils') && !t.includes('onClick={reinitialiser}')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

// 1 ─ Les 3 listes deroulantes et le bouton Reinitialiser, jusqu'a la
//     fermeture de la barre d'outils.
if (t.includes('onClick={reinitialiser}')) {
  t = couper(t, 'selects + reinitialiser',
    '          <select className="fsel" value={categorie}',
    '        </div>\n      </div>',
    '');
  console.log('OK  listes deroulantes et bouton Reinitialiser retires');
}

// 2 ─ Les 4 boutons de depliage.
if (t.includes('nr-arbre-outils')) {
  t = couper(t, 'boutons de depliage',
    "      {vue === 'arbre' && (\n        <div className=\"nr-arbre-outils\">",
    '      <div className="nr-aide">',
    '');
  console.log('OK  boutons de depliage retires');
}

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');

console.log('\nNote : les fonctions reinitialiser() et deplierJusqua() restent');
console.log('definies mais ne sont plus appelees — oxlint les signalera.');
console.log('\nTermine.');
