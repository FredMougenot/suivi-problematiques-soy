/**
 * Branche l'emplacement sur l'ecran :
 *   - deux pastilles « GH-entreposage » / « Usine » a cote de EO et PBC ;
 *   - le filtre correspondant ;
 *   - le formulaire de saisie usine dans le tiroir.
 *
 * L'emplacement est un PERIMETRE, comme le compte : il n'est donc PAS balaye
 * par une recherche texte ni par une pastille d'exception. On cherche « ce
 * qui expire chez GH » ou « ce qui expire a l'usine », pas les deux melanges
 * sans le vouloir.
 *
 *   node scripts/netrack-emplacement.mjs
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

if (t.includes('EMPLACEMENTS')) {
  console.log('--  InventaireNetrackPage.jsx : deja applique');
} else {
  // 1 ─ Import des mutations d'ecriture.
  t = remplacer(t, 'import usine',
    "import TiroirLot from './components/TiroirLot';",
    "import TiroirLot from './components/TiroirLot';\n"
    + "import { useAjouterUsine, useSupprimerUsine } from './usine';");

  // 2 ─ La liste des emplacements, a cote du composant de page.
  t = remplacer(t, 'constante',
    "const NIVEAUX_EXPIRATION = new Set(['expire', 'critique', 'proche', 'surveille']);",
    "const NIVEAUX_EXPIRATION = new Set(['expire', 'critique', 'proche', 'surveille']);\n"
    + '\n'
    + "/** Les deux seuls lieux ou la marchandise peut se trouver. A ne pas\n"
    + " *  confondre avec le COMPTE (EO / PBC) ni avec le CLIENT final. */\n"
    + "const EMPLACEMENTS = ['GH-entreposage', 'Usine'];");

  // 3 ─ Parametre d'URL.
  t = remplacer(t, 'param emp',
    "  const sousCategorie = params.get('sc') || '';",
    "  const sousCategorie = params.get('sc') || '';\n"
    + "  const emplacement = params.get('emp') || '';");

  // 4 ─ Les mutations.
  t = remplacer(t, 'mutations',
    '  const refScroll = useRef(null);',
    '  const ajouterUsine = useAjouterUsine();\n'
    + '  const supprimerUsine = useSupprimerUsine();\n'
    + '  const refScroll = useRef(null);');

  // 5 ─ Le filtre. Perimetre, donc applique meme sous recherche ou pastille.
  t = remplacer(t, 'filtre emplacement',
    '      if (porteeGlobale || !sousCategorie) return base;',
    "      // Perimetre : il tient meme sous recherche ou pastille d'exception.\n"
    + '      if (emplacement) base = base.filter((l) => l.emplacement === emplacement);\n'
    + '      if (porteeGlobale || !sousCategorie) return base;');

  t = remplacer(t, 'dependances',
    '    [lignes, client, recherche, categorie, stock, expiration, sousCategorie, tri],',
    '    [lignes, client, recherche, categorie, stock, expiration,\n'
    + '      sousCategorie, emplacement, tri],');

  // 6 ─ Les pastilles, juste apres celles du compte.
  t = remplacer(t, 'pastilles emplacement',
    '              title="Lignes sans client attribué"\n'
    + '            >Sans client</button>\n'
    + '          </div>\n',
    '              title="Lignes sans client attribué"\n'
    + '            >Sans client</button>\n'
    + '          </div>\n'
    + '\n'
    + '          <div className="nr-chips" role="group" aria-label="Filtrer par emplacement">\n'
    + '            <button\n'
    + '              className="nr-chip"\n'
    + "              aria-pressed={emplacement === ''}\n"
    + "              onClick={() => majParams({ emp: '', grp: '' })}\n"
    + '            >Partout</button>\n'
    + '            {EMPLACEMENTS.map((e) => (\n'
    + '              <button\n'
    + '                key={e}\n'
    + '                className="nr-chip"\n'
    + '                data-emplacement={e}\n'
    + '                aria-pressed={emplacement === e}\n'
    + "                onClick={() => majParams({ emp: emplacement === e ? '' : e, grp: '' })}\n"
    + '              >{e}</button>\n'
    + '            ))}\n'
    + '          </div>\n');

  // 7 ─ Le tiroir recoit de quoi ecrire.
  t = remplacer(t, 'tiroir',
    '        onEnregistrerTrax={sauverTrax}\n'
    + '      />',
    '        onEnregistrerTrax={sauverTrax}\n'
    + '        ajouterUsine={ajouterUsine}\n'
    + '        supprimerUsine={supprimerUsine}\n'
    + '      />');

  ecrire(PAGE, t, page.crlf);
  console.log('OK  InventaireNetrackPage.jsx');
}

const MARQUE = '/* === Emplacement et saisie usine === */';

const STYLES = [
  '',
  MARQUE,
  '',
  "/* L'emplacement Usine se distingue du stock entrepose : c'est la seule",
  '   donnee de cet ecran qui vient de nous et non du releve. */',
  '.nr-chip[data-emplacement="Usine"][aria-pressed="true"],',
  '.nr-empl[data-usine="1"] {',
  '  color: var(--emerald);',
  '}',
  '.nr-empl {',
  '  font-size: 11px;',
  '  letter-spacing: .04em;',
  '  color: var(--text-muted);',
  '  white-space: nowrap;',
  '}',
  '',
  '.nr-usine-ouvrir { align-self: flex-start; }',
  '',
  '.nr-usine-form {',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 10px;',
  '  padding: 12px;',
  '  border: 1px solid var(--emerald);',
  '  border-radius: var(--r-md);',
  '  background: var(--emerald-bg);',
  '  backface-visibility: hidden;',
  '}',
  '.nr-usine-grille {',
  '  display: grid;',
  '  grid-template-columns: 1fr 1fr;',
  '  gap: 8px 12px;',
  '}',
  '.nr-usine-grille label {',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 3px;',
  '}',
  '.nr-usine-grille label > span {',
  '  font-size: 10px;',
  '  letter-spacing: .12em;',
  '  text-transform: uppercase;',
  '  color: var(--text-muted);',
  '}',
  '.nr-usine-grille input {',
  '  height: 30px;',
  '  padding: 0 8px;',
  '  border: 1px solid rgba(255, 255, 255, .14);',
  '  border-radius: var(--r-sm);',
  '  background: var(--bg-base);',
  '  color: var(--text-primary);',
  '  font-size: 13px;',
  '}',
  '.nr-usine-grille input:focus {',
  '  outline: none;',
  '  border-color: var(--emerald);',
  '}',
  '.nr-usine-large { grid-column: 1 / -1; }',
  '.nr-usine-actions { display: flex; gap: 8px; }',
  '.nr-usine-erreur { color: var(--ruby); font-size: 12px; }',
  '',
  '.nr-usine-suppr {',
  '  border: 0;',
  '  background: none;',
  '  cursor: pointer;',
  '  padding: 0 4px;',
  '  font-size: 12px;',
  '  color: var(--text-muted);',
  '}',
  '.nr-usine-suppr:hover { color: var(--ruby); }',
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
