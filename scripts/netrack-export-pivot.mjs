/**
 * netrack-export-pivot.mjs
 *
 * Export CSV calque sur la grille : une ligne de TOTAL par produit, suivie
 * de ses lots en detail. Une colonne « Niveau » distingue les deux.
 *
 * Touche 3 fichiers :
 *   logic.js  — exporte telecharger / echapper / horodatage (etaient prives)
 *   pivot.js  — nouvelle fonction exporterCsvPivot()
 *   InventaireNetrackPage.jsx — handleExport branche la vue arbre dessus
 *
 * La fonction vit dans pivot.js et non dans logic.js : pivot.js importe deja
 * logic.js, l'inverse creerait un cycle d'imports.
 *
 * Chaque remplacement est verifie : le script s'arrete sans rien ecrire si
 * un repere est absent ou ambigu.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 'src/features/inventaire-netrack';

/**
 * Les fichiers du depot sont en CRLF (Windows) : un motif ecrit avec des \n
 * ne trouve rien des qu'il s'etale sur plusieurs lignes. On aligne donc le
 * motif sur la fin de ligne reellement presente dans le fichier.
 *
 * Idempotent : si le resultat est deja en place, on passe. Le script peut
 * donc etre relance apres un echec en cours de route sans rien abimer.
 */
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

// ── 1. logic.js : rendre les utilitaires CSV reutilisables ──────────────
console.log('logic.js');

remplacer(
  `${BASE}/logic.js`,
  'function telecharger(contenu, nom) {',
  'export function telecharger(contenu, nom) {',
  'telecharger exporte',
);

remplacer(
  `${BASE}/logic.js`,
  `const echapper = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const horodatage = () => new Date().toISOString().slice(0, 10);`,
  `export const echapper = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
export const horodatage = () => new Date().toISOString().slice(0, 10);`,
  'echapper + horodatage exportes',
);

// ── 2. pivot.js : la fonction d'export ──────────────────────────────────
console.log('pivot.js');

remplacer(
  `${BASE}/pivot.js`,
  "import { nombre, niveauExpiration } from './logic';",
  "import { nombre, niveauExpiration, telecharger, echapper, horodatage } from './logic';",
  'import des utilitaires CSV',
);

const FONCTION = `
/**
 * Export CSV calque sur la grille : chaque noeud donne une ligne, dans
 * l'ordre affiche. Un produit apparait donc en TOTAL, suivi de ses lots.
 *
 * L'arbre est parcouru ENTIEREMENT, sans tenir compte des chevrons ouverts
 * ou fermes a l'ecran : un fichier partiel selon l'etat de depliage serait
 * un piege — deux exports du meme ecran ne contiendraient pas la meme chose.
 *
 * La colonne « Niveau » porte le libelle de l'axe du noeud (Produit, Lot…) :
 * elle reste juste si la hierarchie change un jour.
 */
export function exporterCsvPivot(pivot) {
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
}
`;

remplacer(
  `${BASE}/pivot.js`,
  'export const COLONNES_PIVOT = [',
  FONCTION.trimStart() + '\nexport const COLONNES_PIVOT = [',
  'fonction exporterCsvPivot ajoutee',
);

// ── 3. La page : brancher la vue arbre ──────────────────────────────────
console.log('InventaireNetrackPage.jsx');

remplacer(
  `${BASE}/InventaireNetrackPage.jsx`,
  `import {
  construirePivot, toutesLesCles, noeudParCle, AXES_DEFAUT,
} from './pivot';`,
  `import {
  construirePivot, toutesLesCles, noeudParCle, AXES_DEFAUT, exporterCsvPivot,
} from './pivot';`,
  'import de exporterCsvPivot',
);

remplacer(
  `${BASE}/InventaireNetrackPage.jsx`,
  `  function handleExport() {
    const rien = vue === 'produit' ? !groupes.length : !filtrees.length;
    if (rien) { addToast('Rien à exporter', 'error'); return; }
    try {
      if (vue === 'produit') {
        exporterCsvGroupe(groupes);
        addToast(groupes.length + ' produits exportés ✓', 'success');
      } else {`,
  `  function handleExport() {
    const rien = vue === 'produit'
      ? !groupes.length
      : vue === 'arbre' ? !pivot.length : !filtrees.length;
    if (rien) { addToast('Rien à exporter', 'error'); return; }
    try {
      if (vue === 'arbre') {
        // Le fichier reprend la grille : un total par produit, ses lots
        // en dessous. Exporter les lignes a plat perdrait les totaux que
        // l'ecran affiche, qui sont justement ce qu'on vient y chercher.
        const n = exporterCsvPivot(pivot);
        addToast(n + ' lignes exportées ✓', 'success');
      } else if (vue === 'produit') {
        exporterCsvGroupe(groupes);
        addToast(groupes.length + ' produits exportés ✓', 'success');
      } else {`,
  'handleExport branche sur la grille',
);

console.log('\nTermine. Recharger la page (Ctrl+F5) et cliquer « Exporter CSV ».');
