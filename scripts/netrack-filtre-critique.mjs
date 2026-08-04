/**
 * Corrige la pastille « 7 jours ou moins ».
 *
 * Elle emet la valeur d'expiration `critique`, que `filtrerEtTrier` n'a
 * jamais implementee : le bandeau comptait 11 lignes et le tableau en
 * affichait zero. Verifie valeur par valeur — expire 25, critique 0, j30 6,
 * j90 23, sans_date 31, expire_ou_j30 30.
 *
 * Le tri se fait ici plutot que dans logic.js : `filtrerEtTrier` est partagee
 * avec les vues Par lot et Par produit, et le niveau d'expiration est deja
 * calcule sur chaque ligne par `enrichir`.
 *
 *   node scripts/netrack-filtre-critique.mjs
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

if (page.texte.includes('const critique =')) {
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
  + '   * exception se regarde sur tout le releve — sinon le nombre affiche sur\n'
  + '   * la pastille ne correspond pas a ce que le tableau montre.\n'
  + '   *\n'
  + "   * La pastille « sans categorie » n'entre pas la-dedans : elle EST un\n"
  + '   * filtre de categorie, elle passe par `categorie`.\n'
  + '   *\n'
  + "   * `critique` (7 jours ou moins) est traite ICI : filtrerEtTrier ne\n"
  + '   * connait pas cette valeur et renvoyait un resultat vide. Le niveau est\n'
  + '   * deja calcule sur chaque ligne par enrichir().\n'
  + '   *\n'
  + "   * Le CLIENT reste toujours applique : c'est un perimetre de travail, pas\n"
  + "   * un endroit ou l'on se trouve.\n"
  + '   */\n'
  + '  const filtrees = useMemo(\n'
  + '    () => {\n'
  + '      const porteeGlobale = Boolean(recherche || expiration || stock);\n'
  + "      const critique = expiration === 'critique';\n"
  + '      let base = filtrerEtTrier(\n'
  + '        lignes,\n'
  + '        {\n'
  + '          client,\n'
  + '          recherche,\n'
  + '          stock,\n'
  + "          expiration: critique ? '' : expiration,\n"
  + "          categorie: porteeGlobale || categorie === '*' ? '' : categorie,\n"
  + '        },\n'
  + '        tri,\n'
  + '      );\n'
  + "      if (critique) base = base.filter((l) => l.niveau_expiration === 'critique');\n"
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
