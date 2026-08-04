/**
 * La cellule « Unités » du tiroir affichait un champ vide.
 *
 * La vue expose la quantite sous `unite2_qte_inv`, pour rester alignee sur
 * les lignes NetRack et rester comparable. La colonne a ECRIRE dans
 * usine_stock, elle, s'appelle `qte`. La cellule lisait donc `qte` \u2014 absent
 * de la ligne affichee \u2014 alors que l'ecriture visait le bon endroit.
 *
 * On separe les deux : `source` dit ou lire, `champ` dit ou ecrire. Par
 * defaut les deux coincident, ce qui est le cas de tous les autres champs.
 *
 *   node scripts/netrack-cellule-source.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const T = join(process.cwd(), 'src/features/inventaire-netrack/components/TiroirLot.jsx');

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

const f = lire(T);
let t = f.texte;

if (t.includes('source = null')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

t = remplacer(t, 'signature',
  "function Cellule({ ligne, champ, type = 'text', classe = '', modifier }) {\n"
  + '  const valeur = ligne[champ];',
  '/**\n'
  + " * `source` : d'ou vient la valeur affichee. `champ` : quelle colonne de\n"
  + ' * usine_stock recevoir l\'ecriture. Les deux different pour la quantite,\n'
  + " * exposee en `unite2_qte_inv` par la vue mais stockee en `qte`.\n"
  + ' */\n'
  + "function Cellule({ ligne, champ, source = null, type = 'text', classe = '', modifier }) {\n"
  + '  const valeur = ligne[source || champ];');

t = remplacer(t, 'cellule quantite',
  '                        ? <Cellule ligne={l} champ="qte" type="number" classe="nr-cell-num" modifier={mod} />',
  '                        ? (\n'
  + '                          <Cellule\n'
  + '                            ligne={l}\n'
  + '                            champ="qte"\n'
  + '                            source="unite2_qte_inv"\n'
  + '                            type="number"\n'
  + '                            classe="nr-cell-num"\n'
  + '                            modifier={mod}\n'
  + '                          />\n'
  + '                        )');

writeFileSync(T, f.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  TiroirLot.jsx');
console.log('\nTermine.');
