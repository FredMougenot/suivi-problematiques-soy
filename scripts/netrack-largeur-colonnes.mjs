/**
 * Corrige le debordement horizontal du tableau sous Firefox.
 *
 * Onze colonnes sur douze avaient une largeur fixe ; celle du libelle etait
 * laissee libre. Avec `table-layout: fixed`, Chrome lui donne l'espace
 * restant, mais Firefox la laisse absorber tout l'excedent : les onze autres
 * colonnes se retrouvaient poussees hors de l'ecran, et la page entiere
 * gagnait une barre de defilement horizontale.
 *
 * Deux mesures :
 *   - la colonne du libelle recoit une largeur, comme les autres ;
 *   - le tableau recoit une largeur minimale egale a la somme des colonnes,
 *     pour que le defilement se fasse DANS la coquille (qui est deja en
 *     overflow: auto) plutot qu'a l'echelle de la page.
 *
 * Effet de bord bienvenu : plus de defilement horizontal de page, donc plus
 * de risque que le navigateur fasse coulisser l'ecran pour amener un champ
 * focalise dans le champ de vision.
 *
 *   node scripts/netrack-largeur-colonnes.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const G = join(process.cwd(), 'src/features/inventaire-netrack/components/GrillePivot.jsx');
const CSS = join(process.cwd(), 'src/features/inventaire-netrack/inventaireNetrack.css');

function lire(chemin) {
  if (!existsSync(chemin)) throw new Error('Fichier introuvable : ' + chemin);
  const brut = readFileSync(chemin, 'utf8');
  return { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n') };
}

function ecrire(chemin, texte, crlf) {
  writeFileSync(chemin, crlf ? texte.replace(/\n/g, '\r\n') : texte, 'utf8');
}

function remplacer(texte, nom, avant, apres) {
  const n = texte.split(avant).length - 1;
  if (n !== 1) throw new Error('[' + nom + '] motif trouve ' + n + ' fois, attendu 1');
  return texte.replace(avant, apres);
}

const g = lire(G);

if (g.texte.includes('LARGEUR_MIN')) {
  console.log('--  GrillePivot.jsx : deja applique');
} else {
  let t = remplacer(g.texte, 'largeurs',
    'const LARGEURS = [28, null, 110, 210, 76, 66, 105, 112, 102, 102, 92, 108];',
    "/**\n"
    + ' * Une entree par colonne, chevron compris. AUCUNE ne vaut null : une\n'
    + ' * colonne libre absorbe tout l\'excedent sous Firefox et repousse les\n'
    + " * autres hors de l'ecran. Le libelle est simplement la plus large.\n"
    + ' */\n'
    + 'const LARGEURS = [28, 300, 110, 210, 76, 66, 105, 112, 102, 102, 92, 108];\n'
    + '\n'
    + "/** Somme des colonnes : en deca, c'est la coquille qui defile. */\n"
    + 'const LARGEUR_MIN = LARGEURS.reduce((s, l) => s + l, 0);');

  t = remplacer(t, 'colgroup',
    '        {LARGEURS.map((l, i) => (\n'
    + '          <col key={i} style={l === null ? undefined : { width: l }} />\n'
    + '        ))}',
    '        {LARGEURS.map((l, i) => (\n'
    + '          <col key={i} style={{ width: l }} />\n'
    + '        ))}');

  t = remplacer(t, 'table',
    '        <table className="data-table nr-large nr-arbre-table">',
    '        <table\n'
    + '          className="data-table nr-large nr-arbre-table"\n'
    + '          style={{ minWidth: LARGEUR_MIN }}\n'
    + '        >');

  ecrire(G, t, g.crlf);
  console.log('OK  GrillePivot.jsx');
}

const MARQUE = '/* === Debordement horizontal contenu dans la coquille === */';

const STYLES = [
  '',
  MARQUE,
  '',
  "/* Le defilement horizontal appartient au tableau, pas a la page : sinon",
  '   les colonnes sortent de la fenetre et le navigateur fait coulisser tout',
  "   l'ecran des qu'un champ prend le focus. */",
  '.nr-virt { overflow: auto; }',
  '.view-body { overflow-x: hidden; }',
  '',
].join('\n');

const css = lire(CSS);
if (css.texte.includes(MARQUE)) {
  console.log('--  inventaireNetrack.css : styles deja presents');
} else {
  ecrire(CSS, css.texte.trimEnd() + '\n' + STYLES, css.crlf);
  console.log('OK  inventaireNetrack.css');
}

console.log('\nPense a recharger avec Ctrl+Shift+R, sous Firefox ET sous Chrome.');
console.log('\nTermine.');
