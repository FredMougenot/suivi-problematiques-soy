/**
 * La vue par defaut devient GRILLE.
 *
 * Sans parametre `vue`, la page ouvrait « Par lot » — la seule vue NON
 * virtualisee : 5 823 <tr> montes d'un coup, un conteneur de 237 000 px de
 * haut. C'est ce qui rendait l'arrivee sur NetRack lente, la ou
 * Problematiques s'affiche en 150 ms.
 *
 * L'effet qui basculait ensuite sur 'arbre' ne suffisait pas : il s'execute
 * APRES un premier rendu complet en « Par lot ». Le cout etait deja paye.
 * On corrige la valeur par defaut elle-meme.
 *
 *   node scripts/netrack-vue-grille-par-defaut.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');

function lire(chemin) {
  if (!existsSync(chemin)) throw new Error('Fichier introuvable : ' + chemin);
  const brut = readFileSync(chemin, 'utf8');
  return { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n') };
}

const page = lire(PAGE);
let t = page.texte;

if (t.includes("vueBrute || 'arbre'")) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const n = t.split("vueBrute || 'lot'").length - 1;
if (n !== 1) {
  throw new Error(
    "Motif \"vueBrute || 'lot'\" trouve " + n + ' fois, attendu 1.\n'
    + 'Ouvre InventaireNetrackPage.jsx et cherche la ligne qui definit `vue`,\n'
    + 'puis remplace la valeur par defaut par \'arbre\'.',
  );
}

t = t.replace("vueBrute || 'lot'", "vueBrute || 'arbre'");

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
