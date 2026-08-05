/**
 * Le tableau ne depasse plus de l'ecran.
 *
 * ETAT CORRIGE
 * Le tableau etait en `width: 100%` \u2014 donc 100 % de son CONTENEUR, pas de la
 * fenetre. Ce conteneur s'elargit pour contenir le plus large element de la
 * page (la barre de boutons du haut, qui deborde). Le tableau heritait de
 * cette largeur et devait repartir plusieurs centaines de pixels excedentaires
 * entre ses colonnes. Avec `table-layout: fixed`, Firefox les donnait tous a
 * la colonne du libelle \u2014 la seule sans largeur imposee \u2014 qui devenait
 * enorme et repoussait les onze autres hors de l'ecran.
 *
 * TROIS CHANGEMENTS, TOUS DANS GrillePivot.jsx
 *   1. la colonne du libelle recoit une largeur (300 px) comme les autres ;
 *   2. le colgroup n'a plus de cas « pas de largeur » ;
 *   3. le tableau prend une largeur EXACTE, somme de ses colonnes, au lieu
 *      d'un pourcentage : il ne s'etire plus, quelle que soit la page.
 *
 * Le style en ligne l'emporte sur le `width: 100%` de la feuille de style :
 * aucun CSS n'est modifie, aucun autre fichier n'est touche.
 *
 * CE QUE CELA NE REGLE PAS : la page reste plus large que la fenetre a cause
 * de la barre de boutons. Le tableau, lui, tient dans l'ecran.
 *
 *   node scripts/netrack-tableau-largeur.mjs
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

if (g.texte.includes('LARGEUR_TOTALE')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

let t = g.texte;

// 1 ─ Toutes les colonnes bornees, plus aucune libre.
t = remplacer(t, 'largeurs',
  'const LARGEURS = [28, null, 110, 210, 76, 66, 105, 112, 102, 102, 92, 108];',
  '/**\n'
  + ' * Une entree par colonne, chevron compris. AUCUNE ne vaut null : une\n'
  + " * colonne libre absorbe tout l'excedent de largeur et repousse les autres\n"
  + ' * hors de l\'ecran. Le libelle est simplement la plus large.\n'
  + ' */\n'
  + 'const LARGEURS = [28, 300, 110, 210, 76, 66, 105, 112, 102, 102, 92, 108];\n'
  + '\n'
  + '/** Largeur exacte du tableau : il ne doit pas suivre celle de la page. */\n'
  + 'const LARGEUR_TOTALE = LARGEURS.reduce((s, l) => s + l, 0);');

// 2 ─ Plus de cas « pas de largeur » dans le colgroup.
t = remplacer(t, 'colgroup',
  '          <col key={i} style={l === null ? undefined : { width: l }} />',
  '          <col key={i} style={{ width: l }} />');

// 3 ─ Largeur exacte plutot que pourcentage.
t = remplacer(t, 'table',
  '        <table className="data-table nr-large nr-arbre-table">',
  '        <table\n'
  + '          className="data-table nr-large nr-arbre-table"\n'
  + '          style={{ width: LARGEUR_TOTALE, minWidth: LARGEUR_TOTALE }}\n'
  + '        >');

writeFileSync(G, g.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  GrillePivot.jsx');
console.log('\nLargeur du tableau : ' + [28, 300, 110, 210, 76, 66, 105, 112, 102, 102, 92, 108]
  .reduce((s, l) => s + l, 0) + ' px.');
console.log('Aucune feuille de style modifiee.');
console.log('\nRecharge avec Ctrl+Shift+R.');
console.log('\nTermine.');
