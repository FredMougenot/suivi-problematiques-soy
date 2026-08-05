/**
 * Grille pivot de l'inventaire.
 *
 * ══ CE QUI CHANGE PAR RAPPORT A L'ARBRE ════════════════════════════
 * L'arborescence Categorie → Sous-categorie → Produit → Lot etait figee :
 * elle repondait toujours a « comment mon referentiel est-il range ». Ici la
 * hierarchie est une LISTE D'AXES que l'utilisateur compose. L'ancien arbre
 * n'est plus qu'une configuration parmi d'autres — celle par defaut.
 *
 * ══ CONSEQUENCE SUR LES COLONNES ═══════════════════════════════════
 * Comme n'importe quel axe peut se retrouver a n'importe quel niveau, une
 * colonne ne peut plus dire « je ne me remplis qu'au niveau lot ». Chaque
 * colonne s'agrege donc toute seule, a tous les niveaux :
 *   - les quantites et poids s'additionnent
 *   - les jours restants prennent le MINIMUM (le lot le plus urgent commande)
 *   - les produits et lots se comptent en valeurs DISTINCTES
 *   - tout champ texte collecte ses valeurs distinctes : une seule valeur, on
 *     l'affiche ; plusieurs, on affiche leur nombre. Jamais la premiere —
 *     158 lots sur 668 portent plusieurs PO client, en montrer un seul serait
 *     faux une fois sur quatre.
 *
 * Le comptage de lots devient d'ailleurs juste : l'ancien `nb_lots` comptait
 * les LIGNES (5 658), pas les lots (624).
 */

import { nombre, niveauExpiration } from './logic';

export const SANS_CATEGORIE = '(sans catégorie)';

/**
 * Hierarchie affichee. Categorie et sous-categorie n'y figurent plus :
 * elles sont choisies en amont sur les deux lignes de valeurs, donc les
 * remettre ici produirait un arbre a un seul noeud. Le tableau reprend a
 * partir de ce que ce choix laisse : les produits, puis leurs lots.
 *
 * Le moteur reste parametrable (voir AXES) : c'est la commande visible qui
 * a ete retiree, pas la capacite.
 */
export const AXES_DEFAUT = ['produit', 'lot'];

/**
 * Axes de regroupement disponibles.
 *
 * `optionnel` : une valeur vide ne cree PAS de noeud « (sans …) », la ligne
 * remonte simplement au niveau suivant. C'est la regle posee pour les
 * sous-categories — un noeud vide n'apprend rien et ajoute un clic. La
 * categorie, elle, n'est pas optionnelle : un trou de referentiel doit se
 * voir.
 *
 * `ordre` : liste de libelles imposant un ordre metier plutot qu'alphabetique
 * (une tranche d'expiration se lit du plus urgent au moins urgent).
 *
 * `nomenclature` : le rang vient de base_reference_categories.
 */
export const AXES = {
  compte: {
    libelle: 'Compte',
    valeur: (l) => l.client,
    vide: '(sans compte)',
  },
  client: {
    libelle: 'Client',
    valeur: (l) => l.client_regle,
    vide: '(sans client)',
  },
  categorie: {
    libelle: 'Catégorie',
    valeur: (l) => l.categorie,
    vide: SANS_CATEGORIE,
    nomenclature: (l) => l.categorie || SANS_CATEGORIE,
  },
  sous_categorie: {
    libelle: 'Sous-catégorie',
    valeur: (l) => l.sous_categorie,
    optionnel: true,
    nomenclature: (l) => (l.categorie || SANS_CATEGORIE) + '\u0000' + l.sous_categorie,
  },
  produit: {
    libelle: 'Produit',
    valeur: (l) => l.no_produit,
    vide: '(sans n° produit)',
  },
  lot: {
    libelle: 'Lot',
    valeur: (l) => l.no_lot,
    vide: '(sans n° lot)',
  },
  expiration: {
    libelle: 'Best before',
    valeur: (l) => {
      const j = l.jours_expiration;
      if (j === null || j === undefined) return 'Sans date';
      if (j < 0) return 'Déjà expiré';
      if (j <= 7) return 'Sous 7 jours';
      if (j <= 30) return 'Sous 30 jours';
      if (j <= 90) return 'Sous 90 jours';
      return 'Plus de 90 jours';
    },
    ordre: ['Déjà expiré', 'Sous 7 jours', 'Sous 30 jours', 'Sous 90 jours',
      'Plus de 90 jours', 'Sans date'],
  },
  trax: {
    libelle: 'TRAXcode',
    valeur: (l) => (l.trax_code ? 'Avec TRAXcode' : 'Sans TRAXcode'),
    ordre: ['Sans TRAXcode', 'Avec TRAXcode'],
  },
  poids_connu: {
    libelle: 'Poids connu',
    valeur: (l) => (l.poids_unitaire === null || l.poids_unitaire === undefined
      ? 'Sans poids' : 'Avec poids'),
    ordre: ['Sans poids', 'Avec poids'],
  },
  po: {
    libelle: 'PO client',
    valeur: (l) => l.no_comm_client,
    vide: '(sans PO)',
  },
};

