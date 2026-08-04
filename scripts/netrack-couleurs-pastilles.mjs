/**
 * Ramene l'echelle de couleurs de la legende DANS les pastilles.
 *
 * La legende utilisait --nr-expire / critique / proche / surveille. Les
 * pastilles, elles, coloraient le nombre en --ruby et --amber, et rien
 * n'etait prevu pour « 8 a 30 jours » ni « 31 a 90 jours ». Deux palettes
 * pour la meme information, et deux niveaux sans couleur du tout.
 *
 * Les quatre pastilles portent desormais un point de la couleur exacte du
 * niveau, plus le nombre dans cette meme couleur. C'est ce qui permet de se
 * passer de la legende : la correspondance couleur/libelle se lit sur le
 * bouton lui-meme.
 *
 *   node scripts/netrack-couleurs-pastilles.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CSS = join(process.cwd(), 'src/features/inventaire-netrack/inventaireNetrack.css');

function lire(chemin) {
  if (!existsSync(chemin)) throw new Error('Fichier introuvable : ' + chemin);
  const brut = readFileSync(chemin, 'utf8');
  return { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n') };
}

function remplacer(texte, nom, avant, apres) {
  const n = texte.split(avant).length - 1;
  if (n !== 1) throw new Error('[' + nom + '] motif trouve ' + n + ' fois, attendu 1');
  return texte.replace(avant, apres);
}

const css = lire(CSS);

if (css.texte.includes('data-grave="surveille"')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const BLOC = [
  '/* Echelle d\'expiration : la meme que celle de l\'ancienne legende, portee',
  '   par le bouton lui-meme. Un point de la couleur du niveau, et le nombre',
  '   dans cette couleur \u2014 la correspondance se lit sans table de renvoi. */',
  '.nr-exc[data-grave]::before {',
  '  content: "";',
  '  width: 8px;',
  '  height: 8px;',
  '  border-radius: 50%;',
  '  flex: none;',
  '}',
  '.nr-exc[data-grave="expire"]::before { background: var(--nr-expire); }',
  '.nr-exc[data-grave="critique"]::before { background: var(--nr-critique); }',
  '.nr-exc[data-grave="proche"]::before { background: var(--nr-proche); }',
  '.nr-exc[data-grave="surveille"]::before { background: var(--nr-surveille); }',
  '',
  '.nr-exc[data-grave="expire"] .nr-exc-n { color: var(--nr-expire); }',
  '.nr-exc[data-grave="critique"] .nr-exc-n { color: var(--nr-critique); }',
  '.nr-exc[data-grave="proche"] .nr-exc-n { color: var(--nr-proche); }',
  '.nr-exc[data-grave="surveille"] .nr-exc-n { color: var(--nr-surveille); }',
  '',
  '/* Pastille active : le liseré reprend la couleur du niveau. */',
  '.nr-exc[data-grave="expire"][aria-pressed="true"] { border-color: var(--nr-expire); }',
  '.nr-exc[data-grave="critique"][aria-pressed="true"] { border-color: var(--nr-critique); }',
  '.nr-exc[data-grave="proche"][aria-pressed="true"] { border-color: var(--nr-proche); }',
  '.nr-exc[data-grave="surveille"][aria-pressed="true"] { border-color: var(--nr-surveille); }',
  '',
].join('\n');

// Les deux anciennes regles utilisaient une autre palette : on les remplace.
const t = remplacer(css.texte, 'couleurs des pastilles',
  '.nr-exc[data-grave="expire"] .nr-exc-n { color: var(--ruby); }\n'
  + '.nr-exc[data-grave="critique"] .nr-exc-n { color: var(--amber); }',
  BLOC);

writeFileSync(CSS, css.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  inventaireNetrack.css');
console.log('\nSi le point ne s\'aligne pas, verifie que .nr-exc est en');
console.log('display: inline-flex avec align-items: center.');
console.log('\nTermine.');
