/**
 * « Toutes » devient un etat a part entiere.
 *
 * Avant, la chaine vide signifiait a la fois « rien n'a encore ete demande »
 * (tableau vide au chargement, voulu) et « toutes les categories ». Cliquer
 * sur Toutes revenait donc a n'avoir rien demande : rien ne s'affichait, et
 * une recherche par texte ne renvoyait jamais rien.
 *
 * Le jeton '*' porte desormais « toutes ». Il ne doit pas descendre jusqu'a
 * filtrerEtTrier, qui le prendrait pour un libelle de categorie a comparer.
 *
 *   node scripts/netrack-toutes-categories.mjs
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
let t = page.texte;

if (t.includes("categorie === '*'")) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

// Le jeton '*' est neutralise avant d'atteindre le filtre : « toutes » veut
// dire « aucune restriction de categorie ».
t = remplacer(t, 'filtre categorie',
  '        lignes, { client, recherche, categorie, stock, expiration }, tri,\n',
  '        lignes,\n'
  + "        { client, recherche, categorie: categorie === '*' ? '' : categorie, stock, expiration },\n"
  + '        tri,\n');

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
