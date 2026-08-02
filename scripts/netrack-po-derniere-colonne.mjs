/**
 * Script d'application ponctuel — NetRack : le PO client passe en DERNIERE
 * colonne de l'arborescence. A lancer une fois depuis la racine :
 *
 *   node scripts/netrack-po-derniere-colonne.mjs
 *
 * Prerequis : netrack-colonnes-par-niveau.mjs doit avoir ete passe avant.
 *
 * Nouvel ordre : Libelle, TRAXcode, Description, Produits, Lots, Qte, Poids,
 * Date lot, Best before, Jours rest., PO client.
 *
 * Remplacements de texte exacts, comparaison en LF, reecriture avec les fins
 * de ligne d'origine. S'arrete sans rien ecrire si un motif est introuvable
 * ou ambigu. Relance sans effet de bord.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = 'src/features/inventaire-netrack/InventaireNetrackPage.jsx';
const ARBRE = 'src/features/inventaire-netrack/arbre.js';

const EDITS = [
  [ARBRE,
    `  { cle: 'no_comm_client', libelle: 'PO client', niveaux: 'detail' },
  { cle: 'nb_produits'`,
    `  { cle: 'nb_produits'`],

  [ARBRE,
    `  { cle: 'jours_min', libelle: 'Jours rest.', num: true, niveaux: 'tous' },
];`,
    `  { cle: 'jours_min', libelle: 'Jours rest.', num: true, niveaux: 'tous' },
  { cle: 'no_comm_client', libelle: 'PO client', niveaux: 'detail' },
];`],

  [PAGE,
    `                      <td />
                      <td />
                      <td className="nr-mono nr-faible">{l.no_comm_client || '—'}</td>
                      <td />
                      <td />
                      <td className="nr-num">{nb(l.unite2_qte_inv)}</td>`,
    `                      <td />
                      <td />
                      <td />
                      <td />
                      <td className="nr-num">{nb(l.unite2_qte_inv)}</td>`],

  [PAGE,
    `                      <td className="nr-num nr-jours" data-n={l.niveau_expiration || undefined}>
                        {l.jours_expiration === null ? '—' : nb(l.jours_expiration)}
                      </td>
                    </tr>`,
    `                      <td className="nr-num nr-jours" data-n={l.niveau_expiration || undefined}>
                        {l.jours_expiration === null ? '—' : nb(l.jours_expiration)}
                      </td>
                      <td className="nr-mono nr-faible">{l.no_comm_client || '—'}</td>
                    </tr>`],

  [PAGE,
    `                    {/* PO client : porte par la ligne de detail, pas par un agregat. */}
                    <td />
                    <td className="nr-num">{estProduit || n.est_lot ? '' : nb(n.nb_produits)}</td>`,
    `                    <td className="nr-num">{estProduit || n.est_lot ? '' : nb(n.nb_produits)}</td>`],

  [PAGE,
    `                    <td className="nr-num nr-jours" data-n={n.niveau || undefined}>
                      {n.jours_min === null ? '—' : nb(n.jours_min)}
                    </td>`,
    `                    <td className="nr-num nr-jours" data-n={n.niveau || undefined}>
                      {n.jours_min === null ? '—' : nb(n.jours_min)}
                    </td>
                    {/* PO client : porte par la ligne de detail, pas par un agregat. */}
                    <td />`],
];

const contenus = new Map();
const avaitCrlf = new Map();

const lire = (f) => {
  if (!contenus.has(f)) {
    const brut = readFileSync(f, 'utf8');
    avaitCrlf.set(f, brut.includes('\r\n'));
    contenus.set(f, brut.split('\r\n').join('\n'));
  }
  return contenus.get(f);
};

let appliques = 0;
let deja = 0;

for (const [fichier, motif, remplacement] of EDITS) {
  const contenu = lire(fichier);
  if (contenu.includes(remplacement)) { deja += 1; continue; }
  const n = contenu.split(motif).length - 1;
  if (n !== 1) {
    console.error(`\nECHEC — motif trouve ${n} fois dans ${fichier} :\n${motif}\n`);
    console.error("Aucun fichier n'a ete modifie. Le depot est intact.");
    process.exit(1);
  }
  contenus.set(fichier, contenu.replace(motif, remplacement));
  appliques += 1;
}

for (const [f, contenu] of contenus) {
  const sortie = avaitCrlf.get(f) ? contenu.split('\n').join('\r\n') : contenu;
  writeFileSync(f, sortie, 'utf8');
}

console.log(`${appliques} modification(s) appliquee(s), ${deja} deja en place.`);
console.log('Verifiez la page NetRack, puis commitez.');
