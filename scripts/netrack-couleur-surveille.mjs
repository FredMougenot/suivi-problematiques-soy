/**
 * Donne une vraie couleur au niveau « 31 a 90 jours ».
 *
 * --nr-surveille valait #6d8fb0, un bleu-gris desature. A cote des trois
 * tons chauds de l'echelle (rouge, orange, jaune), il se lisait comme une
 * absence de couleur plutot que comme un cran de plus.
 *
 * L'echelle allant du danger vers le sur, la suite logique du jaune est le
 * vert. Le changement porte sur la variable, donc il s'applique partout ou
 * le niveau apparait : pastille, colonne Jours restants, coloration de
 * ligne.
 *
 *   node scripts/netrack-couleur-surveille.mjs
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

if (css.texte.includes('--nr-surveille: #4f9d72')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = remplacer(css.texte, 'couleur surveille',
  '  --nr-surveille: #6d8fb0;',
  '  /* Vert : dernier cran de l\'echelle rouge > orange > jaune > vert.\n'
  + "     Le bleu-gris precedent se lisait comme une absence de couleur. */\n"
  + '  --nr-surveille: #4f9d72;');

writeFileSync(CSS, css.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  inventaireNetrack.css');
console.log('\nTermine.');
