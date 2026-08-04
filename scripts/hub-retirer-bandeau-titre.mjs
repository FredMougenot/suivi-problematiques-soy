/**
 * Retire le bandeau de titre des sous-pages du hub.
 *
 * Chaque module affichait son icone, son titre et un « Retour au hub »
 * au-dessus de son propre en-tete — un doublon systematique, alors que le
 * retour se fait deja par la sphere animee.
 *
 * Le bloc est partage : une seule suppression vaut pour tous les modules.
 *
 *   node scripts/hub-retirer-bandeau-titre.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const HUB = join(process.cwd(), 'src/features/hub/JarvisHubPage.jsx');

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

const hub = lire(HUB);

if (!hub.texte.includes('view-head')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = remplacer(hub.texte, 'bandeau de titre',
  '          <div className="view-head">\n'
  + '            <span className="view-title">\n'
  + '              <span aria-hidden="true" style={{ marginRight: 8, opacity: .8 }}>{active.icon}</span>\n'
  + '              {active.title}\n'
  + '            </span>\n'
  + '            <span className="view-spacer" />\n'
  + '            <button type="button" className="view-back" onClick={reset}>← Retour au hub</button>\n'
  + '          </div>\n',
  '');

writeFileSync(HUB, hub.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  JarvisHubPage.jsx');
console.log('\nNote : `reset` peut devenir inutilise si rien d\'autre ne');
console.log('l\'appelle — verifie que la sphere animee s\'en sert toujours,');
console.log('sinon il n\'y aurait plus aucun moyen de revenir au hub.');
console.log('\nTermine.');
