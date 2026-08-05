/**
 * Corrige le debordement horizontal DU TABLEAU sous Firefox.
 *
 * Onze colonnes sur douze avaient une largeur fixe ; celle du libelle etait
 * laissee libre. Avec `table-layout: fixed`, Chrome lui donne l'espace
 * restant, mais Firefox la laisse absorber tout l'excedent : les onze autres
 * colonnes se retrouvaient poussees hors de l'ecran.
 *
 * Deux mesures, toutes deux limitees au tableau :
 *   - la colonne du libelle recoit une largeur, comme les autres ;
 *   - le tableau recoit une largeur minimale egale a la somme des colonnes,
 *     pour que le defilement se fasse dans la coquille `.nr-virt`, qui est
 *     deja en overflow: auto.
 *
 * Ce script ne touche AUCUN autre element : ni la surface du hub, ni la mise
 * en page generale.
 *
 *   node scripts/netrack-largeur-colonnes.mjs
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

const g = lire(G);

if (g.texte.includes('LARGEUR_MIN')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

let t = remplacer(g.texte, 'largeurs',
  'const LARGEURS = [28, null, 110, 210, 76, 66, 105, 112, 102, 102, 92, 108];',
  '/**\n'
  + ' * Une entree par colonne, chevron compris. AUCUNE ne vaut null : une\n'
  + " * colonne libre absorbe tout l'excedent sous Firefox et repousse les\n"
  + " * autres hors de l'ecran. Le libelle est simplement la plus large.\n"
  + ' */\n'
  + 'const LARGEURS = [28, 300, 110, 210, 76, 66, 105, 112, 102, 102, 92, 108];\n'
  + '\n'
  + "/** Somme des colonnes : en deca, c'est la coquille qui defile. */\n"
  + 'const LARGEUR_MIN = LARGEURS.reduce((s, l) => s + l, 0);');

t = remplacer(t, 'colgroup',
  '        {LARGEURS.map((l, i) => (\n'
  + '          <col key={i} style={l === null ? undefined : { width: l }} />\n'
  + '        ))}',
  '        {LARGEURS.map((l, i) => (\n'
  + '          <col key={i} style={{ width: l }} />\n'
  + '        ))}');

t = remplacer(t, 'table',
  '        <table className="data-table nr-large nr-arbre-table">',
  '        <table\n'
  + '          className="data-table nr-large nr-arbre-table"\n'
  + '          style={{ minWidth: LARGEUR_MIN }}\n'
  + '        >');

writeFileSync(G, g.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  GrillePivot.jsx');
console.log('\nAucune feuille de style modifiee.');
console.log('\nTermine.');
