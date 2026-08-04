/**
 * Ajoute les DEUX LIGNES DE VALEURS sous le composeur d'axes :
 *   ligne 1 = les categories presentes, ligne 2 = les sous-categories de
 *   celle qui est choisie.
 *
 * C'est un FILTRE (ce qu'on regarde), a ne pas confondre avec les axes
 * (comment c'est regroupe).
 *
 * A lancer APRES netrack-axes-glisser.mjs.
 *
 *   node scripts/netrack-filtre-nomenclature.mjs
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

if (t.includes('FiltreNomenclature')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

// 1 ─ Import.
t = remplacer(t, 'import',
  "import GrillePivot from './components/GrillePivot';",
  "import GrillePivot from './components/GrillePivot';\n"
  + "import FiltreNomenclature from './components/FiltreNomenclature';");

// 2 ─ La sous-categorie choisie vit dans l'URL comme le reste de l'ecran.
t = remplacer(t, 'param sc',
  "  const groupeOuvert = params.get('grp') || '';",
  "  const groupeOuvert = params.get('grp') || '';\n"
  + "  const sousCategorie = params.get('sc') || '';");

// 3 ─ Le filtre s'applique APRES filtrerEtTrier plutot que dedans : la
//     signature partagee avec les autres vues reste intacte, et le tri deja
//     applique n'est pas perturbe par un simple retrait de lignes.
t = remplacer(t, 'filtrees',
  '  const filtrees = useMemo(\n'
  + '    () => filtrerEtTrier(lignes, { client, recherche, categorie, stock, expiration }, tri),\n'
  + '    [lignes, client, recherche, categorie, stock, expiration, tri],\n'
  + '  );',
  '  const filtrees = useMemo(\n'
  + '    () => {\n'
  + '      const base = filtrerEtTrier(\n'
  + '        lignes, { client, recherche, categorie, stock, expiration }, tri,\n'
  + '      );\n'
  + '      if (!sousCategorie) return base;\n'
  + "      const sans = sousCategorie === '(sans sous-catégorie)';\n"
  + '      return base.filter((l) => (sans ? !l.sous_categorie : l.sous_categorie === sousCategorie));\n'
  + '    },\n'
  + '    [lignes, client, recherche, categorie, stock, expiration, sousCategorie, tri],\n'
  + '  );');

// 4 ─ Rendu, juste avant la coquille du tableau.
t = remplacer(t, 'rendu',
  '      <div\n'
  + "        className={'table-shell dt-glow nr-scroll'",
  '      {vue === \'arbre\' && (\n'
  + '        <FiltreNomenclature\n'
  + '          lignes={lignes}\n'
  + '          categorie={categorie}\n'
  + '          sousCategorie={sousCategorie}\n'
  + "          onCategorie={(v) => majParams({ cat: v, grp: '' })}\n"
  + "          onSousCategorie={(v) => majParams({ sc: v, grp: '' })}\n"
  + '        />\n'
  + '      )}\n'
  + '\n'
  + '      <div\n'
  + "        className={'table-shell dt-glow nr-scroll'");

ecrire(PAGE, t, page.crlf);
console.log('OK  InventaireNetrackPage.jsx');

const MARQUE = '/* === Deux lignes de valeurs : categorie puis sous-categorie === */';

const STYLES = [
  '',
  MARQUE,
  '',
  '.nr-nomen {',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 6px;',
  '  margin-bottom: 12px;',
  '}',
  '.nr-nomen-ligne {',
  '  display: flex;',
  '  flex-wrap: wrap;',
  '  align-items: center;',
  '  gap: 6px;',
  '}',
  '',
  "/* La 2e ligne se lit comme une consequence de la 1re, d'ou le retrait et",
  '   le liseré qui la rattache visuellement au choix du dessus. */',
  '.nr-nomen-sous {',
  '  margin-left: 14px;',
  '  padding-left: 12px;',
  '  border-left: 2px solid var(--copper-dim);',
  '}',
  '.nr-nomen-lbl {',
  '  font-size: 10px;',
  '  letter-spacing: .16em;',
  '  text-transform: uppercase;',
  '  color: var(--text-muted);',
  '  min-width: 96px;',
  '}',
  '',
  '.nr-val {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 7px;',
  '  height: 27px;',
  '  padding: 0 10px;',
  '  border: 1px solid rgba(255, 255, 255, .10);',
  '  border-radius: 999px;',
  '  background: transparent;',
  '  color: var(--text-secondary);',
  '  font-size: 12.5px;',
  '  line-height: 1;',
  '  cursor: pointer;',
  '  white-space: nowrap;',
  '  transition: border-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease),',
  '    background var(--t-fast) var(--ease);',
  '}',
  '.nr-val:hover { border-color: var(--copper-dim); color: var(--text-primary); }',
  '.nr-val[aria-pressed="true"] {',
  '  border-color: var(--copper);',
  '  background: var(--bg-raised);',
  '  color: var(--text-primary);',
  '}',
  '',
  "/* Le compte : sans lui on clique a l'aveugle. Discret mais toujours la. */",
  '.nr-val-n {',
  '  font-size: 11px;',
  '  font-variant-numeric: tabular-nums;',
  '  color: var(--text-faint);',
  '}',
  '.nr-val[aria-pressed="true"] .nr-val-n { color: var(--copper-light); }',
  '',
  "/* Un trou de referentiel ne se deguise pas en categorie ordinaire. */",
  '.nr-val[data-vide="1"] { font-style: italic; border-style: dashed; }',
  '',
  '@media (prefers-reduced-motion: reduce) { .nr-val { transition: none; } }',
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
