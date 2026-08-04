/**
 * Debloque l'affichage du tableau a l'arrivee sur la page.
 *
 * `.nr-virt` avait un `max-height` et non une hauteur. Un plafond ne cree
 * aucune hauteur propre : tant que le corps du tableau est vide, le
 * conteneur mesure la seule hauteur de son en-tete (36 px releves). Le
 * virtualiseur en deduit une fenetre quasi nulle, ne monte aucune ligne,
 * donc le conteneur ne grandit pas, donc il ne monte toujours rien.
 *
 * Blocage circulaire, invisible tant qu'on naviguait d'une categorie a
 * l'autre — le conteneur avait deja sa hauteur — et systematique a
 * l'arrivee sur la page, ou il part de zero.
 *
 * Mesure avant correction : Problematiques affiche sa 1re ligne en 150 ms,
 * NetRack n'en affichait aucune apres 40 s.
 *
 *   node scripts/netrack-hauteur-virtualiseur.mjs
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

if (css.texte.includes('.nr-virt { height:')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = remplacer(css.texte, 'hauteur du virtualiseur',
  '.nr-virt { max-height: calc(100vh - 340px); overflow: auto; }',
  '/* HAUTEUR, pas plafond : un max-height ne cree aucune hauteur propre, donc\n'
  + '   le conteneur mesurait 36 px tant que le tableau etait vide et le\n'
  + '   virtualiseur ne montait jamais la premiere ligne. */\n'
  + '.nr-virt { height: max(320px, calc(100vh - 340px)); overflow: auto; }');

writeFileSync(CSS, css.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  inventaireNetrack.css');
console.log('\nTermine.');
