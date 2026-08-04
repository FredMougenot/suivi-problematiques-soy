/**
 *  1. Retrait de la puce « Grille ». Un selecteur qui ne propose qu'un seul
 *     choix n'est pas un selecteur.
 *
 *  2. L'aide de syntaxe remonte SUR LA MEME LIGNE que le champ de recherche.
 *     Elle decrit ce qu'on peut taper dedans : la placer sous la barre
 *     d'outils l'eloignait de ce qu'elle explique.
 *
 *   node scripts/netrack-aide-en-ligne.mjs
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

const AIDE = '      <div className="nr-aide">\n'
  + '        <span><b>espace</b> cumule</span>\n'
  + '        <span><b>,</b> alterne</span>\n'
  + '        <span><b>-mot</b> exclut</span>\n'
  + '        <span><b>« mot mot »</b> entre guillemets : phrase exacte</span>\n'
  + '        <span><b>champ:</b> compte, cli, trax, prod, desc, lot, sslot, cat, sc, cmd, etq</span>\n'
  + '      </div>\n'
  + '\n';

if (t.includes('nr-aide nr-aide-inline')) {
  console.log('--  InventaireNetrackPage.jsx : deja applique');
} else {
  // 1. La puce unique.
  t = remplacer(t, 'puce Grille',
    '          <div className="nr-chips" role="group" aria-label="Mode d\'affichage">\n'
    + '            <button\n'
    + '              className="nr-chip"\n'
    + "              aria-pressed={vue === 'arbre'}\n"
    + "              onClick={() => majParams({ vue: 'arbre' })}\n"
    + '              title="Regroupement libre : compose tes propres axes"\n'
    + '            >Grille</button>\n'
    + '          </div>\n'
    + '\n',
    '');

  // 2. L'aide quitte sa place actuelle...
  t = remplacer(t, 'retrait aide', AIDE, '');

  // ...et rejoint la ligne du champ de recherche.
  t = remplacer(t, 'aide en ligne',
    '          </div>\n'
    + '\n'
    + '        </div>\n'
    + '      </div>\n',
    '          </div>\n'
    + '\n'
    + '          <div className="nr-aide nr-aide-inline">\n'
    + '            <span><b>espace</b> cumule</span>\n'
    + '            <span><b>,</b> alterne</span>\n'
    + '            <span><b>-mot</b> exclut</span>\n'
    + '            <span><b>« mot mot »</b> entre guillemets : phrase exacte</span>\n'
    + '            <span><b>champ:</b> compte, cli, trax, prod, desc, lot, sslot, cat, sc, cmd, etq</span>\n'
    + '          </div>\n'
    + '\n'
    + '        </div>\n'
    + '      </div>\n');

  ecrire(PAGE, t, page.crlf);
  console.log('OK  InventaireNetrackPage.jsx');
}

const MARQUE = '/* === Aide de syntaxe sur la ligne de recherche === */';

const STYLES = [
  '',
  MARQUE,
  '',
  "/* L'aide decrit ce qu'on tape dans le champ juste a cote : elle doit se",
  "   lire d'un coup d'oeil sans casser la ligne, d'ou le retour a la ligne",
  '   autorise mais la taille reduite et la couleur attenuee. */',
  '.nr-aide-inline {',
  '  display: flex;',
  '  flex-wrap: wrap;',
  '  align-items: center;',
  '  gap: 4px 12px;',
  '  margin: 0;',
  '  font-size: 11px;',
  '  color: var(--text-muted);',
  '}',
  '.nr-aide-inline b { color: var(--text-secondary); font-weight: 600; }',
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
