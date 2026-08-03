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

const MARQUE = "/* === Composeur d'axes de la grille pivot === */";

const STYLES = [
  '',
  MARQUE,
  '',
  '/* Le composeur se lit comme un CHEMIN, pas comme une barre de filtres :',
  '   chaque pastille porte son RANG, et le rang EST la hierarchie. Compteur',
  '   CSS plutot que numero code dans le JSX \u2014 il se renumerote seul a chaque',
  '   deplacement. */',
  '',
  '.nr-axes {',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 10px;',
  '  margin-bottom: 14px;',
  '}',
  '',
  '.nr-axes-zone {',
  '  counter-reset: axe;',
  '  display: flex;',
  '  flex-wrap: wrap;',
  '  align-items: center;',
  '  gap: 8px;',
  '  min-height: 52px;',
  '  padding: 10px 16px;',
  '  border: 1px dashed rgba(255, 255, 255, .16);',
  '  border-radius: 14px;',
  '  background: rgba(255, 255, 255, .02);',
  '  transition: border-color var(--t-base) var(--ease);',
  '  backface-visibility: hidden;',
  '}',
  '.nr-axes-zone:hover { border-color: var(--copper-dim); }',
  '',
  '/* Intitules de section : discrets, en petites capitales espacees. */',
  '.nr-axes-zone > .nr-faible:first-child,',
  '.nr-axes-reserve > .nr-faible:first-child {',
  '  font-size: 10px;',
  '  letter-spacing: .16em;',
  '  text-transform: uppercase;',
  '  color: var(--text-muted);',
  '  padding-right: 4px;',
  '}',
  '',
  '.nr-axes-reserve {',
  '  display: flex;',
  '  flex-wrap: wrap;',
  '  align-items: center;',
  '  gap: 8px;',
  '  padding: 0 16px;',
  '}',
  '',
  '/* ── Pastille posee ── */',
  '.nr-axe {',
  '  position: relative;',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 6px;',
  '  height: 32px;',
  '  padding: 0 8px 0 6px;',
  '  border: 1px solid var(--copper-dim);',
  '  border-radius: 999px;',
  '  background: var(--bg-raised);',
  '  color: var(--text-primary);',
  '  font-size: 13px;',
  '  line-height: 1;',
  '  cursor: grab;',
  '  user-select: none;',
  '  transition: border-color var(--t-fast) var(--ease),',
  '    box-shadow var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);',
  '  backface-visibility: hidden;',
  '}',
  '.nr-axe:hover {',
  '  border-color: var(--copper);',
  '  box-shadow: 0 0 0 3px var(--copper-glow);',
  '  transform: translateY(-1px);',
  '}',
  '.nr-axe:active { cursor: grabbing; transform: none; }',
  '.nr-axe[aria-grabbed="true"] { opacity: .3; box-shadow: none; }',
  '',
  "/* Le rang en pastille pleine : c'est lui qui dit que l'ordre compte. */",
  '.nr-axe::before {',
  '  counter-increment: axe;',
  '  content: counter(axe);',
  '  display: inline-flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  width: 20px;',
  '  height: 20px;',
  '  border-radius: 50%;',
  '  background: var(--copper);',
  '  color: var(--bg-void);',
  '  font-size: 11px;',
  '  font-weight: 600;',
  '  font-variant-numeric: tabular-nums;',
  '}',
  '',
  '/* La poignee du JSX ne sert plus : le rang la remplace. */',
  '.nr-axe-poignee { display: none; }',
  '.nr-axe-l { padding: 0; white-space: nowrap; }',
  '',
  '.nr-axe-x {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  width: 18px;',
  '  height: 18px;',
  '  border: 0;',
  '  border-radius: 50%;',
  '  background: none;',
  '  cursor: pointer;',
  '  padding: 0;',
  '  font-size: 11px;',
  '  color: var(--text-muted);',
  '  transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);',
  '}',
  '.nr-axe-x:hover { background: var(--ruby-bg); color: var(--ruby); }',
  '',
  '/* ── Champ en reserve ── disponible, donc plus sobre que ce qui est pose. */',
  '.nr-champ {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 6px;',
  '  height: 28px;',
  '  padding: 0 12px;',
  '  border: 1px solid rgba(255, 255, 255, .10);',
  '  border-radius: 999px;',
  '  background: transparent;',
  '  color: var(--text-secondary);',
  '  font-size: 12.5px;',
  '  line-height: 1;',
  '  cursor: grab;',
  '  user-select: none;',
  '  transition: border-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease),',
  '    background var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);',
  '}',
  "/* Le point s'allume au survol : la pastille se sait attrapable. */",
  '.nr-champ::before {',
  '  content: "";',
  '  width: 5px;',
  '  height: 5px;',
  '  border-radius: 50%;',
  '  background: var(--text-faint);',
  '  transition: background var(--t-fast) var(--ease);',
  '}',
  '.nr-champ:hover {',
  '  border-color: var(--copper-dim);',
  '  color: var(--text-primary);',
  '  background: var(--bg-hover);',
  '  transform: translateY(-1px);',
  '}',
  '.nr-champ:hover::before { background: var(--copper); }',
  '.nr-champ:active { cursor: grabbing; transform: none; }',
  '',
  "/* ── Trait d'insertion ── montre ou la pastille va tomber. */",
  '.nr-axe-marque {',
  '  display: inline-block;',
  '  width: 3px;',
  '  height: 26px;',
  '  margin: 0 1px;',
  '  border-radius: 2px;',
  '  background: var(--copper);',
  '  box-shadow: 0 0 8px var(--copper-glow);',
  '  animation: nr-pulse 1s ease-in-out infinite;',
  '}',
  '@keyframes nr-pulse { 50% { opacity: .45; } }',
  '',
  '@media (prefers-reduced-motion: reduce) {',
  '  .nr-axe, .nr-champ, .nr-axes-zone, .nr-axe-x { transition: none; }',
  '  .nr-axe-marque { animation: none; }',
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
