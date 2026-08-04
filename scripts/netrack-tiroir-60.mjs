/**
 * Le tiroir passe de 50 % a 60 % de la largeur d'ecran.
 *
 * A demi-largeur, le tableau des sous-lots (11 colonnes, dont deux dates et
 * deux champs modifiables) debordait encore.
 *
 *   node scripts/netrack-tiroir-60.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CSS = join(process.cwd(), 'src/features/inventaire-netrack/inventaireNetrack.css');

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

const css = lire(CSS);

if (css.texte.includes('width: 60vw;')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = remplacer(css.texte, 'largeur du tiroir',
  '  width: 50vw;\n  max-width: none;',
  '  width: 60vw;\n  max-width: none;');

writeFileSync(CSS, css.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  inventaireNetrack.css');
console.log('\nPense a recharger avec Ctrl+Shift+R : Vite recharge le composant');
console.log('mais pas toujours la feuille de style.');
console.log('\nTermine.');
