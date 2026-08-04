/**
 * Retire le composeur d'axes.
 *
 * Pourquoi : deux systemes de navigation se disputaient l'ecran. Les lignes
 * de valeurs (categorie, puis sous-categorie) disent DEJA ou l'on est ; une
 * barre d'axes par-dessus permettait de contredire ce chemin — mettre le lot
 * avant le produit, ou remettre la categorie en axe alors qu'elle vient
 * d'etre choisie juste au-dessus.
 *
 * Le moteur pivot reste en place et reste parametrable : seule la commande
 * visible disparait. La hierarchie affichee est desormais fixe, Produit puis
 * Lot, en aval du filtre de nomenclature.
 *
 * A lancer APRES netrack-tableau-vide-par-defaut.mjs.
 *
 *   node scripts/netrack-retirer-axes.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PIVOT = join(process.cwd(), 'src/features/inventaire-netrack/pivot.js');
const GRILLE = join(process.cwd(), 'src/features/inventaire-netrack/components/GrillePivot.jsx');

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

function couper(texte, nom, debut, fin, remplacement) {
  const i = texte.indexOf(debut);
  if (i === -1) throw new Error('[' + nom + '] repere de debut introuvable');
  const j = texte.indexOf(fin, i);
  if (j === -1) throw new Error('[' + nom + '] repere de fin introuvable');
  return texte.slice(0, i) + remplacement + texte.slice(j);
}

/* ── 1. La hierarchie affichee devient Produit puis Lot ── */

const pivot = lire(PIVOT);

if (pivot.texte.includes("AXES_DEFAUT = ['produit', 'lot']")) {
  console.log('--  pivot.js : deja applique');
} else {
  const p = remplacer(pivot.texte, 'AXES_DEFAUT',
    "/** Configuration d'axes par defaut : l'arborescence historique. */\n"
    + "export const AXES_DEFAUT = ['categorie', 'sous_categorie', 'produit', 'lot'];",
    '/**\n'
    + " * Hierarchie affichee. Categorie et sous-categorie n'y figurent plus :\n"
    + ' * elles sont choisies en amont sur les deux lignes de valeurs, donc les\n'
    + " * remettre ici produirait un arbre a un seul noeud. Le tableau reprend a\n"
    + ' * partir de ce que ce choix laisse : les produits, puis leurs lots.\n'
    + ' *\n'
    + " * Le moteur reste parametrable (voir AXES) : c'est la commande visible qui\n"
    + ' * a ete retiree, pas la capacite.\n'
    + ' */\n'
    + "export const AXES_DEFAUT = ['produit', 'lot'];");
  ecrire(PIVOT, p, pivot.crlf);
  console.log('OK  pivot.js');
}

/* ── 2. La barre disparait de l'ecran ── */

const grille = lire(GRILLE);
let g = grille.texte;

if (!g.includes('BarreAxes')) {
  console.log('--  GrillePivot.jsx : deja applique');
} else {
  g = couper(g, 'composant BarreAxes',
    'function BarreAxes({ axes, onAxes }) {',
    'export default function GrillePivot({',
    '');

  g = remplacer(g, 'rendu BarreAxes',
    '      <BarreAxes axes={axesValides} onAxes={onAxes} />\n\n',
    '');

  // La prop devient inutile : la laisser ferait croire qu'elle agit encore.
  g = remplacer(g, 'prop onAxes',
    '  onAxes, onTrier, onBasculer, onOuvrir, onTrax,',
    '  onTrier, onBasculer, onOuvrir, onTrax,');

  // useState ne servait qu'au glisser-deposer de la barre.
  g = remplacer(g, 'import useState',
    "import { useMemo, useState } from 'react';",
    "import { useMemo } from 'react';");

  ecrire(GRILLE, g, grille.crlf);
  console.log('OK  GrillePivot.jsx');
}

console.log('\nTermine.');
