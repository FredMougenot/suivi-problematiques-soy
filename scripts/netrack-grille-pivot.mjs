/**
 * Bascule la vue arborescente vers la GRILLE PIVOT.
 *
 *   node scripts/netrack-grille-pivot.mjs
 *
 * A lancer APRES netrack-tiroir-virtuel.mjs : ce script part de la page telle
 * que le precedent l'a laissee.
 *
 * Remplacements exacts ou coupes entre deux reperes uniques. Si un seul motif
 * manque, arret SANS rien ecrire.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');
const CSS = join(process.cwd(), 'src/features/inventaire-netrack/inventaireNetrack.css');

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

function couper(texte, nom, debut, fin, remplacement) {
  const i = texte.indexOf(debut);
  if (i === -1) throw new Error('[' + nom + '] repere de debut introuvable');
  const j = texte.indexOf(fin, i);
  if (j === -1) throw new Error('[' + nom + '] repere de fin introuvable');
  return texte.slice(0, i) + remplacement + texte.slice(j);
}

const page = lire(PAGE);
let t = page.texte;

if (t.includes('GrillePivot')) {
  console.log('Deja applique : la page importe deja GrillePivot. Rien a faire.');
  process.exit(0);
}
if (!t.includes('ArbreNetrack')) {
  throw new Error('Lance d\'abord scripts/netrack-tiroir-virtuel.mjs.');
}

// 1 ─ Imports : le moteur parametrable remplace l'arbre fige.
t = remplacer(t, 'imports',
  "import { construireArbre, toutesLesCles } from './arbre';\n"
  + "import ArbreNetrack from './components/ArbreNetrack';",
  "import {\n"
  + "  construirePivot, toutesLesCles, noeudParCle, AXES_DEFAUT,\n"
  + "} from './pivot';\n"
  + "import GrillePivot from './components/GrillePivot';");

// 2 ─ Le groupe ouvert remplace le lot ouvert : une feuille n'est plus
//     forcement un lot, elle depend du dernier axe choisi.
t = remplacer(t, 'groupeOuvert',
  "  const lotOuvert = params.get('lot') || '';",
  "  const groupeOuvert = params.get('grp') || '';");

// 3 ─ Les axes vivent dans l'URL comme le reste de l'ecran.
t = remplacer(t, 'axes',
  '  const tri = useMemo(() => ({ colonne: triColonne, sens: triSens }), [triColonne, triSens]);',
  '  const tri = useMemo(() => ({ colonne: triColonne, sens: triSens }), [triColonne, triSens]);\n'
  + '\n'
  + '  /**\n'
  + "   * Axes de regroupement. Absents de l'URL = l'arborescence historique,\n"
  + '   * pour qu\'un lien deja partage reste fidele a ce qu\'il montrait.\n'
  + '   */\n'
  + '  const axes = useMemo(() => {\n'
  + "    const brut = (params.get('axes') || '').split(',').map((s) => s.trim()).filter(Boolean);\n"
  + '    return brut.length ? brut : AXES_DEFAUT;\n'
  + '  }, [params]);');

// 4 ─ Construction de la grille.
t = remplacer(t, 'construirePivot',
  '  const arbre = useMemo(\n'
  + "    () => (vue === 'arbre' ? construireArbre(filtrees, tri, rangsNomenclature) : []),\n"
  + '    [vue, filtrees, tri, rangsNomenclature],\n'
  + '  );',
  '  const pivot = useMemo(\n'
  + "    () => (vue === 'arbre' ? construirePivot(filtrees, axes, tri, rangsNomenclature) : []),\n"
  + '    [vue, filtrees, axes, tri, rangsNomenclature],\n'
  + '  );');

// 5 ─ Le detail du tiroir se resout par le CHEMIN du groupe, plus par un
//     couple produit/lot : la feuille peut etre n'importe quel axe.
t = couper(t, 'detailGroupe',
  '  /**\n   * Sous-lots du lot ouvert',
  '  const totaux = useMemo(',
  '  /**\n'
  + '   * Detail de la feuille ouverte dans le tiroir, retrouvee par son chemin.\n'
  + "   * Un groupe qui sort du filtre courant n'existe plus dans la grille : le\n"
  + '   * tiroir se referme de lui-meme, ce qui est coherent avec ce qui est\n'
  + '   * affiche. Les attributs produit ne sortent que si le groupe designe UN\n'
  + '   * produit \u2014 sinon ils n\'auraient pas de valeur unique.\n'
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
  + '\n');

