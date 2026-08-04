/**
 * Changer de categorie vide la sous-categorie DANS LE MEME appel.
 *
 * Le composant appelait majParams deux fois de suite (une fois pour `sc`,
 * une fois pour `cat`) : le second appel repart des parametres du rendu
 * precedent et ecrase le premier. `sc=PAPIER` survivait donc a un passage
 * sur MATIERES PREMIERES, qui n'a aucun PAPIER — zero ligne affichee, sans
 * que rien ne l'explique.
 *
 *   node scripts/netrack-changer-categorie.mjs
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

if (page.texte.includes("onCategorie={(v) => majParams({ cat: v, sc: ''")) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = remplacer(page.texte, 'onCategorie',
  "          onCategorie={(v) => majParams({ cat: v, grp: '' })}",
  "          onCategorie={(v) => majParams({ cat: v, sc: '', grp: '' })}");

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
