/**
 * Retire la bascule d'ordre « Nomenclature / Urgence ».
 *
 * Elle datait de l'epoque ou l'arborescence portait les categories : l'ordre
 * metier de la nomenclature s'y opposait a l'ordre FEFO. Depuis que la
 * navigation passe par les lignes de valeurs, la grille ne contient plus que
 * des produits et des lots — il n'y a plus deux ordres a arbitrer.
 *
 * L'ordre par defaut reste celui de la nomenclature. L'urgence reste
 * accessible en cliquant l'en-tete « Jours rest. ».
 *
 *   node scripts/netrack-retirer-ordre.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');

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

const page = lire(PAGE);

if (!page.texte.includes("Ordre de l'arborescence")) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = remplacer(page.texte, 'bascule ordre',
  "          {vue === 'arbre' && (\n"
  + '            <div className="nr-chips" role="group" aria-label="Ordre de l\'arborescence">\n'
  + '              <button\n'
  + '                className="nr-chip"\n'
  + "                aria-pressed={tri.colonne !== 'jours_min'}\n"
  + "                onClick={() => majParams({ tri: '', sens: '' })}\n"
  + '                title="Ordre défini dans la nomenclature"\n'
  + '              >Nomenclature</button>\n'
  + '              <button\n'
  + '                className="nr-chip"\n'
  + "                aria-pressed={tri.colonne === 'jours_min'}\n"
  + "                onClick={() => majParams({ tri: 'jours_min', sens: '1' })}\n"
  + '                title="Ce qui périme le plus tôt remonte en premier (FEFO)"\n'
  + '              >Urgence</button>\n'
  + '            </div>\n'
  + '          )}\n'
  + '\n',
  '');

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
