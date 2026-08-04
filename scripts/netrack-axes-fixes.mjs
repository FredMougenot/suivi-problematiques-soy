/**
 * La page ne lit plus le parametre d'URL `axes`.
 *
 * Pourquoi : le composeur d'axes a ete retire, mais la page continuait
 * d'obeir au parametre. Une vieille URL portant `axes=-` (le jeton qui
 * signifiait « aucun axe ») vidait donc le tableau, sans qu'aucune commande
 * a l'ecran ne permette de le retablir. Un etat que l'utilisateur ne peut
 * plus atteindre ne doit plus pouvoir le piéger.
 *
 * La hierarchie devient fixe : Produit puis Lot, en aval du filtre de
 * nomenclature.
 *
 * A lancer APRES netrack-retirer-axes.mjs.
 *
 *   node scripts/netrack-axes-fixes.mjs
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

if (page.texte.includes('const axes = AXES_DEFAUT;')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = couper(page.texte, 'axes fixes',
  '  /**\n   * Axes de regroupement.',
  '  const majParams',
  '  /**\n'
  + "   * Hierarchie du tableau. Fixe depuis le retrait du composeur d'axes :\n"
  + "   * continuer a lire le parametre `axes` laissait une vieille URL vider\n"
  + '   * le tableau sans aucun moyen de le retablir a l\'ecran.\n'
  + '   */\n'
  + '  const axes = AXES_DEFAUT;\n'
  + '\n');

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
