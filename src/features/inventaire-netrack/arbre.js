/**
 * Vue arborescente de l'inventaire : Categorie → Sous-categorie → Produit → Lots.
 *
 * Chaque niveau agrege ses descendants (lots, quantite, poids) et herite du
 * niveau d'expiration de son lot le plus urgent : c'est ce lot qui commande
 * l'action, donc c'est lui qui doit colorer la branche entiere.
 *
 * Les valeurs absentes ne sont pas silencieusement regroupees avec le reste :
 * elles forment des noeuds explicites « (sans categorie) » / « (sans
 * sous-categorie) », pour qu'un trou de referentiel se voie dans la navigation
 * au lieu de disparaitre.
 */

import { nombre, niveauExpiration } from './logic';

export const SANS_CATEGORIE = '(sans catégorie)';
export const SANS_SOUS_CATEGORIE = '(sans sous-catégorie)';

/** Un noeud vierge, quel que soit son niveau. */
function noeud(cle, libelle, profondeur) {
  return {
    cle,
    libelle,
    profondeur,
    nb_lots: 0,
    nb_produits: 0,
    qte: 0,
    poids: 0,
    poids_connu: false,
    jours_min: null,
    enfants: new Map(),
    lignes: [],
  };
}

/** Cumule une ligne d'inventaire dans un noeud. */
function cumuler(n, ligne) {
  n.nb_lots += 1;
  n.qte += nombre(ligne.unite2_qte_inv);
  if (ligne.poids_total !== null && ligne.poids_total !== undefined) {
    n.poids += ligne.poids_total;
    n.poids_connu = true;
  }
  if (ligne.jours_expiration !== null
    && (n.jours_min === null || ligne.jours_expiration < n.jours_min)) {
    n.jours_min = ligne.jours_expiration;
  }
}

/** Recupere ou cree un enfant. */
function enfant(parent, cle, libelle, profondeur) {
  let n = parent.enfants.get(cle);
  if (!n) {
    n = noeud(parent.cle + '\u0000' + cle, libelle, profondeur);
    parent.enfants.set(cle, n);
  }
  return n;
}

const NUM = new Set(['nb_lots', 'nb_produits', 'qte', 'poids', 'jours_min']);

/**
 * Tri applique a chaque niveau. Le tri par defaut suit le libelle ;
 * les colonnes numeriques placent les valeurs inconnues en fin, comme
 * partout ailleurs dans la page.
 */
function trierNoeuds(liste, tri) {
  const colonne = tri && tri.colonne ? tri.colonne : 'libelle';
  const sens = tri && tri.sens ? tri.sens : 1;

  return liste.sort((a, b) => {
    if (NUM.has(colonne)) {
      const A = a[colonne];
      const B = b[colonne];
      if (A === null && B === null) return 0;
      if (A === null) return 1;
      if (B === null) return -1;
      return (A - B) * sens;
    }
    return String(a.libelle ?? '').localeCompare(String(b.libelle ?? ''), 'fr', { numeric: true })
      * sens;
  });
}

/** Convertit les Map en tableaux tries et arrondit les cumuls. */
function finaliser(n, tri) {
  const enfants = trierNoeuds([...n.enfants.values()].map((e) => finaliser(e, tri)), tri);

  // Les lots d'un produit restent tries par urgence : le premier est celui a sortir.
  const lignes = n.lignes.slice().sort((a, b) => {
    const A = a.jours_expiration;
    const B = b.jours_expiration;
    if (A === null && B === null) return 0;
    if (A === null) return 1;
    if (B === null) return -1;
    return A - B;
  });

  return {
    ...n,
    enfants,
    lignes,
    qte: Math.round(n.qte * 100) / 100,
    poids: n.poids_connu ? Math.round(n.poids * 100) / 100 : null,
    niveau: niveauExpiration(n.jours_min),
  };
}

/**
 * Construit l'arbre a partir des lignes deja filtrees et enrichies.
 * Profondeurs : 0 categorie, 1 sous-categorie, 2 produit (porte les lots).
 */
export function construireArbre(lignes, tri) {
  const racine = noeud('', '', -1);

  for (const l of lignes || []) {
    const cat = l.categorie || SANS_CATEGORIE;
    const sc = l.sous_categorie || SANS_SOUS_CATEGORIE;
    const prod = l.no_produit || '(sans n° produit)';

    const nCat = enfant(racine, cat, cat, 0);
    const nSc = enfant(nCat, sc, sc, 1);
    const nProd = enfant(nSc, prod, prod, 2);

    if (nProd.nb_lots === 0) {
      // Premiere rencontre du produit : on remonte le compteur de produits.
      nCat.nb_produits += 1;
      nSc.nb_produits += 1;
      nProd.nb_produits = 1;
      nProd.description = l.description;
      nProd.trax_code = l.trax_code;
      nProd.client_regle = l.client_regle;
      nProd.poids_unitaire = l.poids_unitaire;
      nProd.no_produit = l.no_produit;
    }
    if (!nProd.description && l.description) nProd.description = l.description;

    nProd.lignes.push(l);
    cumuler(nCat, l);
    cumuler(nSc, l);
    cumuler(nProd, l);
  }

  return finaliser(racine, tri).enfants;
}

/** Colonnes de la vue arborescente. */
export const COLONNES_ARBRE = [
  { cle: 'libelle', libelle: 'Catégorie / Sous-catégorie / Produit' },
  { cle: 'trax_code', libelle: 'TRAXcode' },
  { cle: 'description', libelle: 'Description' },
  { cle: 'nb_produits', libelle: 'Produits', num: true },
  { cle: 'nb_lots', libelle: 'Lots', num: true },
  { cle: 'qte', libelle: 'Qté totale', num: true },
  { cle: 'poids', libelle: 'Poids total', num: true },
  { cle: 'jours_min', libelle: 'Plus proche exp.', num: true },
];

/** Cles de tous les noeuds, pour les boutons « Tout déplier ». */
export function toutesLesCles(noeuds, jusqua = 2) {
  const cles = [];
  const parcourir = (liste) => {
    for (const n of liste) {
      if (n.profondeur <= jusqua) cles.push(n.cle);
      if (n.enfants.length) parcourir(n.enfants);
    }
  };
  parcourir(noeuds || []);
  return cles;
}

/** Totaux de tous les noeuds racines, pour la ligne de synthese. */
export function totalArbre(noeuds) {
  return (noeuds || []).reduce((t, n) => ({
    nb_produits: t.nb_produits + n.nb_produits,
    nb_lots: t.nb_lots + n.nb_lots,
    qte: Math.round((t.qte + n.qte) * 100) / 100,
    poids: n.poids === null ? t.poids : Math.round((t.poids + n.poids) * 100) / 100,
  }), { nb_produits: 0, nb_lots: 0, qte: 0, poids: 0 });
}
