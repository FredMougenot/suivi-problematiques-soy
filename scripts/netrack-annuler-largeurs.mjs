/**
 * ANNULE uniquement les modifications de largeur faites pour Firefox.
 *
 * Remet GrillePivot.jsx dans l'etat ou il etait AVANT les scripts
 * netrack-largeur-colonnes / netrack-largeur-fixe / netrack-tableau-largeur /
 * netrack-fenetre.
 *
 * NE PAS utiliser `git checkout` sur ce fichier : la derniere version
 * COMMITEE contient encore la barre d'axes, dont le retrait n'a jamais ete
 * commite. Un checkout ferait donc revenir les axes.
 *
 * Ce script ne touche QUE : le tableau des largeurs, le colgroup et le style
 * du <table>. Rien d'autre.
 *
 *   node scripts/netrack-annuler-largeurs.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const G = join(process.cwd(), 'src/features/inventaire-netrack/components/GrillePivot.jsx');

function lire(chemin) {
  if (!existsSync(chemin)) throw new Error('Fichier introuvable : ' + chemin);
  const brut = readFileSync(chemin, 'utf8');
  return { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n') };
}

const g = lire(G);
let t = g.texte;
let fait = 0;

const ORIGINE = 'const LARGEURS = [28, null, 110, 210, 76, 66, 105, 112, 102, 102, 92, 108];';

// 1 ─ Le tableau des largeurs, quelle que soit la variante en place.
const variantes = [
  /\/\*\*\n \* Une entree par colonne[\s\S]*?\nconst LARGEURS = \[[^\]]*\];\n\n\/\*\*[^*]*\*\/\nconst LARGEUR_(?:MIN|TOTALE) = LARGEURS\.reduce\(\(s, l\) => s \+ l, 0\);/,
  /const PROPORTIONS = \[[\s\S]*?\];\n\n\/\*\*[\s\S]*?\*\/\nconst LARGEUR_PLANCHER = 900;/,
  /\/\*\*\n \* Une entree par colonne[\s\S]*?\nconst LARGEURS = \[[^\]]*\];/,
  /const LARGEURS = \[[^\]]*\];/,
];

for (const re of variantes) {
  if (re.test(t)) { t = t.replace(re, ORIGINE); fait += 1; break; }
}

// 2 ─ Le colgroup, quelle que soit son indentation.
t = t.replace(
  /\{(?:LARGEURS|largeurs)\.map\(\(l, i\) => \(\n(\s*)<col key=\{i\} style=\{\{ width: l \}\} \/>/,
  (m, ind) => '{LARGEURS.map((l, i) => (\n' + ind
    + '<col key={i} style={l === null ? undefined : { width: l }} />',
);
if (t.includes('l === null ? undefined')) fait += 1;

// 3 ─ Le <table> retrouve sa forme d'origine, sans style en ligne.
t = t.replace(
  /<table\n\s*className="data-table nr-large nr-arbre-table"\n\s*style=\{\{[^}]*\}\}\n\s*>/,
  '<table className="data-table nr-large nr-arbre-table">',
);
if (!t.includes('style={{ width: dispo') && !t.includes('LARGEUR_TOTALE')) fait += 1;

// 4 ─ Le bloc de mesure de la fenetre, s'il a ete pose.
t = t.replace(
  /  \/\*\*\n   \* Largeur reellement disponible[\s\S]*?\n  \);\n\n(?=  const lignes = useMemo)/,
  '',
);

// 5 ─ Les imports reviennent au strict necessaire.
t = t.replace(
  "import { useEffect, useMemo, useState } from 'react';",
  "import { useMemo } from 'react';",
);

if (t === g.texte) {
  console.log('Aucune modification de largeur trouvee. Fichier deja d\'origine.');
  process.exit(0);
}

writeFileSync(G, g.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  GrillePivot.jsx remis dans son etat d\'avant les correctifs Firefox.');
console.log('\nVerifie ensuite que la page charge et que la barre d\'axes est');
console.log('toujours absente :');
console.log("  node -e \"const s=require('fs').readFileSync('src/features/inventaire-netrack/components/GrillePivot.jsx','utf8');console.log('BarreAxes present:', s.includes('BarreAxes'))\"");
console.log('\nTermine.');
