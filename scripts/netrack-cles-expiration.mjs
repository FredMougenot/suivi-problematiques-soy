/**
 * Corrige les clés des deux pastilles ajoutées.
 *
 * J'avais suppose `j30` / `j90` — les valeurs de la liste deroulante. Or
 * `niveauExpiration()` renvoie `proche` (8 a 30 jours) et `surveille`
 * (31 a 90 jours). Le comptage tombait donc a zero et les deux boutons,
 * filtres sur `n > 0`, ne s'affichaient pas.
 *
 * A lancer APRES netrack-pastilles-expiration.mjs.
 *
 *   node scripts/netrack-cles-expiration.mjs
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

if (t.includes("'proche', 'surveille'")) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

// Comptage.
t = remplacer(t, 'declaration',
  '    let expire = 0; let critique = 0; let j30 = 0; let j90 = 0;',
  '    let expire = 0; let critique = 0; let proche = 0; let surveille = 0;');

t = remplacer(t, 'increments',
  "      else if (l.niveau_expiration === 'j30') j30 += 1;\n"
  + "      else if (l.niveau_expiration === 'j90') j90 += 1;\n",
  "      else if (l.niveau_expiration === 'proche') proche += 1;\n"
  + "      else if (l.niveau_expiration === 'surveille') surveille += 1;\n");

t = remplacer(t, 'retour',
  '      expire, critique, j30, j90, horsRef, sansCat, sansPoids,',
  '      expire, critique, proche, surveille, horsRef, sansCat, sansPoids,');

// Pastilles.
t = remplacer(t, 'pastille proche',
  "    { cle: 'j30', n: c.j30, libelle: '8 à 30 jours', grave: 'j30', actif: exp === 'j30', f: { exp: exp === 'j30' ? '' : 'j30', stk: '', cat: '' } },",
  "    { cle: 'proche', n: c.proche, libelle: '8 à 30 jours', grave: 'proche', actif: exp === 'proche', f: { exp: exp === 'proche' ? '' : 'proche', stk: '', cat: '' } },");

t = remplacer(t, 'pastille surveille',
  "    { cle: 'j90', n: c.j90, libelle: '31 à 90 jours', grave: 'j90', actif: exp === 'j90', f: { exp: exp === 'j90' ? '' : 'j90', stk: '', cat: '' } },",
  "    { cle: 'surveille', n: c.surveille, libelle: '31 à 90 jours', grave: 'surveille', actif: exp === 'surveille', f: { exp: exp === 'surveille' ? '' : 'surveille', stk: '', cat: '' } },");

// Ensemble des valeurs filtrees sur le niveau calcule.
t = remplacer(t, 'ensemble',
  "const NIVEAUX_EXPIRATION = new Set(['expire', 'critique', 'j30', 'j90']);",
  "const NIVEAUX_EXPIRATION = new Set(['expire', 'critique', 'proche', 'surveille']);");

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
