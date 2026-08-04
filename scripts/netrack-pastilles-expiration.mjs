/**
 * Trois changements :
 *
 *  1. Retrait des modes « Par lot » et « Par produit ». La grille couvre les
 *     deux, et ces vues ne sont pas virtualisees — 5 823 <tr> montes d'un
 *     coup a chaque clic.
 *
 *  2. Une pastille pour CHAQUE niveau d'expiration. Il en manquait deux :
 *     « 8 a 30 jours » et « 31 a 90 jours » avaient une couleur dans la
 *     legende mais aucun bouton.
 *
 *     Ces quatre pastilles filtrent desormais sur `niveau_expiration`, deja
 *     calcule sur chaque ligne. C'est ce qui garantit que le nombre affiche
 *     sur la pastille est EXACTEMENT ce que le tableau montre — l'ancienne
 *     valeur `critique` passait par filtrerEtTrier, qui ne la connait pas :
 *     11 annonces, zero affichee.
 *
 *  3. Suppression de la legende des couleurs : chaque couleur a maintenant
 *     son bouton, qui porte le meme libelle et le meme code couleur.
 *
 *   node scripts/netrack-pastilles-expiration.mjs
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

if (t.includes('NIVEAUX_EXPIRATION')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

/* ── 1. Comptage des quatre niveaux ── */

t = remplacer(t, 'comptage',
  '    let expire = 0; let critique = 0; let horsRef = 0; let sansCat = 0; let sansPoids = 0;\n'
  + '    for (const l of lignes) {\n'
  + "      if (l.niveau_expiration === 'expire') expire += 1;\n"
  + "      else if (l.niveau_expiration === 'critique') critique += 1;\n",
  '    let expire = 0; let critique = 0; let j30 = 0; let j90 = 0;\n'
  + '    let horsRef = 0; let sansCat = 0; let sansPoids = 0;\n'
  + '    for (const l of lignes) {\n'
  + "      if (l.niveau_expiration === 'expire') expire += 1;\n"
  + "      else if (l.niveau_expiration === 'critique') critique += 1;\n"
  + "      else if (l.niveau_expiration === 'j30') j30 += 1;\n"
  + "      else if (l.niveau_expiration === 'j90') j90 += 1;\n");

t = remplacer(t, 'retour du comptage',
  '    return { expire, critique, horsRef, sansCat, sansPoids };',
  '    return {\n'
  + '      expire, critique, j30, j90, horsRef, sansCat, sansPoids,\n'
  + '    };');

/* ── 2. Les deux pastilles manquantes ── */

t = remplacer(t, 'pastilles',
  "    { cle: 'critique', n: c.critique, libelle: '7 jours ou moins', grave: 'critique', actif: exp === 'critique', f: { exp: exp === 'critique' ? '' : 'critique', stk: '', cat: '' } },\n",
  "    { cle: 'critique', n: c.critique, libelle: '7 jours ou moins', grave: 'critique', actif: exp === 'critique', f: { exp: exp === 'critique' ? '' : 'critique', stk: '', cat: '' } },\n"
  + "    { cle: 'j30', n: c.j30, libelle: '8 à 30 jours', grave: 'j30', actif: exp === 'j30', f: { exp: exp === 'j30' ? '' : 'j30', stk: '', cat: '' } },\n"
  + "    { cle: 'j90', n: c.j90, libelle: '31 à 90 jours', grave: 'j90', actif: exp === 'j90', f: { exp: exp === 'j90' ? '' : 'j90', stk: '', cat: '' } },\n");

/* ── 3. Le filtre passe par le niveau, pour que compte et affichage collent ── */

t = remplacer(t, 'filtre par niveau',
  "      const critique = expiration === 'critique';\n"
  + '      let base = filtrerEtTrier(\n'
  + '        lignes,\n'
  + '        {\n'
  + '          client,\n'
  + '          recherche,\n'
  + '          stock,\n'
  + "          expiration: critique ? '' : expiration,\n"
  + "          categorie: porteeGlobale || categorie === '*' ? '' : categorie,\n"
  + '        },\n'
  + '        tri,\n'
  + '      );\n'
  + "      if (critique) base = base.filter((l) => l.niveau_expiration === 'critique');\n",
  '      // Les quatre niveaux se filtrent sur `niveau_expiration`, deja calcule\n'
  + '      // par enrichir(). filtrerEtTrier ne connait pas `critique`, et rien ne\n'
  + '      // garantissait que ses bornes coincident avec celles du comptage :\n'
  + "      // le nombre annonce sur la pastille aurait pu differer de l'affichage.\n"
  + '      const parNiveau = NIVEAUX_EXPIRATION.has(expiration);\n'
  + '      let base = filtrerEtTrier(\n'
  + '        lignes,\n'
  + '        {\n'
  + '          client,\n'
  + '          recherche,\n'
  + '          stock,\n'
  + "          expiration: parNiveau ? '' : expiration,\n"
  + "          categorie: porteeGlobale || categorie === '*' ? '' : categorie,\n"
  + '        },\n'
  + '        tri,\n'
  + '      );\n'
  + '      if (parNiveau) base = base.filter((l) => l.niveau_expiration === expiration);\n');

// La constante, posee juste avant le composant de page.
t = remplacer(t, 'constante NIVEAUX',
  'export default function InventaireNetrackPage() {',
  "/** Valeurs d'expiration filtrees sur le niveau calcule, pas via filtrerEtTrier. */\n"
  + "const NIVEAUX_EXPIRATION = new Set(['expire', 'critique', 'j30', 'j90']);\n"
  + '\n'
  + 'export default function InventaireNetrackPage() {');

/* ── 4. Retrait des deux modes ── */

t = remplacer(t, 'modes',
  '            <button\n'
  + '              className="nr-chip"\n'
  + "              aria-pressed={vue === 'lot'}\n"
  + "              onClick={() => majParams({ vue: '' })}\n"
  + '            >Par lot</button>\n'
  + '            <button\n'
  + '              className="nr-chip"\n'
  + "              aria-pressed={vue === 'produit'}\n"
  + "              onClick={() => majParams({ vue: 'produit' })}\n"
  + '            >Par produit</button>\n',
  '');

/* ── 5. La legende n'a plus lieu d'etre ── */

t = remplacer(t, 'legende',
  '      <div className="nr-legende">\n'
  + '        {SEUILS_EXPIRATION.map((s) => (\n'
  + '          <span key={s.cle}>\n'
  + '            <i className="nr-pastille" data-n={s.cle} />\n'
  + '            {s.libelle}\n'
  + '          </span>\n'
  + '        ))}\n'
  + '      </div>\n'
  + '\n',
  '');

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nNote : SEUILS_EXPIRATION n\'est plus utilise dans ce fichier,');
console.log('oxlint signalera un import inutile.');
console.log('\nTermine.');
