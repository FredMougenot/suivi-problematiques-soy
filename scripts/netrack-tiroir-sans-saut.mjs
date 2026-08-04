/**
 * Corrige le double mouvement a l'ouverture du tiroir de creation.
 *
 * L'attribut `autoFocus` laisse le navigateur amener le champ dans le champ
 * de vision. Le champ vit dans un tiroir en position FIXE, mais la page est
 * plus large que la fenetre : le navigateur faisait donc defiler la page
 * horizontalement pour un element qui, lui, ne bougeait pas. Mesure : la
 * surface NetRack passait de left 214 a left 58, puis revenait.
 *
 * On donne le focus nous-memes avec preventScroll : le champ est actif, la
 * page ne bouge pas, et seul le tiroir glisse.
 *
 *   node scripts/netrack-tiroir-sans-saut.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const T = join(
  process.cwd(),
  'src/features/inventaire-netrack/components/TiroirNouvelUsine.jsx',
);

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

const f = lire(T);
let t = f.texte;

if (t.includes('preventScroll')) {
  console.log('Deja applique. Rien a faire.');
  process.exit(0);
}

t = remplacer(t, 'import',
  "import { useEffect, useMemo, useState } from 'react';",
  "import { useEffect, useMemo, useRef, useState } from 'react';");

t = remplacer(t, 'ref',
  '  const [codeLibre, setCodeLibre] = useState(false);',
  '  const [codeLibre, setCodeLibre] = useState(false);\n'
  + '  const refChamp = useRef(null);');

t = remplacer(t, 'focus maitrise',
  '  const resultats = useMemo(() => {',
  '  /**\n'
  + '   * Focus donne a la main plutot que par `autoFocus`.\n'
  + '   *\n'
  + '   * `autoFocus` laisse le navigateur amener le champ dans le champ de\n'
  + '   * vision. Le champ est dans un tiroir FIXE, mais la page est plus large\n'
  + '   * que la fenetre : le navigateur faisait defiler la PAGE pour un\n'
  + '   * element qui ne bouge pas, ce qui produisait un second mouvement\n'
  + "   * pendant le glissement du tiroir. preventScroll supprime ce reflexe.\n"
  + '   */\n'
  + '  useEffect(() => {\n'
  + '    if (!ouvert || !refChamp.current) return;\n'
  + '    refChamp.current.focus({ preventScroll: true });\n'
  + '  }, [ouvert]);\n'
  + '\n'
  + '  const resultats = useMemo(() => {');

t = remplacer(t, 'champ',
  '                className="nr-usine-champ"\n'
  + '                autoFocus\n',
  '                className="nr-usine-champ"\n'
  + '                ref={refChamp}\n');

writeFileSync(T, f.crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8');
console.log('OK  TiroirNouvelUsine.jsx');
console.log('\nTermine.');