/** Champs texte dont on collecte les valeurs distinctes a chaque niveau. */
const TEXTES = ['trax_code', 'description', 'date_lot', 'date_expiration',
  'no_comm_client', 'client', 'client_regle'];

function noeud(cle, libelle, niv, axe) {
  const distincts = {};
  for (const c of TEXTES) distincts[c] = new Set();
  return {
    cle,
    libelle,
    niv,
    axe,
    enfants: new Map(),
    lignes: [],
    produits: new Set(),
    lots: new Set(),
    distincts,
    qte: 0,
    poids: 0,
    nb_poids_connus: 0,
    nb_lignes: 0,
    jours_min: null,
  };
}

function cumuler(n, l) {
  n.nb_lignes += 1;
  if (l.no_produit) n.produits.add(l.no_produit);
  // Un numero de lot n'est unique qu'au sein d'un produit.
  n.lots.add((l.no_produit || '') + '\u0000' + (l.no_lot || ''));
  n.qte += nombre(l.unite2_qte_inv);
  if (l.poids_total !== null && l.poids_total !== undefined) {
    n.poids += l.poids_total;
    n.nb_poids_connus += 1;
  }
  if (l.jours_expiration !== null && l.jours_expiration !== undefined
    && (n.jours_min === null || l.jours_expiration < n.jours_min)) {
    n.jours_min = l.jours_expiration;
  }
  for (const c of TEXTES) if (l[c]) n.distincts[c].add(l[c]);
}

const NUM = new Set(['nb_lots', 'nb_produits', 'qte', 'poids', 'jours_min']);

function trier(liste, tri) {
  const colonne = tri && tri.colonne ? tri.colonne : 'libelle';
  const sens = tri && tri.sens ? tri.sens : 1;

  return liste.sort((a, b) => {
    // Un noeud qui a des enfants passe avant une feuille de meme niveau :
    // sinon un groupe se retrouve noye au milieu d'une liste plate.
    if ((a.enfants.length > 0) !== (b.enfants.length > 0)) {
      return a.enfants.length ? -1 : 1;
    }
    if (!NUM.has(colonne)
      && a.rang !== undefined && b.rang !== undefined && a.rang !== b.rang) {
      return (a.rang - b.rang) * sens;
    }
    if (NUM.has(colonne)) {
      const A = a[colonne] === undefined ? null : a[colonne];
      const B = b[colonne] === undefined ? null : b[colonne];
      if (A === null && B === null) return 0;
      if (A === null) return 1;
      if (B === null) return -1;
      return (A - B) * sens;
    }
    return String(a.libelle ?? '').localeCompare(String(b.libelle ?? ''), 'fr',
      { numeric: true }) * sens;
  });
}

function finaliser(n, tri) {
  const enfants = trier([...n.enfants.values()].map((e) => finaliser(e, tri)), tri);
  return {
    ...n,
    enfants,
    nb_produits: n.produits.size,
    nb_lots: n.lots.size,
    qte: Math.round(n.qte * 100) / 100,
    poids: n.nb_poids_connus ? Math.round(n.poids * 100) / 100 : null,
    niveau: niveauExpiration(n.jours_min),
  };
}

/**
 * Construit la grille a partir des lignes filtrees et d'une liste d'axes.
 *
 * La cle d'un noeud est son CHEMIN complet : deux libelles identiques sous
 * deux parents differents restent deux noeuds distincts, et la cle survit a
 * un changement d'axes puisqu'elle ne depend que des valeurs.
 */
