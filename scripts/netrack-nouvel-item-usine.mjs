/**
 * Bouton « + Item usine » : ajouter un item pour un produit qui n'est PAS
 * dans la liste affichee.
 *
 *  - TiroirLot cesse de definir le formulaire et importe le fichier partage ;
 *  - la page gagne un bouton, un parametre d'URL `neuf`, et le tiroir de
 *    creation.
 *
 * A lancer APRES netrack-tiroir-glissant.mjs.
 *
 *   node scripts/netrack-nouvel-item-usine.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');
const TIROIR = join(process.cwd(), 'src/features/inventaire-netrack/components/TiroirLot.jsx');
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

function couper(texte, nom, debut, fin, remplacement) {
  const i = texte.indexOf(debut);
  if (i === -1) throw new Error('[' + nom + '] repere de debut introuvable');
  const j = texte.indexOf(fin, i);
  if (j === -1) throw new Error('[' + nom + '] repere de fin introuvable');
  return texte.slice(0, i) + remplacement + texte.slice(j);
}

/* ── 1. Le formulaire quitte TiroirLot ── */

const tiroir = lire(TIROIR);

if (tiroir.texte.includes("from './FormulaireUsine'")) {
  console.log('--  TiroirLot.jsx : deja applique');
} else {
  let t = tiroir.texte;

  // La definition locale et sa constante VIDE partent dans le fichier partage.
  t = couper(t, 'const VIDE',
    'const VIDE = {',
    "/** Cellule modifiable a la sortie du champ. Echap annule. */",
    '');

  t = couper(t, 'FormulaireUsine',
    'function FormulaireUsine({ noProduit, ajouter }) {',
    '/** Doit rester synchronise avec la duree de nr-tiroir-sortie en CSS. */',
    '');

  t = remplacer(t, 'import',
    "import { ChampTrax } from './ChampTrax';",
    "import { ChampTrax } from './ChampTrax';\n"
    + "import FormulaireUsine from './FormulaireUsine';");

  ecrire(TIROIR, t, tiroir.crlf);
  console.log('OK  TiroirLot.jsx');
}

/* ── 2. La page ── */

const page = lire(PAGE);

if (page.texte.includes('TiroirNouvelUsine')) {
  console.log('--  InventaireNetrackPage.jsx : deja applique');
} else {
  let t = page.texte;

  t = remplacer(t, 'import',
    "import TiroirLot from './components/TiroirLot';",
    "import TiroirLot from './components/TiroirLot';\n"
    + "import TiroirNouvelUsine from './components/TiroirNouvelUsine';");

  t = remplacer(t, 'parametre',
    "  const emplacement = params.get('emp') || '';",
    "  const emplacement = params.get('emp') || '';\n"
    + "  // Tiroir de creation : il ne depend d'aucun groupe affiche, c'est tout\n"
    + "  // son interet — le produit cherche est justement absent de la liste.\n"
    + "  const nouvelUsine = params.get('neuf') === '1';");

  t = remplacer(t, 'bouton',
    '            ))}\n'
    + '          </div>\n',
    '            ))}\n'
    + '          </div>\n'
    + '\n'
    + '          <button\n'
    + '            className="btn btn-secondary"\n'
    + "            onClick={() => majParams({ neuf: '1', grp: '' })}\n"
    + '            title="Saisir un item usine pour un produit absent de la liste"\n'
    + '          >+ Item usine</button>\n');

  t = remplacer(t, 'tiroir de creation',
    '      <TiroirLot',
    '      <TiroirNouvelUsine\n'
    + '        ouvert={nouvelUsine}\n'
    + "        onFermer={() => majParams({ neuf: '' })}\n"
    + '        ajouter={ajouterUsine}\n'
    + '      />\n'
    + '\n'
    + '      <TiroirLot');

  ecrire(PAGE, t, page.crlf);
  console.log('OK  InventaireNetrackPage.jsx');
}

/* ── 3. Styles du selecteur de produit ── */

const MARQUE = '/* === Recherche de produit du tiroir de creation === */';

const STYLES = [
  '',
  MARQUE,
  '',
  '.nr-usine-recherche { display: flex; flex-direction: column; gap: 8px; }',
  '.nr-usine-champ {',
  '  height: 34px;',
  '  padding: 0 10px;',
  '  border: 1px solid rgba(255, 255, 255, .14);',
  '  border-radius: var(--r-sm);',
  '  background: var(--bg-base);',
  '  color: var(--text-primary);',
  '  font-size: 14px;',
  '}',
  '.nr-usine-champ:focus { outline: none; border-color: var(--emerald); }',
  '',
  '.nr-usine-resultats {',
  '  list-style: none;',
  '  margin: 0;',
  '  padding: 0;',
  '  max-height: 280px;',
  '  overflow: auto;',
  '  border: 1px solid rgba(255, 255, 255, .10);',
  '  border-radius: var(--r-sm);',
  '}',
  '.nr-usine-resultats button {',
  '  display: flex;',
  '  gap: 10px;',
  '  align-items: baseline;',
  '  width: 100%;',
  '  padding: 6px 10px;',
  '  border: 0;',
  '  background: none;',
  '  color: var(--text-primary);',
  '  font-size: 13px;',
  '  text-align: left;',
  '  cursor: pointer;',
  '}',
  '.nr-usine-resultats button:hover { background: var(--bg-hover); }',
  '.nr-usine-resultats .nr-mono { flex: none; min-width: 110px; }',
  '',
].join('\n');

const css = lire(CSS);
if (css.texte.includes(MARQUE)) {
  console.log('--  inventaireNetrack.css : styles deja presents');
} else {
  ecrire(CSS, css.texte.trimEnd() + '\n' + STYLES, css.crlf);
  console.log('OK  inventaireNetrack.css');
}

console.log('\nPense a recharger avec Ctrl+Shift+R.');
console.log('\nTermine.');
