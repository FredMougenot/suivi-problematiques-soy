/**
 * Travail a plusieurs sur le stock usine : temps reel ET rafraichissement
 * periodique.
 *
 * Les deux, parce qu'aucun ne suffit seul :
 *   - le temps reel previent immediatement, mais une connexion qui tombe et
 *     se retablit fait rater des evenements SANS le dire. On se croit a jour
 *     alors qu'on ne l'est pas \u2014 pire que pas de temps reel du tout.
 *   - le rafraichissement periodique ne rate rien mais arrive en retard.
 *
 * Ensemble : l'immediatete du premier, le filet du second.
 *
 *   node scripts/netrack-temps-reel.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const Q = join(process.cwd(), 'src/features/inventaire-netrack/queries.js');
const U = join(process.cwd(), 'src/features/inventaire-netrack/usine.js');
const PAGE = join(process.cwd(), 'src/features/inventaire-netrack/InventaireNetrackPage.jsx');

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

/* ── 1. Fraicheur de la requete d'inventaire ── */

const q = lire(Q);

if (q.texte.includes('refetchOnWindowFocus')) {
  console.log('--  queries.js : deja applique');
} else {
  const t = remplacer(q.texte, 'fraicheur',
    "    queryKey: ['inventaire_netrack'],\n"
    + '    staleTime: 5 * 60 * 1000,',
    "    queryKey: ['inventaire_netrack'],\n"
    + '    // 30 s au lieu de 5 min : a plusieurs, deux personnes pouvaient\n'
    + '    // saisir le meme lot sans se voir pendant tout ce temps.\n'
    + '    staleTime: 30 * 1000,\n'
    + '    // Filet de securite : au retour sur l\'onglet et toutes les 60 s,\n'
    + '    // meme si le temps reel a rate un evenement.\n'
    + '    refetchOnWindowFocus: true,\n'
    + '    refetchInterval: 60 * 1000,');
  ecrire(Q, t, q.crlf);
  console.log('OK  queries.js');
}

/* ── 2. Abonnement temps reel ── */

const u = lire(U);

if (u.texte.includes('useTempsReelUsine')) {
  console.log('--  usine.js : deja applique');
} else {
  const bloc = '\n'
    + '/**\n'
    + " * Abonnement aux changements de `usine_stock`.\n"
    + ' *\n'
    + " * Le navigateur ouvre un canal vers Supabase et se fait prevenir des\n"
    + " * qu'une ligne bouge, au lieu d'attendre la prochaine interrogation.\n"
    + ' *\n'
    + ' * Deux precautions :\n'
    + " *   - le canal est FERME au demontage. Sans cela on en accumule un par\n"
    + ' *     navigation, et chaque evenement declenche autant de rechargements.\n'
    + " *   - on ne se fie pas au contenu de l'evenement pour mettre le cache a\n"
    + ' *     jour : on invalide, et la requete refait le tour. Appliquer le\n'
    + " *     payload a la main desynchroniserait au premier evenement rate.\n"
    + ' *\n'
    + ' * Le rafraichissement periodique de la requete reste indispensable : une\n'
    + ' * coupure de canal fait rater des evenements sans avertissement.\n'
    + ' */\n'
    + 'export function useTempsReelUsine() {\n'
    + '  const qc = useQueryClient();\n'
    + '\n'
    + '  useEffect(() => {\n'
    + '    const canal = supabase\n'
    + "      .channel('usine_stock')\n"
    + '      .on(\n'
    + "        'postgres_changes',\n"
    + "        { event: '*', schema: 'public', table: 'usine_stock' },\n"
    + "        () => qc.invalidateQueries({ queryKey: ['inventaire_netrack'] }),\n"
    + '      )\n'
    + '      .subscribe();\n'
    + '\n'
    + '    return () => { supabase.removeChannel(canal); };\n'
    + '  }, [qc]);\n'
    + '}\n';

  let t = remplacer(u.texte, 'import',
    "import { useMutation, useQueryClient } from '@tanstack/react-query';",
    "import { useEffect } from 'react';\n"
    + "import { useMutation, useQueryClient } from '@tanstack/react-query';");

  ecrire(U, t.trimEnd() + '\n' + bloc, u.crlf);
  console.log('OK  usine.js');
}

/* ── 3. La page s'abonne ── */

const page = lire(PAGE);

if (page.texte.includes('useTempsReelUsine()')) {
  console.log('--  InventaireNetrackPage.jsx : deja applique');
} else {
  let t = remplacer(page.texte, 'import',
    "import { useAjouterUsine, useModifierUsine, useSupprimerUsine } from './usine';",
    "import {\n"
    + '  useAjouterUsine, useModifierUsine, useSupprimerUsine, useTempsReelUsine,\n'
    + "} from './usine';");

  t = remplacer(t, 'appel',
    '  const ajouterUsine = useAjouterUsine();',
    '  useTempsReelUsine();\n'
    + '  const ajouterUsine = useAjouterUsine();');

  ecrire(PAGE, t, page.crlf);
  console.log('OK  InventaireNetrackPage.jsx');
}

console.log('\nLa table est deja publiee cote base (publication supabase_realtime');
console.log('et replica identity full).');
console.log('\nTermine.');
