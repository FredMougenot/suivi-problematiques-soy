/**
 * Une recherche par texte prend le pas sur la navigation.
 *
 * Des qu'un texte est saisi, la categorie, la sous-categorie et les quatre
 * pastilles d'exceptions (expire, 7 jours, sans categorie, sans poids) sont
 * ignorees. Sinon chercher un code pendant qu'une branche est ouverte
 * renvoyait « aucun resultat » sans que rien n'explique pourquoi.
 *
 * Le filtre CLIENT reste applique : c'est un perimetre de travail, pas un
 * endroit ou l'on se trouve.
 *
 *   node scripts/netrack-recherche-globale.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');

function lire(chemin) {
  if (!existsSync(chemin)) throw new Error('Fichier introuvable : ' + chemin);
  const brut = readFileSync(chemin, 'utf8');
  return { texte: brut.replace(/\r\n/g, '\n'), crlf: brut.includes('\r\n') };
}

function couper(texte, nom, debut, fin, remplacement) {
  const i = texte.indexOf(debut);
  if (i === -1) throw new Error('[' + nom + '] repere de debut introuvable');
  const j = texte.indexOf(fin, i);
  if (j === -1) throw new Error('[' + nom + '] repere de fin introuvable');
  return texte.slice(0, i) + remplacement + texte.slice(j);
}

const page = lire(PAGE);

if (page.texte.includes('// Recherche = portee globale')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = couper(page.texte, 'filtrees',
  '  const filtrees = useMemo(',
  '  const groupes = useMemo(',
  '  /**\n'
  + '   * Recherche = portee globale.\n'
  + '   *\n'
  + "   * Un texte saisi IGNORE la categorie, la sous-categorie et les quatre\n"
  + "   * pastilles d'exceptions : on cherche un code partout, pas seulement la\n"
  + '   * ou l\'on se trouvait. Le client reste applique \u2014 c\'est un perimetre\n'
  + "   * de travail, pas un endroit ou l'on se trouve.\n"
  + '   */\n'
  + '  // Recherche = portee globale\n'
  + '  const filtrees = useMemo(\n'
  + '    () => {\n'
  + '      if (recherche) {\n'
  + '        return filtrerEtTrier(\n'
  + "          lignes, { client, recherche, categorie: '', stock: '', expiration: '' }, tri,\n"
  + '        );\n'
  + '      }\n'
  + '      const base = filtrerEtTrier(\n'
  + '        lignes,\n'
  + "        { client, recherche, categorie: categorie === '*' ? '' : categorie, stock, expiration },\n"
  + '        tri,\n'
  + '      );\n'
  + '      if (!sousCategorie) return base;\n'
  + "      const sans = sousCategorie === '(sans sous-catégorie)';\n"
  + '      return base.filter((l) => (sans ? !l.sous_categorie : l.sous_categorie === sousCategorie));\n'
  + '    },\n'
  + '    [lignes, client, recherche, categorie, stock, expiration, sousCategorie, tri],\n'
  + '  );\n'
  + '\n');

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
