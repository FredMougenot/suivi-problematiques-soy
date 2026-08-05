/**
 * netrack-export-pivot-detail.mjs
 *
 * Corrige l'export de la grille : les colonnes AGREGEES etaient recopiees
 * sur chaque ligne de detail. Un lot de 160 unites reparti sur 4 lignes de
 * 40 affichait « 160 » quatre fois — le total se lisait comme une quantite.
 *
 * Desormais chaque valeur n'apparait qu'a UN endroit :
 *   Produit | totaux du produit | (colonnes brutes vides)
 *   Lot     | totaux du lot     | (colonnes brutes vides)
 *   Detail  | (colonnes agregees vides, sauf Regroupement) | ligne d'inventaire
 *
 * A lancer apres netrack-export-pivot-complet.mjs. Idempotent, CRLF-safe.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 'src/features/inventaire-netrack';

function remplacer(chemin, avant, apres, etiquette) {
  const s = readFileSync(chemin, 'utf8');
  const crlf = s.includes('\r\n');
  const aligner = (t) => (crlf ? t.replace(/\r?\n/g, '\r\n') : t.replace(/\r\n/g, '\n'));
  const a = aligner(avant);
  const b = aligner(apres);

  if (s.split(b).length - 1 >= 1) {
    console.log(`  – ${etiquette} (deja en place)`);
    return;
  }

  const n = s.split(a).length - 1;
  if (n !== 1) {
    throw new Error(`${etiquette} : ${n} occurrence(s) dans ${chemin}, il en faut exactement 1`);
  }
  writeFileSync(chemin, s.replace(a, b), 'utf8');
  console.log(`  ✓ ${etiquette}`);
}

console.log('pivot.js');

const ANCIEN = `      if (!feuille) {
        // Ligne de TOTAL : les colonnes brutes n'ont pas de valeur unique a
        // ce niveau, les remplir donnerait une donnee fausse.
        ecrire([niveau].concat(agregees(n)).concat(vide));
        parcourir(n.enfants);
        continue;
      }

      // Feuille : une ligne de DETAIL par ligne d'inventaire, avec tous les
      // champs bruts. C'est ce que fournissait l'ancien export a plat.
      const detail = (n.lignes && n.lignes.length) ? n.lignes : [null];
      for (const l of detail) {
        ecrire([niveau].concat(agregees(n)).concat(
          brutes.map((c) => {
            if (!l) return '';
            const v = l[c];
            return v === null || v === undefined ? '' : v;
          }),
        ));
      }`;

const NOUVEAU = `      // Ligne de TOTAL, a tous les niveaux y compris la feuille : les
      // colonnes brutes restent vides, aucune n'a de valeur unique ici.
      ecrire([niveau].concat(agregees(n)).concat(vide));

      if (!feuille) {
        parcourir(n.enfants);
        continue;
      }

      // Puis le DETAIL de la feuille : une ligne par ligne d'inventaire.
      // Les colonnes agregees y sont VIDES — sauf Regroupement, qui sert
      // de rattachement. Recopier le total du lot sur chacune de ses
      // lignes le faisait lire comme une quantite : un lot de 160 reparti
      // en 4 lignes de 40 affichait « 160 » quatre fois.
      for (const l of (n.lignes || [])) {
        ecrire([DETAIL]
          .concat(COLONNES_PIVOT.map((c) => (c.cle === 'libelle' ? n.libelle : '')))
          .concat(brutes.map((c) => {
            const v = l[c];
            return v === null || v === undefined ? '' : v;
          })));
      }`;

remplacer(`${BASE}/pivot.js`, ANCIEN, NOUVEAU, 'totaux et details separes');

remplacer(
  `${BASE}/pivot.js`,
  `export function exporterCsvPivot(pivot, colonnes) {
  const brutes = colonnes || [];`,
  `/** Valeur de la colonne « Niveau » sur une ligne d'inventaire brute. */
const DETAIL = 'Détail';

export function exporterCsvPivot(pivot, colonnes) {
  const brutes = colonnes || [];`,
  'constante DETAIL',
);

console.log('\nTermine. Recharger la page (Ctrl+F5) et re-exporter.');
