/**
 * Le tableau ne depend plus de la presence d'une categorie.
 *
 * Les pastilles d'exceptions EFFACENT le parametre `cat` — c'est leur
 * logique : une exception se regarde sur tout le releve. Or la construction
 * du tableau etait conditionnee a `categorie !== ''`, donc cliquer
 * « 107 expire » cochait la pastille et vidait l'ecran.
 *
 * La condition venait de l'epoque ou l'absence de categorie signifiait
 * « rien demande ». Depuis la bascule automatique vers TOUTES, cet etat
 * n'existe plus : la seule chose qu'elle produisait encore, c'etait ce bug.
 *
 *   node scripts/netrack-pivot-sans-condition.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');
const GRILLE = join(process.cwd(), 'src/features/inventaire-netrack/components/GrillePivot.jsx');

function lire(chemin) {
  if (!existsSync(chemin)) throw new Error('Fichier introuvable : ' + chemin);
  const brut = readFileSync(chemin, 'utf8');
  return { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n') };
}

function ecrire(chemin, texte, crlf) {
  writeFileSync(chemin, crlf ? texte.replace(/\n/g, '\r\n') : texte, 'utf8');
}

function couper(texte, nom, debut, fin, remplacement) {
  const i = texte.indexOf(debut);
  if (i === -1) throw new Error('[' + nom + '] repere de debut introuvable');
  const j = texte.indexOf(fin, i);
  if (j === -1) throw new Error('[' + nom + '] repere de fin introuvable');
  return texte.slice(0, i) + remplacement + texte.slice(j);
}

/* ── 1. La grille se construit des que la vue est active ── */

const page = lire(PAGE);

if (page.texte.includes("vue === 'arbre' && categorie !== ''")) {
  const t = couper(page.texte, 'pivot',
    '  const pivot = useMemo(',
    '  const totaux = useMemo(',
    '  const pivot = useMemo(\n'
    + "    () => (vue === 'arbre'\n"
    + '      ? construirePivot(filtrees, axes, tri, rangsNomenclature)\n'
    + '      : []),\n'
    + '    [vue, filtrees, axes, tri, rangsNomenclature],\n'
    + '  );\n'
    + '\n');
  ecrire(PAGE, t, page.crlf);
  console.log('OK  InventaireNetrackPage.jsx');
} else {
  console.log('--  InventaireNetrackPage.jsx : deja applique');
}

/* ── 2. Le message d'invitation n'a plus de sens ── */

const grille = lire(GRILLE);

if (grille.texte.includes('Choisis une cat')) {
  const g = couper(grille.texte, 'message',
    '      {axesValides.length === 0 ? null : !pivot.length ? (',
    '      ) : (',
    '      {axesValides.length === 0 || !pivot.length ? null : (\n');
  ecrire(GRILLE, g.replace('      ) : (\n', ''), grille.crlf);
  console.log('OK  GrillePivot.jsx');
} else {
  console.log('--  GrillePivot.jsx : deja applique');
}

console.log('\nTermine.');
