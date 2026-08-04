/**
 * « Actualiser » passe en dernier, apres « Exporter CSV ».
 *
 *   node scripts/netrack-actualiser-dernier.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');

function lire(chemin) {
  if (!existsSync(chemin)) throw new Error('Fichier introuvable : ' + chemin);
  const brut = readFileSync(chemin, 'utf8');
  return { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n') };
}

const f = lire(PAGE);
let t = f.texte;

const DEBUT = '          <button className="btn btn-secondary" onClick={handleActualiser}';
const EXPORT = '          <button className="btn btn-primary" onClick={handleExport}>Exporter CSV</button>';

const i = t.indexOf(DEBUT);
if (i === -1) throw new Error('Bouton Actualiser introuvable.');

const j = t.indexOf(EXPORT, i);
if (j === -1) throw new Error('Bouton Exporter CSV introuvable apres Actualiser.');

if (t.indexOf(DEBUT) > t.indexOf(EXPORT)) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

// Tout ce qui separe les deux boutons : le bloc Actualiser lui-meme.
const bloc = t.slice(i, j);

t = t.slice(0, i) + t.slice(j);

const k = t.indexOf(EXPORT);
t = t.slice(0, k)
  + EXPORT + '\n'
  + bloc.replace(/\n+$/, '\n')
  + t.slice(k + EXPORT.length + 1);

writeFileSync(PAGE, f.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
