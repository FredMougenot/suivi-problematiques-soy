/**
 * Les niveaux d'expiration se calculent UNIQUEMENT sur le best before.
 *
 * `niveauExpiration` retenait le plus grave de deux lectures :
 *   - absolue, en jours restants ;
 *   - relative, en part de duree de vie consommee (<= 10 % => critique,
 *     <= 25 % => proche, <= 50 % => surveille).
 *
 * L'intention se defendait : 30 jours ne pesent pas pareil sur un UHT de
 * 18 mois et sur un produit de 3 mois. Mais les boutons annoncent des JOURS.
 * Un produit de 3 mois qu'il reste 12 jours a ecouler tombait dans « 7 jours
 * ou moins » \u2014 le compte et le libelle se contredisaient.
 *
 * On garde donc la seule lecture que l'ecran promet : les jours restants.
 *
 * CE QUE L'ON PERD : un lot a 5 % de sa vie mais a 200 jours de son best
 * before ne sera plus signale. Si ce signal compte, il lui faut sa propre
 * pastille, avec son propre libelle \u2014 pas un detournement de celles-ci.
 *
 *   node scripts/netrack-expiration-absolue.mjs
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

if (f.texte.includes('SEULE la lecture absolue')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = remplacer(f.texte, 'niveauExpiration',
  '/**\n'
  + ' * Degre de gravite, utilise pour la couleur de ligne : le PLUS GRAVE des deux\n'
  + ' * lectures, absolue et relative. Aucune ne prime, et aucun signal ne se perd.\n'
  + " * Sans date de lot, la duree de vie est inconnue : seul l'absolu s'applique.\n"
  + ' */\n'
  + 'export function niveauExpiration(jours, pctVieRestante = null) {\n'
  + '  if (jours === null || jours === undefined) return null;\n'
  + '  const a = niveauAbsolu(jours);\n'
  + '  const r = niveauRelatif(pctVieRestante);\n'
  + '  if (a === null) return r;\n'
  + '  if (r === null) return a;\n'
  + '  return RANG_NIVEAU[r] > RANG_NIVEAU[a] ? r : a;\n'
  + '}',
  '/**\n'
  + " * Degre de gravite : SEULE la lecture absolue, en jours restants avant le\n"
  + ' * best before.\n'
  + ' *\n'
  + " * La lecture relative (part de duree de vie consommee) a ete retiree : les\n"
  + ' * pastilles annoncent des JOURS, et un produit de 3 mois qu\'il restait\n'
  + ' * 12 jours a ecouler se retrouvait classe « 7 jours ou moins ». Le compte\n'
  + ' * affiche et le libelle se contredisaient.\n'
  + ' *\n'
  + " * Le parametre pctVieRestante est conserve pour ne pas casser les appels,\n"
  + ' * mais il n\'entre plus dans le calcul. `pct_vie_restante` reste disponible\n'
  + ' * sur chaque ligne : si ce signal merite une pastille, elle aura son propre\n'
  + ' * libelle plutot que de detourner celles-ci.\n'
  + ' */\n'
  + '// eslint-disable-next-line no-unused-vars\n'
  + 'export function niveauExpiration(jours, pctVieRestante = null) {\n'
  + '  if (jours === null || jours === undefined) return null;\n'
  + '  return niveauAbsolu(jours);\n'
  + '}');

writeFileSync(LOGIC, f.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  logic.js');
console.log('\nNote : niveauRelatif() et RANG_NIVEAU ne sont plus appeles,');
console.log('oxlint les signalera. Ils restent en place si tu veux plus tard');
console.log('une pastille dediee a la duree de vie consommee.');
console.log('\nTermine.');
