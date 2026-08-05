/**
 * REGLE : le tableau ne depasse jamais la fenetre.
 *
 * La largeur disponible est MESUREE a l'execution \u2014 largeur de la fenetre,
 * moins la position gauche du tableau \u2014 et recalculee a chaque
 * redimensionnement. Toutes les colonnes en decoulent, en PROPORTIONS. Plus
 * aucune largeur en pixels ecrite a l'avance : ce qui valait pour un ecran
 * ne valait pas pour un autre.
 *
 * C'est ce qui manquait aux tentatives precedentes : le tableau etait en
 * `width: 100%` \u2014 donc 100 % de son CONTENEUR, qui s'elargit avec le plus
 * large element de la page \u2014 puis en largeur fixe, juste pour une fenetre.
 * Ni l'un ni l'autre ne regardait la fenetre.
 *
 *   node scripts/netrack-largeur-fenetre.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const G = join(process.cwd(), 'src/features/inventaire-netrack/components/GrillePivot.jsx');

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

function couper(texte, nom, debut, fin, remplacement) {
  const i = texte.indexOf(debut);
  if (i === -1) throw new Error('[' + nom + '] repere de debut introuvable');
  const j = texte.indexOf(fin, i);
  if (j === -1) throw new Error('[' + nom + '] repere de fin introuvable');
  return texte.slice(0, i) + remplacement + texte.slice(j);
}

const g = lire(G);

if (g.texte.includes('PROPORTIONS')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

let t = g.texte;

// 1 ─ Les proportions remplacent les pixels.
t = couper(t, 'largeurs',
  '/**\n * Une entree par colonne',
  'const nb = (v) =>',
  '/**\n'
  + " * Part de la largeur disponible pour chaque colonne, chevron compris.\n"
  + ' * Des PROPORTIONS et non des pixels : la somme vaut toujours 1, donc le\n'
  + " * tableau occupe exactement l'espace mesure, sur n'importe quel ecran.\n"
  + ' */\n'
  + 'const PROPORTIONS = [\n'
  + '  0.022, // chevron\n'
  + '  0.200, // libelle\n'
  + '  0.085, // TRAXcode\n'
  + '  0.160, // description\n'
  + '  0.055, // produits\n'
  + '  0.048, // lots\n'
  + '  0.075, // qte\n'
  + '  0.080, // poids\n'
  + '  0.075, // date lot\n'
  + '  0.075, // best before\n'
  + '  0.060, // jours restants\n'
  + '  0.065, // PO client\n'
  + '];\n'
  + '\n'
  + "/** En deca, les colonnes deviennent illisibles : le tableau defile alors\n"
  + " *  DANS sa coquille plutot que de deborder de la fenetre. */\n"
  + 'const LARGEUR_PLANCHER = 900;\n'
  + '\n');

// 2 ─ Mesure de la fenetre, refaite a chaque redimensionnement.
t = remplacer(t, 'mesure',
  '  const lignes = useMemo(() => aplatir(pivot, deplies), [pivot, deplies]);',
  '  /**\n'
  + "   * Largeur reellement disponible : la fenetre, moins tout ce qui se\n"
  + '   * trouve a gauche du tableau. On ne se fie PAS a la largeur du\n'
  + "   * conteneur : elle suit celle de la page, qui peut deborder.\n"
  + '   */\n'
  + '  const [dispo, setDispo] = useState(LARGEUR_PLANCHER);\n'
  + '\n'
  + '  useEffect(() => {\n'
  + '    const mesurer = () => {\n'
  + '      const el = scrollRef.current;\n'
  + '      const gauche = el ? el.getBoundingClientRect().left : 0;\n'
  + '      const bord = 24; // marge de securite pour la barre de defilement\n'
  + '      setDispo(Math.max(LARGEUR_PLANCHER, Math.round(\n'
  + '        window.innerWidth - gauche - bord,\n'
  + '      )));\n'
  + '    };\n'
  + '    mesurer();\n'
  + "    window.addEventListener('resize', mesurer);\n"
  + "    return () => window.removeEventListener('resize', mesurer);\n"
  + '  }, [scrollRef]);\n'
  + '\n'
  + '  const largeurs = useMemo(\n'
  + '    () => PROPORTIONS.map((p) => Math.floor(dispo * p)),\n'
  + '    [dispo],\n'
  + '  );\n'
  + '\n'
  + '  const lignes = useMemo(() => aplatir(pivot, deplies), [pivot, deplies]);');

// 3 ─ Le colgroup et le tableau suivent la mesure.
t = remplacer(t, 'colgroup',
  '        {LARGEURS.map((l, i) => (\n'
  + '          <col key={i} style={{ width: l }} />\n'
  + '        ))}',
  '        {largeurs.map((l, i) => (\n'
  + '          <col key={i} style={{ width: l }} />\n'
  + '        ))}');

t = remplacer(t, 'table',
  '          style={{ width: LARGEUR_TOTALE, minWidth: LARGEUR_TOTALE }}',
  '          style={{ width: dispo, maxWidth: dispo }}');

// 4 ─ useEffect et useState sont necessaires.
if (!t.includes("import { useEffect, useMemo, useState } from 'react';")) {
  t = remplacer(t, 'import',
    "import { useMemo } from 'react';",
    "import { useEffect, useMemo, useState } from 'react';");
}

writeFileSync(G, g.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  GrillePivot.jsx');
console.log('\nLe tableau mesure la fenetre et s\'y adapte, y compris au');
console.log('redimensionnement. Aucune feuille de style modifiee.');
console.log('\nRecharge avec Ctrl+Shift+R.');
console.log('\nTermine.');
