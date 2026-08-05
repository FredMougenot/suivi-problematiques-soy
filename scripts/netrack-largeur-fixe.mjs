/**
 * Le tableau cesse de s'etirer avec la page.
 *
 * Il etait en `width: 100%` \u2014 donc 100 % de son CONTENEUR, pas de la fenetre.
 * Or ce conteneur s'elargit pour contenir le plus large element de la page
 * (ici la barre de boutons du haut, qui deborde deja). Le tableau heritait de
 * cette largeur et devait repartir plusieurs centaines de pixels excedentaires
 * entre ses colonnes : Firefox les donnait tous a la colonne du libelle, la
 * seule sans largeur imposee, repoussant les onze autres hors de l'ecran.
 *
 * On lui donne desormais une largeur EXACTE, egale a la somme de ses
 * colonnes. Il ne s'etire plus, quelle que soit la largeur de la page.
 *
 * CE QUE CELA NE REGLE PAS : la page reste plus large que la fenetre a cause
 * de la barre de boutons. Le tableau, lui, tient dans l'ecran.
 *
 *   node scripts/netrack-largeur-fixe.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const G = join(process.cwd(), 'src/features/inventaire-netrack/components/GrillePivot.jsx');

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

const g = lire(G);

if (g.texte.includes('width: LARGEUR_MIN, minWidth')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

// Le style en ligne l'emporte sur le `width: 100%` de la feuille de style,
// sans qu'il soit besoin de toucher au CSS.
const t = remplacer(g.texte, 'largeur du tableau',
  '          style={{ minWidth: LARGEUR_MIN }}',
  '          style={{ width: LARGEUR_MIN, minWidth: LARGEUR_MIN }}');

writeFileSync(G, g.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  GrillePivot.jsx');
console.log('\nAucune feuille de style modifiee, aucun autre fichier touche.');
console.log('\nTermine.');