export function construirePivot(lignes, axes, tri, rangs) {
  const utilises = (axes || []).filter((a) => AXES[a]);
  const racine = noeud('', '', -1, null);

  for (const l of lignes || []) {
    let n = racine;
    let chemin = '';

    for (const nom of utilises) {
      const a = AXES[nom];
      const brut = a.valeur(l);
      if (a.optionnel && !brut) continue;
      const libelle = brut || a.vide || '(sans valeur)';

      chemin = chemin ? chemin + '\u0000' + libelle : libelle;
      let enf = n.enfants.get(libelle);
      if (!enf) {
        enf = noeud(chemin, libelle, n.niv + 1, nom);
        if (a.ordre) enf.rang = a.ordre.indexOf(libelle);
        else if (a.nomenclature && rangs) enf.rang = rangs.get(a.nomenclature(l));
        n.enfants.set(libelle, enf);
      }
      cumuler(enf, l);
      n = enf;
    }

    // Les lignes s'accrochent a la feuille : c'est ce que montre le tiroir.
    n.lignes.push(l);
    if (n === racine) cumuler(racine, l);
  }

  return finaliser(racine, tri).enfants;
}

/**
 * Colonnes de la grille. Plus de champ `niveaux` : chaque colonne sait
 * s'agreger a tous les niveaux, c'est le principe meme du pivot.
 */
export const COLONNES_PIVOT = [
  { cle: 'libelle', libelle: 'Regroupement' },
  { cle: 'trax_code', libelle: 'TRAXcode', texte: 'trax_code' },
  { cle: 'description', libelle: 'Description', texte: 'description' },
  { cle: 'nb_produits', libelle: 'Produits', num: true },
  { cle: 'nb_lots', libelle: 'Lots', num: true },
  { cle: 'qte', libelle: 'Qté totale', num: true },
  { cle: 'poids', libelle: 'Poids total', num: true },
  { cle: 'date_lot', libelle: 'Date lot', texte: 'date_lot', pluriel: 'dates' },
  { cle: 'date_expiration', libelle: 'Best before', texte: 'date_expiration', pluriel: 'dates' },
  { cle: 'jours_min', libelle: 'Jours rest.', num: true },
  { cle: 'no_comm_client', libelle: 'PO client', texte: 'no_comm_client', pluriel: 'PO' },
];

/**
 * Valeur d'un champ texte agregee sur un noeud. Une seule valeur distincte :
 * on l'affiche. Plusieurs : on affiche leur NOMBRE et on met la liste en
 * infobulle. Le detail exact se lit dans le tiroir.
 */
export function agregerTexte(n, champ, pluriel) {
  const s = n.distincts && n.distincts[champ];
  if (!s || s.size === 0) return { texte: '', multiple: false };
  if (s.size === 1) return { texte: [...s][0], multiple: false };
  return { texte: s.size + ' ' + (pluriel || 'valeurs'), multiple: true, titre: [...s].join(' · ') };
}

/**
 * Cles des noeuds a deplier jusqu'au niveau demande. -1 replie tout ; 0
 * ouvre le premier axe ; et ainsi de suite. Une feuille n'est jamais
 * ouverte : elle renvoie au tiroir.
 */
export function toutesLesCles(noeuds, jusqua = 2) {
  const cles = [];
  const parcourir = (liste) => {
    for (const n of liste) {
      if (!n.enfants.length) continue;
      if (n.niv <= jusqua) cles.push(n.cle);
      parcourir(n.enfants);
    }
  };
  parcourir(noeuds || []);
  return cles;
}

/** Retrouve un noeud depuis son chemin (la cle du tiroir dans l'URL). */
export function noeudParCle(noeuds, cle) {
  if (!cle) return null;
  const parts = cle.split('\u0000');
  let liste = noeuds || [];
  let trouve = null;
  for (const p of parts) {
    trouve = liste.find((n) => n.libelle === p);
    if (!trouve) return null;
    liste = trouve.enfants;
  }
  return trouve;
}

/** Totaux de tous les noeuds racines. */
export function totalPivot(noeuds) {
  return (noeuds || []).reduce((t, n) => ({
    nb_produits: t.nb_produits + n.nb_produits,
    nb_lots: t.nb_lots + n.nb_lots,
    qte: Math.round((t.qte + n.qte) * 100) / 100,
    poids: n.poids === null ? t.poids : Math.round((t.poids + n.poids) * 100) / 100,
  }), { nb_produits: 0, nb_lots: 0, qte: 0, poids: 0 });
}
