/**
 * Plus d'etat « aucune categorie » : la page bascule automatiquement sur
 * TOUTES.
 *
 * Le tableau vide au chargement etait une optimisation, pas un etat voulu —
 * et il devenait un piege : une URL sans `cat` n'affichait rien, sans que
 * rien a l'ecran n'explique pourquoi. Desormais l'absence de choix se
 * resout d'elle-meme vers Toutes.
 *
 *   node scripts/netrack-toutes-par-defaut.mjs
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

if (page.texte.includes('categorieInitialisee')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

const t = remplacer(page.texte, 'bascule vers Toutes',
  "    if (!vueBrute) majParams({ vue: 'arbre' });\n"
  + '  }, [vueBrute, majParams]);',
  "    if (!vueBrute) majParams({ vue: 'arbre' });\n"
  + '  }, [vueBrute, majParams]);\n'
  + '\n'
  + '  /**\n'
  + '   * Aucune categorie choisie = etat transitoire, jamais un ecran vide.\n'
  + "   * On bascule sur TOUTES ('*'), qui est un choix explicite et le reste\n"
  + "   * dans l'URL. Sans cela, une vieille URL ou un desistement laissaient un\n"
  + '   * tableau vide sans explication.\n'
  + '   */\n'
  + '  const categorieInitialisee = useRef(false);\n'
  + '  useEffect(() => {\n'
  + '    if (categorieInitialisee.current) return;\n'
  + '    categorieInitialisee.current = true;\n'
  + "    if (!categorie) majParams({ cat: '*' });\n"
  + '  }, [categorie, majParams]);');

writeFileSync(PAGE, page.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  InventaireNetrackPage.jsx');
console.log('\nTermine.');
