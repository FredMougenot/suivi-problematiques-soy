/**
 * Script d'application ponctuel — NetRack, point 4 : colonnes de
 * l'arborescence definies par niveau. A lancer une fois depuis la racine :
 *
 *   node scripts/netrack-colonnes-par-niveau.mjs
 *
 * Prerequis : netrack-exceptions.mjs doit avoir ete passe avant.
 *
 * PROBLEME CORRIGE — jusqu'ici, les lignes de sous-lot logeaient leurs champs
 * dans les colonnes libres des agregats : la date de lot occupait la colonne
 * TRAXcode, le best before la colonne Description, le PO client la colonne
 * Produits. Ca fonctionnait, mais l'en-tete mentait : la meme colonne voulait
 * dire deux choses selon la ligne lue.
 *
 * Desormais chaque colonne a UN sens, valable partout, et reste vide sur les
 * niveaux ou elle n'a rien a dire :
 *
 *   Libelle       tous
 *   TRAXcode      produit
 *   Description   produit
 *   PO client     sous-lot
 *   Produits      categorie, sous-categorie
 *   Lots          categorie, sous-categorie
 *   Qte / Poids   tous
 *   Date lot      sous-lot
 *   Best before   sous-lot
 *   Jours rest.   tous (agregat = son lot le plus urgent)
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
    `/** Colonnes de la vue arborescente. */
export const COLONNES_ARBRE = [
  { cle: 'libelle', libelle: 'Catégorie / Sous-catégorie / Produit / Lot' },
  { cle: 'trax_code', libelle: 'TRAXcode' },
  { cle: 'description', libelle: 'Description' },
  { cle: 'nb_produits', libelle: 'Produits', num: true },
  { cle: 'nb_lots', libelle: 'Lots', num: true },
  { cle: 'qte', libelle: 'Qté totale', num: true },
  { cle: 'poids', libelle: 'Poids total', num: true },
  { cle: 'jours_min', libelle: 'Plus proche exp.', num: true },
];`,
    `/**
 * Colonnes de la vue arborescente.
 *
 * Chaque colonne a UN sens, valable a tous les niveaux. Une colonne qui n'a
 * rien a dire sur un niveau reste vide : elle n'est jamais detournee pour
 * loger un autre champ. C'est ce qui permet de lire un en-tete et de savoir
 * ce qu'on regarde, quelle que soit la ligne.
 *
 * \`niveaux\` documente qui remplit quoi :
 *   groupe = categorie et sous-categorie
 *   produit, lot = les noeuds correspondants
 *   detail = la ligne de sous-lot, feuille de l'arbre
 */
export const COLONNES_ARBRE = [
  { cle: 'libelle', libelle: 'Catégorie / Sous-catégorie / Produit / Lot', niveaux: 'tous' },
  { cle: 'trax_code', libelle: 'TRAXcode', niveaux: 'produit' },
  { cle: 'description', libelle: 'Description', niveaux: 'produit' },
  { cle: 'no_comm_client', libelle: 'PO client', niveaux: 'detail' },
  { cle: 'nb_produits', libelle: 'Produits', num: true, niveaux: 'groupe' },
  { cle: 'nb_lots', libelle: 'Lots', num: true, niveaux: 'groupe, produit' },
  { cle: 'qte', libelle: 'Qté totale', num: true, niveaux: 'tous' },
  { cle: 'poids', libelle: 'Poids total', num: true, niveaux: 'tous' },
  { cle: 'date_lot', libelle: 'Date lot', niveaux: 'detail' },
  { cle: 'date_expiration', libelle: 'Best before', niveaux: 'detail' },
  { cle: 'jours_min', libelle: 'Jours rest.', num: true, niveaux: 'tous' },
];`],

  [PAGE,
    `                      <td className="nr-mono nr-faible">{l.date_lot || '—'}</td>
                      <td className="nr-mono nr-jours" data-n={l.niveau_expiration || undefined}>
                        {l.date_expiration || '—'}
                      </td>
                      <td className="nr-mono nr-faible">{l.no_comm_client || '—'}</td>
                      <td />
                      <td className="nr-num">{nb(l.unite2_qte_inv)}</td>
                      <td className="nr-num">{l.poids_total === null ? '—' : nb(l.poids_total)}</td>
                      <td className="nr-num nr-jours" data-n={l.niveau_expiration || undefined}>
                        {l.jours_expiration === null ? '—' : nb(l.jours_expiration)}
                      </td>`,
    `                      <td />
                      <td />
                      <td className="nr-mono nr-faible">{l.no_comm_client || '—'}</td>
                      <td />
                      <td />
                      <td className="nr-num">{nb(l.unite2_qte_inv)}</td>
                      <td className="nr-num">{l.poids_total === null ? '—' : nb(l.poids_total)}</td>
                      <td className="nr-mono nr-faible">{l.date_lot || '—'}</td>
                      <td className="nr-mono nr-jours" data-n={l.niveau_expiration || undefined}>
                        {l.date_expiration || '—'}
                      </td>
                      <td className="nr-num nr-jours" data-n={l.niveau_expiration || undefined}>
                        {l.jours_expiration === null ? '—' : nb(l.jours_expiration)}
                      </td>`],

  [PAGE,
    `                    <td className={'nr-desc' + (estProduit ? '' : ' nr-faible')}>
                      {estProduit ? (n.description || '—') : ''}
                    </td>
                    <td className="nr-num">{n.est_lot ? '' : nb(n.nb_produits)}</td>`,
    `                    <td className={'nr-desc' + (estProduit ? '' : ' nr-faible')}>
                      {estProduit ? (n.description || '—') : ''}
                    </td>
                    {/* PO client : porte par la ligne de detail, pas par un agregat. */}
                    <td />
                    <td className="nr-num">{estProduit || n.est_lot ? '' : nb(n.nb_produits)}</td>`],

  [PAGE,
    `                      {n.nb_poids_connus > 0 && n.nb_poids_connus < n.nb_lots && (
                        <span className="nr-partiel"> ({Math.round(n.nb_poids_connus / n.nb_lots * 100)} %)</span>
                      )}
                    </td>`,
    `                      {n.nb_poids_connus > 0 && n.nb_poids_connus < n.nb_lots && (
                        <span className="nr-partiel"> ({Math.round(n.nb_poids_connus / n.nb_lots * 100)} %)</span>
                      )}
                    </td>
                    {/* Dates : elles appartiennent au sous-lot. Un agregat n'a
                        qu'une echeance, celle de son lot le plus urgent, et
                        elle se lit dans « Jours rest. ». */}
                    <td />
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
