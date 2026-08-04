/**
 * Le tableau part VIDE : rien ne s'affiche tant qu'aucune categorie n'est
 * choisie sur la 1re ligne de valeurs.
 *
 * Pourquoi : 5 658 lignes affichees d'entree ne repondent a aucune question.
 * L'ecran commence par demander « sur quoi tu travailles » au lieu de tout
 * deverser puis d'attendre qu'on filtre.
 *
 * A lancer APRES netrack-filtre-nomenclature.mjs.
 *
 *   node scripts/netrack-tableau-vide-par-defaut.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');
const GRILLE = join(process.cwd(), 'src/features/inventaire-netrack/components/GrillePivot.jsx');

function lire(chemin) {
  if (!existsSync(chemin)) throw new Error('Fichier introuvable : ' + chemin);
  const brut = readFileSync(chemin, 'utf8');
  return { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n') };
}

function ecrire(chemin, texte, crlf) {
  writeFileSync(chemin, crlf ? texte.replace(/\n/g, '\r\n') : texte, 'utf8');
}

function remplacer(texte, nom, avant, apres) {
  const n = texte.split(avant).length - 1;
  if (n !== 1) throw new Error('[' + nom + '] motif trouve ' + n + ' fois, attendu 1');
  return texte.replace(avant, apres);
}

/* ── 1. La grille n'est construite que si une categorie est choisie ── */

const page = lire(PAGE);

if (page.texte.includes("vue === 'arbre' && categorie !== ''")) {
  console.log('--  InventaireNetrackPage.jsx : deja applique');
} else {
  const t = remplacer(page.texte, 'pivot conditionnel',
    '  const pivot = useMemo(\n'
    + "    () => (vue === 'arbre' ? construirePivot(filtrees, axes, tri, rangsNomenclature) : []),\n"
    + '    [vue, filtrees, axes, tri, rangsNomenclature],\n'
    + '  );',
    '  /**\n'
    + "   * Rien tant qu'aucune categorie n'est choisie : construire l'arbre des\n"
    + '   * 5 658 lignes pour le montrer d\'entree ne repond a aucune question, et\n'
    + '   * coute le calcul complet a chaque frappe dans la recherche.\n'
    + '   */\n'
    + '  const pivot = useMemo(\n'
    + "    () => (vue === 'arbre' && categorie !== ''\n"
    + '      ? construirePivot(filtrees, axes, tri, rangsNomenclature)\n'
    + '      : []),\n'
    + '    [vue, categorie, filtrees, axes, tri, rangsNomenclature],\n'
    + '  );');
  ecrire(PAGE, t, page.crlf);
  console.log('OK  InventaireNetrackPage.jsx');
}

/* ── 2. Un ecran vide dit pourquoi il est vide ── */

const grille = lire(GRILLE);

if (grille.texte.includes('nr-vide')) {
  console.log('--  GrillePivot.jsx : deja applique');
} else {
  const g = remplacer(grille.texte, 'message',
    '      {axesValides.length === 0 ? null : (',
    '      {axesValides.length === 0 ? null : !pivot.length ? (\n'
    + '        <div className="nr-vide">\n'
    + '          Choisis une cat\u00e9gorie ci-dessus pour afficher le tableau.\n'
    + '        </div>\n'
    + '      ) : (');
  ecrire(GRILLE, g, grille.crlf);
  console.log('OK  GrillePivot.jsx');
}

console.log('\nTermine.');
