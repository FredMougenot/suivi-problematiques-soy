/**
 * Le tiroir occupe la moitie de l'ecran, glisse a l'ouverture ET a la
 * fermeture, et reste OPAQUE.
 *
 * La fermeture animee demande une mecanique : sans elle, React demonte le
 * tiroir des le clic et il disparait avant d'avoir glisse. On marque donc un
 * etat « en fermeture », on laisse l'animation se jouer, puis on previent le
 * parent.
 *
 * L'opacite est une exception assumee sur cet ecran : partout ailleurs les
 * surfaces laissent transparaitre le fond, mais ici on saisit des donnees et
 * on lit un tableau par-dessus un autre tableau. Le texte du dessous
 * rendrait les deux illisibles.
 *
 *   node scripts/netrack-tiroir-glissant.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const T = join(process.cwd(), 'src/features/inventaire-netrack/components/TiroirLot.jsx');
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

const f = lire(T);
let t = f.texte;

if (t.includes('DUREE_FERMETURE')) {
  console.log('--  TiroirLot.jsx : deja applique');
} else {
  t = remplacer(t, 'etat de fermeture',
    'export default function TiroirLot({\n'
    + '  detail, onFermer, onEnregistrerTrax, ajouterUsine, modifierUsine, supprimerUsine,\n'
    + '}) {\n'
    + '  useEffect(() => {\n'
    + '    if (!detail) return undefined;\n'
    + "    const onKey = (e) => { if (e.key === 'Escape') onFermer(); };\n"
    + "    window.addEventListener('keydown', onKey);\n"
    + "    return () => window.removeEventListener('keydown', onKey);\n"
    + '  }, [detail, onFermer]);\n'
    + '\n'
    + '  if (!detail) return null;',
    '/** Doit rester synchronise avec la duree de nr-tiroir-sortie en CSS. */\n'
    + 'const DUREE_FERMETURE = 200;\n'
    + '\n'
    + 'export default function TiroirLot({\n'
    + '  detail, onFermer, onEnregistrerTrax, ajouterUsine, modifierUsine, supprimerUsine,\n'
    + '}) {\n'
    + '  // React demonterait le tiroir des le clic : on laisse l\'animation se\n'
    + '  // jouer avant de prevenir le parent.\n'
    + '  const [ferme, setFerme] = useState(false);\n'
    + '\n'
    + '  const fermer = useCallback(() => {\n'
    + '    setFerme(true);\n'
    + '    setTimeout(onFermer, DUREE_FERMETURE);\n'
    + '  }, [onFermer]);\n'
    + '\n'
    + '  // Un nouveau groupe rouvre un tiroir neuf, jamais un tiroir en fuite.\n'
    + '  useEffect(() => { setFerme(false); }, [detail && detail.chemin.join()]);\n'
    + '\n'
    + '  useEffect(() => {\n'
    + '    if (!detail) return undefined;\n'
    + "    const onKey = (e) => { if (e.key === 'Escape') fermer(); };\n"
    + "    window.addEventListener('keydown', onKey);\n"
    + "    return () => window.removeEventListener('keydown', onKey);\n"
    + '  }, [detail, fermer]);\n'
    + '\n'
    + '  if (!detail) return null;');

  t = remplacer(t, 'import useCallback',
    "import { useEffect, useState } from 'react';",
    "import { useCallback, useEffect, useState } from 'react';");

  t = remplacer(t, 'voile',
    '      <div className="nr-tiroir-voile" onClick={onFermer} aria-hidden="true" />\n'
    + '      <aside className="nr-tiroir" role="dialog" aria-label={\'Détail \' + titre}>',
    '      <div\n'
    + '        className="nr-tiroir-voile"\n'
    + '        data-ferme={ferme ? \'1\' : undefined}\n'
    + '        onClick={fermer}\n'
    + '        aria-hidden="true"\n'
    + '      />\n'
    + '      <aside\n'
    + '        className="nr-tiroir"\n'
    + '        data-ferme={ferme ? \'1\' : undefined}\n'
    + '        role="dialog"\n'
    + "        aria-label={'Détail ' + titre}\n"
    + '      >');

  t = remplacer(t, 'bouton fermer',
    '          <button className="btn btn-secondary" onClick={onFermer} aria-label="Fermer">✕</button>',
    '          <button className="btn btn-secondary" onClick={fermer} aria-label="Fermer">✕</button>');

  ecrire(T, t, f.crlf);
  console.log('OK  TiroirLot.jsx');
}

const MARQUE = '/* === Tiroir : moitie d\'ecran, glissant, opaque === */';

const STYLES = [
  '',
  MARQUE,
  '',
  '@keyframes nr-tiroir-entree { from { transform: translateX(100%); } }',
  '@keyframes nr-tiroir-sortie { to   { transform: translateX(100%); } }',
  '@keyframes nr-voile-entree  { from { opacity: 0; } }',
  '@keyframes nr-voile-sortie  { to   { opacity: 0; } }',
  '',
  '.nr-tiroir {',
  '  width: 50vw;',
  '  max-width: none;',
  '',
  "  /* OPAQUE, exception assumee sur cet ecran : on saisit des donnees et on",
  '     lit un tableau par-dessus un autre tableau. Le texte du dessous',
  '     rendrait les deux illisibles. */',
  '  background: #0d1720;',
  '',
  '  animation: nr-tiroir-entree 220ms var(--ease-out, cubic-bezier(.22,1,.36,1));',
  '  will-change: transform;',
  '}',
  '.nr-tiroir[data-ferme="1"] {',
  '  animation: nr-tiroir-sortie 200ms var(--ease, ease) forwards;',
  '}',
  '',
  '.nr-tiroir-voile { animation: nr-voile-entree 220ms ease; }',
  '.nr-tiroir-voile[data-ferme="1"] { animation: nr-voile-sortie 200ms ease forwards; }',
  '',
  '@media (max-width: 1100px) { .nr-tiroir { width: 70vw; } }',
  '@media (max-width: 720px)  { .nr-tiroir { width: 100vw; } }',
  '',
  '@media (prefers-reduced-motion: reduce) {',
  '  .nr-tiroir, .nr-tiroir-voile,',
  '  .nr-tiroir[data-ferme="1"], .nr-tiroir-voile[data-ferme="1"] { animation: none; }',
  '}',
  '',
  "/* La grille du formulaire respire mieux sur une demi-largeur. */",
  '@media (min-width: 1101px) {',
  '  .nr-usine-grille { grid-template-columns: repeat(3, 1fr); }',
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
