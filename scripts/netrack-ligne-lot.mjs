/**
 * Script d'application ponctuel — NetRack : mise en forme des lignes de
 * sous-lot dans l'arborescence. A lancer une fois depuis la racine du depot :
 *
 *   node scripts/netrack-ligne-lot.mjs
 *
 * Remplacements de texte exacts, comparaison en LF (les fichiers du disque
 * sont en CRLF sous Windows), reecriture avec les fins de ligne d'origine.
 * S'arrete sans rien ecrire si un motif est introuvable ou ambigu.
 * Relance sans effet de bord. Supprimable apres coup.
 *
 * Ce qui change sur une ligne de detail :
 *   - l'etiquette passe devant le numero de lot, sans le prefixe « etq »
 *   - la date de lot (production) apparait, a gauche du best before
 *   - le numero de commande client (PO d'origine) passe a droite du best
 *     before, la ou la colonne « Produits » n'a de toute facon aucun sens
 *   - un noeud lot n'affiche plus son compteur « 1 » : deplie, il montre
 *     deja ses lignes ; replie, le compte se lit sur le produit
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = 'src/features/inventaire-netrack/InventaireNetrackPage.jsx';

const EDITS = [
  [PAGE,
    `                        <span className="nr-mono">{l.no_lot || '—'}</span>
                        {l.no_sous_lot && <span className="nr-faible"> / {l.no_sous_lot}</span>}
                        {l.etiquette && <span className="nr-faible"> · étq {l.etiquette}</span>}
                      </td>
                      <td className="nr-mono nr-faible">{l.no_comm_client || '—'}</td>
                      <td className="nr-mono nr-jours" data-n={l.niveau_expiration || undefined}>
                        {l.date_expiration || '—'}
                      </td>
                      <td />
                      <td />`,
    `                        {l.etiquette && <span className="nr-faible">{l.etiquette} </span>}
                        <span className="nr-mono">{l.no_lot || '—'}</span>
                        {l.no_sous_lot && <span className="nr-faible"> / {l.no_sous_lot}</span>}
                      </td>
                      <td className="nr-mono nr-faible">{l.date_lot || '—'}</td>
                      <td className="nr-mono nr-jours" data-n={l.niveau_expiration || undefined}>
                        {l.date_expiration || '—'}
                      </td>
                      <td className="nr-mono nr-faible">{l.no_comm_client || '—'}</td>
                      <td />`],

  [PAGE,
    `                    <td className="nr-num">{nb(n.nb_lots)}</td>`,
    `                    <td className="nr-num">{n.est_lot ? '' : nb(n.nb_lots)}</td>`],
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
