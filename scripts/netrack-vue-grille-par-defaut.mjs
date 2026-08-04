/**
 * La vue par defaut devient GRILLE.
 *
 * Sans parametre `vue`, la page ouvrait « Par lot » — la seule vue NON
 * virtualisee : 5 823 <tr> montes d'un coup, un conteneur de 237 000 px de
 * haut. C'est ce qui rendait l'arrivee sur NetRack lente, la ou
 * Problematiques s'affiche en 150 ms.
 *
 * L'effet qui basculait ensuite sur 'arbre' ne suffisait pas : il s'execute
 * APRES un premier rendu complet en « Par lot ». Le cout etait deja paye.
 * On inverse donc la valeur de repli elle-meme : 'lot' et 'produit' restent
 * accessibles explicitement, tout le reste tombe sur la grille.
 *
 *   node scripts/netrack-vue-grille-par-defaut.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');

function lire(chemin) {
  if (!existsSync(chemin)) throw new Error('Fichier introuvable : ' + chemin);
  const brut = readFileSync(chemin, 'utf8');
  return { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n') };
}

function remplacer(texte, nom, avant, apres) {
  const n = texte.split(avant).length - 1;
  if (n !== 1) throw new Error('[' + nom + '] motif trouve ' + n + ' fois, attendu 1');
  return texte.replace(avant, apres);
}

const page = lire(PAGE);
let t = page.texte;

if (t.includes("vueBrute === 'lot' ? 'lot' : 'arbre'")) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

// La valeur de repli passe de 'lot' a 'arbre'.
t = remplacer(t, 'vue par defaut',
  "  const vue = vueBrute === 'produit' ? 'produit' : vueBrute === 'arbre' ? 'arbre' : 'lot';",
  "  // Repli sur la grille : c'est la seule vue virtualisee. « Par lot »\n"
  + '  // monte 5 823 lignes d\'un coup et ne doit jamais s\'ouvrir par accident.\n'
  + "  const vue = vueBrute === 'produit' ? 'produit' : vueBrute === 'lot' ? 'lot' : 'arbre';");

// L'effet de rattrapage n'a plus d'objet : il provoquait une navigation
// supplementaire au chargement pour un resultat desormais acquis d'entree.
if (t.includes("    if (!vueBrute) majParams({ vue: 'arbre' });")) {
  t = remplacer(t, 'effet de rattrapage',
    "    if (!vueBrute) majParams({ vue: 'arbre' });\n",
    "    // La vue par defaut est deja 'arbre' : plus rien a rattraper ici.\n");
}

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
