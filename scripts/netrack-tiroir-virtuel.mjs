/**
 * Branche l'arborescence virtualisee et le tiroir de lot sur la page
 * Inventaire NetRack.
 *
 *   node scripts/netrack-tiroir-virtuel.mjs
 *
 * Remplacements de texte exacts ou coupes entre deux reperes uniques. Si un
 * seul motif manque, le script s'arrete SANS rien ecrire : mieux vaut ne rien
 * faire que laisser un fichier a moitie modifie.
 *
 * Les fichiers locaux sont en CRLF : la comparaison se fait en LF et la
 * reecriture restitue les fins de ligne d'origine.
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

/** Remplacement exact : exige une occurrence et une seule. */
function remplacer(texte, nom, avant, apres) {
  const n = texte.split(avant).length - 1;
  if (n !== 1) throw new Error('[' + nom + '] motif trouve ' + n + ' fois, attendu 1');
  return texte.replace(avant, apres);
}

/** Coupe entre deux reperes : le debut est remplace, la fin est conservee. */
function couper(texte, nom, debut, fin, remplacement) {
  const i = texte.indexOf(debut);
  if (i === -1) throw new Error('[' + nom + '] repere de debut introuvable');
  const j = texte.indexOf(fin, i);
  if (j === -1) throw new Error('[' + nom + '] repere de fin introuvable');
  return texte.slice(0, i) + remplacement + texte.slice(j);
}

const page = lire(PAGE);
let t = page.texte;

if (t.includes('ArbreNetrack')) {
  console.log('Deja applique : la page importe deja ArbreNetrack. Rien a faire.');
  process.exit(0);
}

// 1 ─ Imports.
t = remplacer(t, 'imports',
  "import { construireArbre, COLONNES_ARBRE, toutesLesCles } from './arbre';",
  "import { construireArbre, toutesLesCles } from './arbre';\n"
  + "import ArbreNetrack from './components/ArbreNetrack';\n"
  + "import TiroirLot from './components/TiroirLot';\n"
  + "import { ChampTrax } from './components/ChampTrax';");

// 2 ─ L'indentation est desormais l'affaire d'ArbreNetrack.
t = remplacer(t, 'INDENT',
  "/** Decalage horizontal d'un niveau d'arborescence, en pixels. */\nconst INDENT = 22;\n\n",
  '');

// 3 ─ ChampTrax quitte la page : il est partage avec l'arbre et le tiroir.
t = couper(t, 'ChampTrax',
  "/**\n * Saisie du TRAXcode d'un produit.",
  "/**\n * Bandeau d'exceptions",
  '');

// 4 ─ BadgeCompte et aplatirArbre partent aussi ; les deux blocs se suivent
//     jusqu'au composant de page, une seule coupe suffit.
t = couper(t, 'BadgeCompte + aplatirArbre',
  '/**\n * Badge du compte NetRack',
  'export default function InventaireNetrackPage() {',
  '');

// 5 ─ Le lot ouvert est un parametre d'URL, comme le reste de l'ecran.
t = remplacer(t, 'lotOuvert',
  "  const triColonne = params.get('tri') || 'no_produit';",
  "  const lotOuvert = params.get('lot') || '';\n"
  + "  const triColonne = params.get('tri') || 'no_produit';");

// 6 ─ Reference vers l'element qui defile : c'est lui que mesure le virtualiseur.
t = remplacer(t, 'refScroll',
  '  const [deplies, setDeplies] = useState(() => new Set());',
  '  const refScroll = useRef(null);\n'
  + '  const [deplies, setDeplies] = useState(() => new Set());');

// 7 ─ L'aplatissement descend dans ArbreNetrack ; a la place, le detail du lot.
t = remplacer(t, 'lignesArbre -> detailLot',
  '  const lignesArbre = useMemo(\n'
  + "    () => (vue === 'arbre' ? aplatirArbre(arbre, deplies) : []),\n"
  + '    [vue, arbre, deplies],\n'
  + '  );',
  '  /**\n'
  + '   * Sous-lots du lot ouvert dans le tiroir. Resolu depuis les lignes\n'
  + "   * filtrees plutot que depuis l'arbre : le parametre d'URL reste lisible\n"
  + '   * et un lien partage rouvre le bon tiroir sans dependre de la forme\n'
  + '   * interne des cles de noeuds. Un lot qui sort du filtre courant perd\n'
  + '   * son detail et le tiroir se referme : cohérent avec ce qui est affiche.\n'
  + '   */\n'
  + '  const detailLot = useMemo(() => {\n'
  + '    if (!lotOuvert) return null;\n'
  + "    const sep = lotOuvert.indexOf('~');\n"
  + '    const prod = sep === -1 ? lotOuvert : lotOuvert.slice(0, sep);\n'
  + "    const lot = sep === -1 ? '' : lotOuvert.slice(sep + 1);\n"
  + '    const lignesLot = filtrees.filter(\n'
  + "      (l) => l.no_produit === prod && (l.no_lot || '') === lot,\n"
  + '    );\n'
  + '    if (!lignesLot.length) return null;\n'
  + '    return {\n'
  + '      no_produit: prod, no_lot: lot, lignes: lignesLot, produit: lignesLot[0],\n'
  + '    };\n'
  + '  }, [lotOuvert, filtrees]);');

// 8 ─ La coquille borne sa hauteur en vue arbre : sans fenetre, rien a
//     virtualiser et l'en-tete ne peut pas coller.
t = remplacer(t, 'coquille',
  '      <div className="table-shell dt-glow nr-scroll">',
  '      <div\n'
  + "        className={'table-shell dt-glow nr-scroll' + (vue === 'arbre' ? ' nr-virt' : '')}\n"
  + '        ref={refScroll}\n'
  + '      >');

