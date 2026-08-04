/**
 * Branche l'edition sur place des lignes usine.
 *
 * A lancer APRES netrack-emplacement.mjs.
 *
 *   node scripts/netrack-usine-edition.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');
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

const page = lire(PAGE);
let t = page.texte;

if (t.includes('useModifierUsine')) {
  console.log('--  InventaireNetrackPage.jsx : deja applique');
} else {
  t = remplacer(t, 'import',
    "import { useAjouterUsine, useSupprimerUsine } from './usine';",
    "import { useAjouterUsine, useModifierUsine, useSupprimerUsine } from './usine';");

  t = remplacer(t, 'mutation',
    '  const supprimerUsine = useSupprimerUsine();',
    '  const modifierUsine = useModifierUsine();\n'
    + '  const supprimerUsine = useSupprimerUsine();');

  t = remplacer(t, 'tiroir',
    '        ajouterUsine={ajouterUsine}\n',
    '        ajouterUsine={ajouterUsine}\n'
    + '        modifierUsine={modifierUsine}\n');

  ecrire(PAGE, t, page.crlf);
  console.log('OK  InventaireNetrackPage.jsx');
}

const MARQUE = '/* === Edition sur place dans le tiroir === */';

const STYLES = [
  '',
  MARQUE,
  '',
  "/* Un champ modifiable ne doit pas ressembler a un champ de formulaire : il",
  '   se lit comme une cellule, et ne revele son bord qu\'au survol ou au',
  "   focus. Sinon le tableau devient un mur de boites. */",
  '.nr-cell-edit {',
  '  width: 100%;',
  '  min-width: 0;',
  '  height: 22px;',
  '  padding: 0 4px;',
  '  border: 1px solid transparent;',
  '  border-radius: var(--r-sm);',
  '  background: transparent;',
  '  color: inherit;',
  '  font: inherit;',
  '  transition: border-color var(--t-fast) var(--ease), background var(--t-fast) var(--ease);',
  '}',
  '.nr-cell-edit:hover { border-color: rgba(255, 255, 255, .14); }',
  '.nr-cell-edit:focus {',
  '  outline: none;',
  '  border-color: var(--emerald);',
  '  background: var(--bg-base);',
  '}',
  '.nr-cell-edit[data-erreur="1"] { border-color: var(--ruby); }',
  '.nr-cell-num { text-align: right; }',
  '',
  '/* Les fleches du champ nombre volent de la largeur pour rien. */',
  '.nr-cell-edit[type="number"]::-webkit-outer-spin-button,',
  '.nr-cell-edit[type="number"]::-webkit-inner-spin-button {',
  '  -webkit-appearance: none;',
  '  margin: 0;',
  '}',
  '.nr-cell-edit[type="number"] { -moz-appearance: textfield; }',
  '',
  '@media (prefers-reduced-motion: reduce) { .nr-cell-edit { transition: none; } }',
  '',
].join('\n');

const css = lire(CSS);
if (css.texte.includes(MARQUE)) {
  console.log('--  inventaireNetrack.css : styles deja presents');
} else {
  ecrire(CSS, css.texte.trimEnd() + '\n' + STYLES, css.crlf);
  console.log('OK  inventaireNetrack.css');
}

console.log('\nTermine.');
