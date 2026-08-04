/**
 * Le partiel entre dans le calcul du poids.
 *
 * `partiel` est une valeur de POIDS, pas un nombre d'unites : il s'ajoute
 * directement au total et ne doit surtout pas etre multiplie par le poids
 * unitaire. Un sac ouvert contenant 12,5 kg pese 12,5 kg, pas 12,5 sacs.
 *
 * Cas de bord tranche ici : si le produit n'a AUCUN poids unitaire connu
 * mais qu'un partiel est saisi, le poids n'est plus totalement inconnu. On
 * affiche donc le partiel plutot qu'un tiret \u2014 on a pese quelque chose, le
 * cacher serait faux. Le total reste evidemment partiel, et la colonne
 * signale deja les branches a moitie renseignees.
 *
 *   node scripts/netrack-partiel-dans-poids.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LOGIC = join(process.cwd(), 'src/features/inventaire-netrack/logic.js');

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

const f = lire(LOGIC);
let t = f.texte;

if (t.includes('const partiel = nombre(l.partiel)')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

t = remplacer(t, 'lecture du partiel',
  '    const qte = nombre(l.unite2_qte_inv);',
  '    const qte = nombre(l.unite2_qte_inv);\n'
  + '    // Balance d\'une unite entamee, saisie a l\'usine. C\'est un POIDS :\n'
  + '    // il s\'ajoute tel quel et ne passe jamais par le poids unitaire.\n'
  + '    const partiel = nombre(l.partiel);');

t = remplacer(t, 'calcul du poids',
  '      poids_total: pu === null ? null : Math.round(pu * qte * 100) / 100,',
  '      poids_total: pu === null\n'
  + '        // Sans poids unitaire, seul le partiel est connu \u2014 mais il est\n'
  + '        // connu : afficher un tiret alors qu\'on a pese serait faux.\n'
  + '        ? (partiel ? Math.round(partiel * 100) / 100 : null)\n'
  + '        : Math.round((pu * qte + partiel) * 100) / 100,');

writeFileSync(LOGIC, f.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  logic.js');
console.log('\nTermine.');
