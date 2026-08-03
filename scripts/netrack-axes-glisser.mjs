/**
 * Corrige deux defauts de la premiere version de la grille pivot :
 *
 *   1. Retirer le DERNIER axe faisait disparaitre le parametre de l'URL, donc
 *      la page retombait sur la configuration par defaut et les champs se
 *      remettaient tout seuls. Le jeton '-' encode desormais « aucun axe » :
 *      le parametre reste present et la barre vide est un etat legitime.
 *
 *   2. La reserve de champs passe du menu deroulant au GLISSER-DEPOSER
 *      (l'essentiel est dans GrillePivot.jsx ; ici les styles).
 *
 *   node scripts/netrack-axes-glisser.mjs
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

if (page.texte.includes("a.join(',') || '-'")) {
  console.log('--  InventaireNetrackPage.jsx : deja applique');
} else {
  const t = remplacer(page.texte, 'axes vides',
    "onAxes={(a) => { setDeplies(new Set()); majParams({ axes: a.join(','), grp: '' }); }}",
    "onAxes={(a) => { setDeplies(new Set()); majParams({ axes: a.join(',') || '-', grp: '' }); }}");
  ecrire(PAGE, t, page.crlf);
  console.log('OK  InventaireNetrackPage.jsx');
}

const MARQUE = '/* === Glisser-deposer des axes === */';

const STYLES = [
  '',
  MARQUE,
  '',
  '.nr-axes { display: flex; flex-direction: column; gap: 8px; }',
  '',
  "/* Bordure pointillee : la zone se lit comme un rangement ou l'on depose,",
  '   pas comme une barre de filtres. */',
  '.nr-axes-zone {',
  '  display: flex;',
  '  flex-wrap: wrap;',
  '  align-items: center;',
  '  gap: 6px;',
  '  min-height: 42px;',
  '  padding: 8px 12px;',
  '  border: 1px dashed rgba(255, 255, 255, .18);',
  '  border-radius: var(--r-md);',
  '  backface-visibility: hidden;',
  '}',
  '.nr-axes-reserve {',
  '  display: flex;',
  '  flex-wrap: wrap;',
  '  align-items: center;',
  '  gap: 6px;',
  '  padding: 0 12px 4px;',
  '}',
  '.nr-axe, .nr-champ {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 2px;',
  '  padding: 3px 6px;',
  '  border-radius: var(--r-sm);',
  '  font-size: 13px;',
  '  cursor: grab;',
  '  user-select: none;',
  '}',
  '.nr-axe {',
  '  border: 1px solid var(--copper-dim);',
  '  background: var(--bg-hover);',
  '  color: var(--text-primary);',
  '}',
  '.nr-champ {',
  '  border: 1px solid rgba(255, 255, 255, .12);',
  '  color: var(--text-secondary);',
  '}',
  '.nr-champ:hover { border-color: var(--copper-dim); color: var(--text-primary); }',
  '.nr-axe:active, .nr-champ:active { cursor: grabbing; }',
  '.nr-axe[aria-grabbed="true"] { opacity: .35; }',
  '.nr-axe-poignee { color: var(--text-muted); font-size: 12px; padding-right: 2px; }',
  '.nr-axe-l { padding: 0 2px; }',
  '.nr-axe-x {',
  '  border: 0;',
  '  background: none;',
  '  cursor: pointer;',
  '  padding: 0 2px;',
  '  line-height: 1;',
  '  font-size: 12px;',
  '  color: var(--text-muted);',
  '}',
  '.nr-axe-x:hover { color: var(--copper-light); }',
  '',
  "/* Trait d'insertion : montre ou la pastille va tomber. */",
  '.nr-axe-marque {',
  '  display: inline-block;',
  '  width: 2px;',
  '  height: 22px;',
  '  margin: 0 2px;',
  '  background: var(--copper);',
  '  border-radius: 1px;',
  '}',
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