// 6 ─ deplierJusqua opere sur la grille.
t = remplacer(t, 'deplierJusqua',
  '    setDeplies(new Set(toutesLesCles(arbre, niveau)));',
  '    setDeplies(new Set(toutesLesCles(pivot, niveau)));');

// 7 ─ Le tableau.
t = couper(t, 'grille',
  "        ) : vue === 'arbre' ? (",
  "        ) : vue === 'produit' ? (",
  "        ) : vue === 'arbre' ? (\n"
  + '          <GrillePivot\n'
  + '            pivot={pivot}\n'
  + '            axes={axes}\n'
  + '            deplies={deplies}\n'
  + '            tri={tri}\n'
  + '            scrollRef={refScroll}\n'
  + '            cleOuverte={groupeOuvert}\n'
  + "            onAxes={(a) => { setDeplies(new Set()); majParams({ axes: a.join(','), grp: '' }); }}\n"
  + '            onTrier={trierPar}\n'
  + '            onBasculer={basculerGroupe}\n'
  + '            onOuvrir={(n) => majParams({ grp: n.cle })}\n'
  + '            onTrax={sauverTrax}\n'
  + '          />\n');

// 8 ─ Le tiroir.
t = couper(t, 'tiroir',
  '      <TiroirLot',
  '      <EditeurRegle',
  '      <TiroirLot\n'
  + '        detail={detailGroupe}\n'
  + "        onFermer={() => majParams({ grp: '' })}\n"
  + '        onEnregistrerTrax={sauverTrax}\n'
  + '      />\n\n');

// 9 ─ La puce ne promet plus une hierarchie figee.
t = remplacer(t, 'puce',
  '              title="Catégorie → Sous-catégorie → Produit → Lots"\n'
  + '            >Arborescence</button>',
  '              title="Regroupement libre : compose tes propres axes"\n'
  + '            >Grille</button>');

ecrire(PAGE, t, page.crlf);
console.log('OK  InventaireNetrackPage.jsx');

/* ── Feuille de style ────────────────────────────────────────── */

const MARQUE = '/* === Barre d\'axes de la grille pivot === */';

const STYLES = [
  '',
  MARQUE,
  '',
  "/* L'ordre des pastilles EST la hierarchie du tableau : la barre doit se",
  '   lire comme un chemin, pas comme une liste de filtres. */',
  '.nr-axes {',
  '  display: flex;',
  '  flex-wrap: wrap;',
  '  align-items: center;',
  '  gap: 8px;',
  '  padding: 10px 12px;',
  '  margin-bottom: 10px;',
  '  border: 1px solid rgba(255, 255, 255, .10);',
  '  border-radius: var(--r-md);',
  '  backface-visibility: hidden;',
  '}',
  '.nr-axe {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 2px;',
  '  padding: 2px 4px 2px 2px;',
  '  border: 1px solid var(--copper-dim);',
  '  border-radius: var(--r-sm);',
  '  background: var(--bg-hover);',
  '}',
  '.nr-axe-l { padding: 0 4px; color: var(--text-primary); font-size: 13px; }',
  '.nr-axe-fl, .nr-axe-x {',
  '  border: 0;',
  '  background: none;',
  '  cursor: pointer;',
  '  padding: 0 4px;',
  '  line-height: 1;',
  '  font-size: 13px;',
  '  color: var(--text-muted);',
  '}',
  '.nr-axe-fl:hover:not(:disabled), .nr-axe-x:hover { color: var(--copper-light); }',
  '.nr-axe-fl:disabled { opacity: .25; cursor: default; }',
  '.nr-axe-ajout { height: 28px; padding: 0 8px; font-size: 13px; }',
  '',
].join('\n');

const css = lire(CSS);
if (css.texte.includes(MARQUE)) {
  console.log('--  inventaireNetrack.css : styles deja presents');
} else {
  ecrire(CSS, css.texte.trimEnd() + '\n' + STYLES, css.crlf);
  console.log('OK  inventaireNetrack.css');
}

console.log('\nTermine.');