// 9 ─ Le tableau de l'arbre laisse place au composant dedie.
t = couper(t, 'tableau arbre',
  "        ) : vue === 'arbre' ? (",
  "        ) : vue === 'produit' ? (",
  "        ) : vue === 'arbre' ? (\n"
  + '          <ArbreNetrack\n'
  + '            arbre={arbre}\n'
  + '            deplies={deplies}\n'
  + '            tri={tri}\n'
  + '            scrollRef={refScroll}\n'
  + '            lotOuvert={lotOuvert}\n'
  + '            onTrier={trierPar}\n'
  + '            onBasculer={basculerGroupe}\n'
  + "            onOuvrirLot={(n) => majParams({ lot: n.no_produit + '~' + (n.no_lot || '') })}\n"
  + '            onTrax={sauverTrax}\n'
  + '          />\n');

// 10 ─ Le tiroir, monte au meme niveau que la modale de regles.
t = remplacer(t, 'tiroir',
  '      <EditeurRegle',
  '      <TiroirLot\n'
  + '        detail={detailLot}\n'
  + "        onFermer={() => majParams({ lot: '' })}\n"
  + '        onEnregistrerTrax={sauverTrax}\n'
  + '      />\n\n'
  + '      <EditeurRegle');

ecrire(PAGE, t, page.crlf);
console.log('OK  InventaireNetrackPage.jsx');

/* ── Feuille de style ────────────────────────────────────────── */

const MARQUE = '/* === Arborescence virtualisee + tiroir de lot === */';

const STYLES = [
  '',
  MARQUE,
  '',
  "/* La coquille borne sa hauteur : c'est la fenetre que mesure le virtualiseur,",
  "   et c'est ce qui permet a l'en-tete de coller. Sans hauteur bornee, la page",
  '   defilait sur 47 000 px et l\'en-tete disparaissait au premier geste. */',
  '.nr-virt { max-height: calc(100vh - 340px); overflow: auto; }',
  '.nr-virt thead th {',
  '  position: sticky;',
  '  top: 0;',
  '  z-index: 4;',
  '  background: rgba(18, 32, 48, .98);',
  '  backface-visibility: hidden;',
  '}',
  '',
  '/* Largeurs figees : seule une fenetre de lignes est montee, une largeur',
  '   calculee sur le contenu sauterait a chaque defilement. */',
  '.nr-arbre-table { table-layout: fixed; width: 100%; }',
  '.nr-espace td { background: none; }',
  '',
  '.nr-lot-feuille { cursor: pointer; }',
  '.nr-lot-feuille[aria-selected="true"] {',
  '  background: var(--bg-active);',
  '  box-shadow: inset 3px 0 0 var(--copper);',
  '}',
  '',
  '/* Valeur agregee sur plusieurs sous-lots : signalee, jamais silencieuse. */',
  '[data-multiple="1"] { color: var(--text-muted); font-style: italic; }',
  '',
  "/* position: fixed tient parce qu'aucun ancetre de la surface ne porte de",
  '   transform : regle du hub, ne pas la casser avec un translateZ ici. */',
  '.nr-tiroir-voile {',
  '  position: fixed;',
  '  inset: 0;',
  '  background: rgba(0, 0, 0, .45);',
  '  z-index: 59;',
  '  backface-visibility: hidden;',
  '}',
  '.nr-tiroir {',
  '  position: fixed;',
  '  top: 0; right: 0; bottom: 0;',
  '  width: 520px;',
  '  max-width: 94vw;',
  '  z-index: 60;',
  '  display: flex;',
  '  flex-direction: column;',
  '  background: var(--bg-raised);',
  '  border-left: 1px solid rgba(255, 255, 255, .14);',
  '  box-shadow: var(--shadow-xl);',
  '  backface-visibility: hidden;',
  '}',
  '.nr-tiroir-tete {',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: space-between;',
  '  gap: 12px;',
  '  padding: 16px 18px;',
  '  border-bottom: 1px solid rgba(255, 255, 255, .10);',
  '}',
  '.nr-tiroir-sur {',
  '  font-size: 11px;',
  '  letter-spacing: .12em;',
  '  text-transform: uppercase;',
  '  color: var(--text-muted);',
  '}',
  '.nr-tiroir-titre { font-size: 20px; color: var(--text-primary); }',
  '.nr-tiroir-corps {',
  '  flex: 1;',
  '  overflow: auto;',
  '  padding: 16px 18px 28px;',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 16px;',
  '}',
  '.nr-tiroir-val { font-size: 15px; color: var(--text-primary); }',
  '.nr-tiroir-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }',
  '.nr-tiroir-lbl {',
  '  font-size: 11px;',
  '  letter-spacing: .08em;',
  '  text-transform: uppercase;',
  '  color: var(--text-muted);',
  '  margin-bottom: 2px;',
  '}',
  '.nr-tiroir-totaux {',
  '  display: flex;',
  '  gap: 18px;',
  '  flex-wrap: wrap;',
  '  padding: 10px 12px;',
  '  border: 1px solid rgba(255, 255, 255, .10);',
  '  border-radius: var(--r-md);',
  '  color: var(--text-secondary);',
  '  backface-visibility: hidden;',
  '}',
  '',
  '@media (max-width: 720px) {',
  '  .nr-tiroir { width: 100%; }',
  '  .nr-tiroir-grille { grid-template-columns: 1fr; }',
  '}',
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
