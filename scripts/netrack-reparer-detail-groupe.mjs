/**
 * Repare une coupe trop large : en remplacant le bloc `pivot`, le script
 * netrack-pivot-sans-condition.mjs a emporte le bloc `detailGroupe` qui se
 * trouvait entre `pivot` et `totaux`. La page plantait sur
 * « detailGroupe is not defined ».
 *
 *   node scripts/netrack-reparer-detail-groupe.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');

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

const page = lire(PAGE);

if (page.texte.includes('const detailGroupe')) {
  console.log('Deja present. Rien a faire.');
  process.exit(0);
}

const t = remplacer(page.texte, 'detailGroupe',
  '  const totaux = useMemo(',
  '  /**\n'
  + '   * Detail de la feuille ouverte dans le tiroir, retrouvee par son chemin.\n'
  + "   * Un groupe qui sort du filtre courant n'existe plus dans la grille : le\n"
  + '   * tiroir se referme de lui-meme, ce qui est coherent avec ce qui est\n'
  + '   * affiche. Les attributs produit ne sortent que si le groupe designe UN\n'
  + "   * produit — sinon ils n'auraient pas de valeur unique.\n"
  + '   */\n'
  + '  const detailGroupe = useMemo(() => {\n'
  + '    if (!groupeOuvert) return null;\n'
  + '    const n = noeudParCle(pivot, groupeOuvert);\n'
  + '    if (!n || !n.lignes.length) return null;\n'
  + '    return {\n'
  + '      titre: n.libelle,\n'
  + "      chemin: n.cle.split('\\u0000'),\n"
  + '      lignes: n.lignes,\n'
  + '      produit: n.produits.size === 1 ? n.lignes[0] : null,\n'
  + '    };\n'
  + '  }, [groupeOuvert, pivot]);\n'
  + '\n'
  + '  const totaux = useMemo(');

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
