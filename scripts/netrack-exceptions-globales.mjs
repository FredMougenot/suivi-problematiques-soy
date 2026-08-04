/**
 * Les pastilles d'exceptions prennent le pas sur la navigation.
 *
 * Une exception se compte sur TOUT le releve — c'est sa raison d'etre : un
 * filtre actif ne doit pas masquer le probleme qu'on cherche. Mais le
 * resultat, lui, restait coince dans la categorie ouverte : cliquer
 * « 107 expire » alors que LIGNE TBA etait selectionnee n'en montrait qu'une
 * partie, sans que rien ne signale l'ecart entre le compte et l'affichage.
 *
 * Desormais, des qu'une pastille d'expiration ou de stock est active, la
 * categorie et la sous-categorie sont ignorees.
 *
 * Exception a l'exception : la pastille « sans categorie » EST un filtre de
 * categorie. Elle continue evidemment de s'appliquer.
 *
 *   node scripts/netrack-exceptions-globales.mjs
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

if (page.texte.includes('const porteeGlobale')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = couper(page.texte, 'filtrees',
  '  const filtrees = useMemo(',
  '  const groupes = useMemo(',
  '  /**\n'
  + '   * Portee globale : recherche et pastilles passent au-dessus du chemin.\n'
  + '   *\n'
  + "   * Un texte saisi, ou une pastille d'expiration / de stock, IGNORE la\n"
  + '   * categorie et la sous-categorie. On cherche un code partout, et une\n'
  + '   * exception se regarde sur tout le releve \u2014 sinon le nombre affiche sur\n'
  + "   * la pastille ne correspond pas a ce que le tableau montre.\n"
  + '   *\n'
  + "   * La pastille « sans categorie » n'entre pas la-dedans : elle EST un\n"
  + '   * filtre de categorie, elle passe par `categorie`.\n'
  + '   *\n'
  + "   * Le CLIENT reste toujours applique : c'est un perimetre de travail, pas\n"
  + "   * un endroit ou l'on se trouve.\n"
  + '   */\n'
  + '  const filtrees = useMemo(\n'
  + '    () => {\n'
  + '      const porteeGlobale = Boolean(recherche || expiration || stock);\n'
  + '      const base = filtrerEtTrier(\n'
  + '        lignes,\n'
  + '        {\n'
  + '          client,\n'
  + '          recherche,\n'
  + '          stock,\n'
  + '          expiration,\n'
  + "          categorie: porteeGlobale || categorie === '*' ? '' : categorie,\n"
  + '        },\n'
  + '        tri,\n'
  + '      );\n'
  + '      if (porteeGlobale || !sousCategorie) return base;\n'
  + "      const sans = sousCategorie === '(sans sous-catégorie)';\n"
  + '      return base.filter((l) => (sans ? !l.sous_categorie : l.sous_categorie === sousCategorie));\n'
  + '    },\n'
  + '    [lignes, client, recherche, categorie, stock, expiration, sousCategorie, tri],\n'
  + '  );\n'
  + '\n');

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
