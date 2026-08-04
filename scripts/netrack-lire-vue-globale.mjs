/**
 * L'ecran NetRack lit desormais la vue `v_inventaire_global` au lieu de la
 * table `n8n_gh_inventaire`.
 *
 * La vue reprend TOUTES les colonnes de la table source, plus `emplacement`,
 * `saisi_le` et `note` : c'est un remplacement transparent pour un
 * select('*'), rien d'autre a changer dans logic.js ni dans la grille.
 *
 * Deux emplacements y coexistent : « GH-entreposage » pour tout ce qui vient
 * du workflow n8n, « Usine » pour la saisie manuelle. Verifie apres
 * migration : 5 823 lignes / 294 produits en GH-entreposage, 0 en Usine.
 *
 *   node scripts/netrack-lire-vue-globale.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const Q = join(process.cwd(), 'src/features/inventaire-netrack/queries.js');

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

const f = lire(Q);
let t = f.texte;

if (t.includes('v_inventaire_global')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

t = remplacer(t, 'commentaire',
  '/**\n'
  + ' * Inventaire NetRack alimente par le workflow n8n\n'
  + " * « GH Logistics - Connexion NetRack ».\n"
  + ' * La colonne `client` de cette table est le COMPTE NetRack (EO / PBC),\n'
  + ' * a ne pas confondre avec le client final, qui vient du referentiel.\n'
  + ' */',
  '/**\n'
  + " * Inventaire complet, tous EMPLACEMENTS confondus, via la vue\n"
  + ' * `v_inventaire_global` : union de `n8n_gh_inventaire` (alimentee par le\n'
  + " * workflow « GH Logistics - Connexion NetRack », emplacement\n"
  + " * « GH-entreposage ») et de `usine_stock` (saisie manuelle, emplacement\n"
  + " * « Usine »).\n"
  + ' *\n'
  + ' * TROIS notions a ne pas confondre :\n'
  + " *   emplacement  ou se trouve la marchandise ;\n"
  + ' *   client       le COMPTE chez l\'entreposeur (EO / PBC), nul pour une\n'
  + " *                ligne usine, qui n'a pas de compte ;\n"
  + ' *   client_regle le client final, deduit du referentiel via no_produit —\n'
  + " *                il s'attribue donc tout seul aux lignes usine.\n"
  + ' *\n'
  + ' * Les identifiants sont prefixes `gh-` / `us-` : chaque table a sa propre\n'
  + " * sequence, deux lignes differentes partageraient sinon une cle.\n"
  + ' */');

t = remplacer(t, 'source',
  "          .from('n8n_gh_inventaire')",
  "          .from('v_inventaire_global')");

writeFileSync(Q, f.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  queries.js');
console.log('\nTermine.');
