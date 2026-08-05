/**
 * netrack-export-pivot-complet.mjs
 *
 * Complete l'export CSV de la grille : les colonnes AGREGEES de l'ecran ne
 * suffisent pas, il faut aussi tous les champs bruts de l'inventaire
 * (poids unitaire, sous-lot, etiquette, no de commande…) que l'ancien
 * export a plat fournissait.
 *
 * Structure du fichier :
 *   Niveau | <11 colonnes de la grille> | <toutes les colonnes brutes>
 *   Produit | totaux agreges            | (vide)
 *   Lot     | totaux du lot             | valeurs de la ligne d'inventaire
 *
 * Une feuille qui porte plusieurs lignes d'inventaire produit une ligne de
 * detail PAR ligne : rien n'est perdu.
 *
 * A lancer apres netrack-export-pivot.mjs. Idempotent et tolerant au CRLF.
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

// ── 1. pivot.js : importer LIBELLES ─────────────────────────────────────
console.log('pivot.js');

remplacer(
  `${BASE}/pivot.js`,
  "import { nombre, niveauExpiration, telecharger, echapper, horodatage } from './logic';",
  "import { nombre, niveauExpiration, telecharger, echapper, horodatage, LIBELLES } from './logic';",
  'import de LIBELLES',
);

// ── 2. pivot.js : remplacer le corps de la fonction ─────────────────────
const ANCIENNE = `export function exporterCsvPivot(pivot) {
  const entetes = ['Niveau'].concat(COLONNES_PIVOT.map((c) => c.libelle));
  const lignes = [];

  const parcourir = (noeuds) => {
    for (const n of noeuds) {
      const niveau = (AXES[n.axe] && AXES[n.axe].libelle) || n.axe || '';
      const cellules = COLONNES_PIVOT.map((c) => {
        if (c.cle === 'libelle') return n.libelle;
        // Les champs texte agreges : on veut la LISTE COMPLETE dans un
        // fichier, pas le « 3 PO » de l'ecran qui n'a de sens qu'avec son
        // infobulle. Un tableur doit pouvoir filtrer la-dessus.
        if (c.texte) {
          const s = n.distincts && n.distincts[c.texte];
          return s && s.size ? [...s].join(' | ') : '';
        }
        const v = n[c.cle];
        return v === null || v === undefined ? '' : v;
      });
      lignes.push([niveau].concat(cellules).map(echapper).join(';'));
      if (n.enfants && n.enfants.length) parcourir(n.enfants);
    }
  };

  parcourir(pivot || []);

  const contenu = [entetes.map(echapper).join(';')].concat(lignes).join('\\r\\n');
  telecharger(contenu, 'inventaire-netrack-grille-' + horodatage() + '.csv');
  return lignes.length;
}`;

const NOUVELLE = `export function exporterCsvPivot(pivot, colonnes) {
  const brutes = colonnes || [];
  const entetes = ['Niveau']
    .concat(COLONNES_PIVOT.map((c) => c.libelle))
    .concat(brutes.map((c) => LIBELLES[c] || c));
  const sortie = [];
  const vide = brutes.map(() => '');

  /** Les 11 colonnes agregees de l'ecran, pour un noeud donne. */
  const agregees = (n) => COLONNES_PIVOT.map((c) => {
    if (c.cle === 'libelle') return n.libelle;
    // Champs texte : la LISTE COMPLETE, pas le « 3 PO » de l'ecran qui n'a
    // de sens qu'avec son infobulle. Un tableur doit pouvoir filtrer dessus.
    if (c.texte) {
      const s = n.distincts && n.distincts[c.texte];
      return s && s.size ? [...s].join(' | ') : '';
    }
    const v = n[c.cle];
    return v === null || v === undefined ? '' : v;
  });

  const ecrire = (cellules) => sortie.push(cellules.map(echapper).join(';'));

  const parcourir = (noeuds) => {
    for (const n of noeuds) {
      const niveau = (AXES[n.axe] && AXES[n.axe].libelle) || n.axe || '';
      const feuille = !n.enfants || !n.enfants.length;

      if (!feuille) {
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
      }
    }
  };

  parcourir(pivot || []);

  const contenu = [entetes.map(echapper).join(';')].concat(sortie).join('\\r\\n');
  telecharger(contenu, 'inventaire-netrack-grille-' + horodatage() + '.csv');
  return sortie.length;
}`;

remplacer(`${BASE}/pivot.js`, ANCIENNE, NOUVELLE, 'exporterCsvPivot complete');

// ── 3. La page : passer les colonnes brutes ─────────────────────────────
console.log('InventaireNetrackPage.jsx');

remplacer(
  `${BASE}/InventaireNetrackPage.jsx`,
  'const n = exporterCsvPivot(pivot);',
  'const n = exporterCsvPivot(pivot, colonnes);',
  'colonnes brutes transmises',
);

console.log('\nTermine. Recharger la page (Ctrl+F5) et re-exporter.');
