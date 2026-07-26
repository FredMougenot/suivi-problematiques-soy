/** Helpers de l'inventaire NetRack (donnees texte issues du scraping NetRack). */

export const CLIENTS = ['EO', 'PBC'];

/**
 * Les quantites arrivent au format anglais du portail : « 1,418. », « 0. ».
 * La virgule est un separateur de MILLIERS, pas une decimale.
 * Le point final est un artefact d'affichage de NetRack.
 */
export function nombre(v) {
  if (v === null || v === undefined) return 0;
  const brut = String(v)
    .replace(/[\s\u00a0]/g, '')
    .replace(/,/g, '')
    .replace(/\.$/, '');
  const n = parseFloat(brut);
  return Number.isNaN(n) ? 0 : n;
}

const MOIS_FR = {
  JAN: 0, FEV: 1, FÉV: 1, MAR: 2, AVR: 3, MAI: 4, JUN: 5, JUIN: 5,
  JUL: 6, JUIL: 6, AOU: 7, AOÛ: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11, DÉC: 11,
};

/**
 * NetRack renvoie « 01-AVR-2026 » (mois francais abrege).
 * On accepte aussi AAAA-MM-JJ et JJ/MM/AAAA par securite.
 * Le format d'origine n'est jamais reecrit : seule cette lecture
 * sert au tri et aux filtres, l'affichage garde le mois en lettres.
 */
export function versDate(v) {
  if (!v) return null;
  const s = String(v).trim().toUpperCase();

  let m = s.match(/^(\d{1,2})[-/\s]([A-Z\u00c0-\u00dc]{3,4})[-/\s](\d{4})$/);
  if (m && MOIS_FR[m[2]] !== undefined) return new Date(+m[3], MOIS_FR[m[2]], +m[1]);

  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);

  return null;
}

/** Jours restants avant expiration. Negatif si la date est passee. */
export function joursAvantExpiration(ligne) {
  const d = versDate(ligne.date_expiration);
  if (!d) return null;
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  return Math.round((d - auj) / 86400000);
}

/**
 * Degre de gravite, utilise pour la couleur de ligne.
 * Au-dela de 90 jours, aucune couleur : sinon le tableau entier
 * serait teinte et le signal se perdrait.
 */
export const SEUILS_EXPIRATION = [
  { cle: 'expire', libelle: 'Déjà expiré' },
  { cle: 'critique', libelle: '7 jours ou moins' },
  { cle: 'proche', libelle: '8 à 30 jours' },
  { cle: 'surveille', libelle: '31 à 90 jours' },
];

export function niveauExpiration(jours) {
  if (jours === null || jours === undefined) return null;
  if (jours < 0) return 'expire';
  if (jours <= 7) return 'critique';
  if (jours <= 30) return 'proche';
  if (jours <= 90) return 'surveille';
  return null;
}

// ───── Appariement par regle ─────

const norm = (v) => String(v ?? '').trim().toUpperCase();

const RANG_OPERATEUR = { egal: 0, commence_par: 1, contient: 2 };

/**
 * gh_regles_categorie : priorite croissante, puis operateur du plus
 * specifique au plus large, puis valeur la plus longue.
 * La premiere regle qui matche fournit categorie, sous-categorie
 * ET poids unitaire.
 */
export function trierRegles(rows) {
  return [...rows]
    .filter((r) => r.actif !== false)
    .sort((a, b) => (a.priorite ?? 99) - (b.priorite ?? 99)
      || (RANG_OPERATEUR[a.operateur] ?? 9) - (RANG_OPERATEUR[b.operateur] ?? 9)
      || String(b.valeur ?? '').length - String(a.valeur ?? '').length);
}

export function regleDe(ligne, regles) {
  if (!regles || !regles.length) return null;
  for (const r of regles) {
    const champ = norm(ligne[r.champ] ?? ligne.no_produit);
    const val = norm(r.valeur);
    if (!val) continue;
    const ok = r.operateur === 'egal' ? champ === val
      : r.operateur === 'commence_par' ? champ.startsWith(val)
        : r.operateur === 'contient' ? champ.includes(val)
          : false;
    if (ok) return r;
  }
  return null;
}

/**
 * Enrichit chaque ligne. Rien n'est ecrit en base : le referentiel
 * reste la source de verite, une modification de regle prend effet aussitot.
 */
export function enrichir(lignes, reglesTriees) {
  return lignes.map((l) => {
    const r = regleDe(l, reglesTriees);
    const pu = r && r.poids_unitaire !== null && r.poids_unitaire !== undefined
      ? Number(r.poids_unitaire)
      : null;
    const qte = nombre(l.unite2_qte_inv);
    const jours = joursAvantExpiration(l);
    return {
      ...l,
      categorie: (r && r.categorie) || null,
      sous_categorie: (r && r.sous_categorie) || null,
      poids_unitaire: pu,
      poids_total: pu === null ? null : Math.round(pu * qte * 100) / 100,
      jours_expiration: jours,
      niveau_expiration: niveauExpiration(jours),
    };
  });
}

// ───── Recherche ─────

/** Prefixes de champ acceptes dans la barre de recherche. */
export const CHAMPS_RECHERCHE = {
  prod: 'no_produit',
  desc: 'description',
  lot: 'no_lot',
  sslot: 'no_sous_lot',
  cat: 'categorie',
  sc: 'sous_categorie',
  cmd: 'no_comm_client',
  etq: 'etiquette',
};

/** Decoupe en items alternatifs, sans casser les guillemets. */
function decouperGroupes(texte) {
  const groupes = [];
  let courant = '';
  let dansGuillemets = false;
  for (const ch of String(texte || '')) {
    if (ch === '"') { dansGuillemets = !dansGuillemets; courant += ch; continue; }
    if (!dansGuillemets && (ch === ',' || ch === ';' || ch === '\n')) {
      groupes.push(courant);
      courant = '';
      continue;
    }
    courant += ch;
  }
  groupes.push(courant);
  return groupes;
}

const RE_JETON = /(-)?(?:([a-zA-Z]+):)?(?:"([^"]*)"|(\S+))/g;

/**
 * Grammaire de recherche :
 *   espace          criteres cumules (ET)
 *   virgule         items alternatifs (OU)
 *   -mot            exclusion
 *   "phrase exacte" recherche la suite de mots telle quelle
 *   champ:valeur    restreint a un champ (prod, desc, lot, cat, sc, cmd, etq)
 */
export function analyserRecherche(texte) {
  return decouperGroupes(texte)
    .map((brut) => {
      const jetons = [];
      let m;
      RE_JETON.lastIndex = 0;
      while ((m = RE_JETON.exec(brut)) !== null) {
        const [, negation, champ, phrase, mot] = m;
        const valeur = (phrase !== undefined ? phrase : (mot || '')).trim().toLowerCase();
        if (!valeur) continue;
        const cle = champ ? champ.toLowerCase() : null;
        jetons.push({
          exclu: Boolean(negation),
          champ: cle && CHAMPS_RECHERCHE[cle] ? CHAMPS_RECHERCHE[cle] : null,
          valeur,
        });
      }
      return jetons;
    })
    .filter((jetons) => jetons.length > 0);
}

const CHAMPS_BALAYES = ['no_produit', 'description', 'no_lot', 'no_sous_lot',
  'etiquette', 'no_comm_client', 'categorie', 'sous_categorie'];

function jetonMatche(ligne, jeton) {
  if (jeton.champ) {
    return String(ligne[jeton.champ] ?? '').toLowerCase().includes(jeton.valeur);
  }
  return CHAMPS_BALAYES.some(
    (c) => String(ligne[c] ?? '').toLowerCase().includes(jeton.valeur),
  );
}

export function correspond(ligne, groupes) {
  if (!groupes.length) return true;
  return groupes.some((jetons) => {
    const inclus = jetons.filter((j) => !j.exclu);
    const exclus = jetons.filter((j) => j.exclu);
    if (exclus.some((j) => jetonMatche(ligne, j))) return false;
    // Un item ne contenant que des exclusions signifie « tout sauf ça ».
    return inclus.every((j) => jetonMatche(ligne, j));
  });
}

// ───── Affichage ─────

export const LIBELLES = {
  client: 'Client',
  no_produit: 'N° produit',
  description: 'Description',
  categorie: 'Catégorie',
  sous_categorie: 'Sous-catégorie',
  poids_unitaire: 'Poids unit.',
  poids_total: 'Poids total',
  etiquette: 'Étiquette',
  no_comm_client: 'N° comm. client',
  no_lot: 'N° lot',
  no_sous_lot: 'N° sous-lot',
  date_lot: 'Date lot',
  date_expiration: 'Expiration',
  jours_expiration: 'Jours rest.',
  date_reception_originale: 'Réception orig.',
  unite2_qte_inv: 'Qté inventaire',
};

/**
 * Colonnes jamais affichees, meme si elles contiennent des donnees.
 * `id` sert de cle de ligne cote React ; `imported_at` et `unite2_type`
 * restent en base car la vue v_gh_inventaire_complet en depend ;
 * les autres sont des champs retires du parseur, listes ici pour que
 * l'affichage reste stable si une execution tourne sur une version
 * anterieure du workflow.
 */
const MASQUEES = new Set([
  'id', 'imported_at', 'unite2_type',
  'unite2_disponibles', 'execution_id',
  'division', 'entrepot',
  'unite1_type', 'unite1_qte_inv', 'unite1_disponibles',
  'unite1_bloques', 'unite1_exped_att',
  'unite2_bloques', 'unite2_exped_att',
  'niveau_expiration',
]);

const ORDRE = [
  'client', 'categorie', 'sous_categorie',
  'no_produit', 'description',
  'unite2_qte_inv', 'poids_unitaire', 'poids_total',
  'etiquette', 'no_lot', 'no_sous_lot', 'no_comm_client',
  'date_lot', 'date_expiration', 'jours_expiration', 'date_reception_originale',
];

export const COLONNES_NUM = new Set([
  'unite2_qte_inv', 'poids_unitaire', 'poids_total', 'jours_expiration',
]);

const estVide = (v) => v === null || v === undefined || String(v).trim() === '';

export function colonnesDe(lignes) {
  if (!lignes.length) return [];
  const presentes = new Set();
  lignes.slice(0, 50).forEach((l) => Object.keys(l).forEach((k) => presentes.add(k)));

  const utiles = [...presentes].filter(
    (c) => !MASQUEES.has(c)
      && (c === 'client' || lignes.some((l) => !estVide(l[c]))),
  );

  const connues = ORDRE.filter((c) => utiles.includes(c));
  const extras = utiles.filter((c) => !ORDRE.includes(c)).sort();
  return [...connues, ...extras];
}

export function analyserColonnes(lignes, colonnes) {
  const total = lignes.length || 1;
  return colonnes.map((c) => {
    const valeurs = new Set();
    let remplies = 0;
    let exemple = null;
    for (const l of lignes) {
      const v = l[c];
      if (estVide(v)) continue;
      remplies += 1;
      if (valeurs.size < 500) valeurs.add(String(v));
      if (exemple === null) exemple = String(v);
    }
    const distinctes = valeurs.size;
    let verdict = 'utile';
    if (remplies === 0) verdict = 'vide';
    else if (distinctes === 1) verdict = 'constante';
    else if (remplies / total < 0.1) verdict = 'rare';
    return {
      colonne: c,
      libelle: LIBELLES[c] || c,
      pct: Math.round((remplies / total) * 1000) / 10,
      distinctes: valeurs.size >= 500 ? '500+' : distinctes,
      exemple,
      verdict,
    };
  });
}

/** Filtre + tri. `tri` = { colonne, sens }. */
export function filtrerEtTrier(lignes, criteres, tri) {
  const { client, recherche, categorie, stock, expiration } = criteres;
  const groupes = analyserRecherche(recherche);

  const filtrees = lignes.filter((l) => {
    if (client && l.client !== client) return false;
    if (categorie === '(sans)') {
      if (l.categorie) return false;
    } else if (categorie && l.categorie !== categorie) return false;

    if (stock === 'dispo' && nombre(l.unite2_qte_inv) <= 0) return false;
    if (stock === 'zero' && nombre(l.unite2_qte_inv) > 0) return false;
    if (stock === 'sans_poids' && l.poids_unitaire !== null) return false;

    if (expiration) {
      const j = l.jours_expiration;
      if (expiration === 'sans_date') {
        if (j !== null) return false;
      } else if (j === null) {
        return false;
      } else if (expiration === 'expire' && j >= 0) {
        return false;
      } else if (expiration === 'critique' && (j < 0 || j > 7)) {
        return false;
      } else if (expiration === 'j30' && (j < 0 || j > 30)) {
        return false;
      } else if (expiration === 'j90' && (j < 0 || j > 90)) {
        return false;
      } else if (expiration === 'expire_ou_j30' && j > 30) {
        return false;
      }
    }

    return correspond(l, groupes);
  });

  const dates = new Set(['date_lot', 'date_expiration', 'date_reception_originale']);

  return filtrees.sort((a, b) => {
    const A = a[tri.colonne];
    const B = b[tri.colonne];
    if (COLONNES_NUM.has(tri.colonne)) {
      if (A === null && B === null) return 0;
      if (A === null) return 1;
      if (B === null) return -1;
      return (nombre(A) - nombre(B)) * tri.sens;
    }
    if (dates.has(tri.colonne)) {
      const dA = versDate(A);
      const dB = versDate(B);
      if (!dA && !dB) return 0;
      if (!dA) return 1;
      if (!dB) return -1;
      return (dA - dB) * tri.sens;
    }
    return String(A ?? '').localeCompare(String(B ?? ''), 'fr', { numeric: true }) * tri.sens;
  });
}

// ───── Vue groupee par produit ─────

/** Colonnes de la vue groupee, avec leur mode de tri. */
export const COLONNES_GROUPE = [
  { cle: 'client', libelle: 'Client' },
  { cle: 'categorie', libelle: 'Catégorie' },
  { cle: 'sous_categorie', libelle: 'Sous-catégorie' },
  { cle: 'no_produit', libelle: 'N° produit' },
  { cle: 'description', libelle: 'Description' },
  { cle: 'nb_lots', libelle: 'Lots', num: true },
  { cle: 'qte', libelle: 'Qté totale', num: true },
  { cle: 'poids', libelle: 'Poids total', num: true },
  { cle: 'jours_min', libelle: 'Plus proche exp.', num: true },
];

/**
 * Regroupe par client + produit. Le niveau d'expiration du groupe est
 * celui de son lot le plus urgent : c'est ce lot qui commande l'action.
 */
export function grouperParProduit(lignes, tri) {
  const parCle = new Map();

  for (const l of lignes) {
    const cle = (l.client || '') + '\u0000' + (l.no_produit || '');
    let g = parCle.get(cle);
    if (!g) {
      g = {
        cle,
        client: l.client,
        no_produit: l.no_produit,
        description: l.description,
        categorie: l.categorie,
        sous_categorie: l.sous_categorie,
        nb_lots: 0,
        qte: 0,
        poids: 0,
        poids_connu: false,
        jours_min: null,
        lignes: [],
      };
      parCle.set(cle, g);
    }
    g.lignes.push(l);
    g.nb_lots += 1;
    g.qte += nombre(l.unite2_qte_inv);
    if (l.poids_total !== null) {
      g.poids += l.poids_total;
      g.poids_connu = true;
    }
    if (l.jours_expiration !== null
      && (g.jours_min === null || l.jours_expiration < g.jours_min)) {
      g.jours_min = l.jours_expiration;
    }
    if (!g.description && l.description) g.description = l.description;
  }

  const groupes = [...parCle.values()].map((g) => ({
    ...g,
    qte: Math.round(g.qte * 100) / 100,
    poids: g.poids_connu ? Math.round(g.poids * 100) / 100 : null,
    niveau: niveauExpiration(g.jours_min),
    lignes: g.lignes.slice().sort((a, b) => {
      // Le lot le plus urgent en premier : c'est celui a sortir.
      const A = a.jours_expiration;
      const B = b.jours_expiration;
      if (A === null && B === null) return 0;
      if (A === null) return 1;
      if (B === null) return -1;
      return A - B;
    }),
  }));

  const num = new Set(['nb_lots', 'qte', 'poids', 'jours_min']);
  const colonne = tri && tri.colonne in groupes[0 || 0] ? tri.colonne : 'no_produit';
  const sens = tri ? tri.sens : 1;

  return groupes.sort((a, b) => {
    const A = a[colonne];
    const B = b[colonne];
    if (num.has(colonne)) {
      if (A === null && B === null) return 0;
      if (A === null) return 1;
      if (B === null) return -1;
      return (A - B) * sens;
    }
    return String(A ?? '').localeCompare(String(B ?? ''), 'fr', { numeric: true }) * sens;
  });
}

// ───── Totaux par categorie ─────

export function totauxParCategorie(lignes) {
  const parCat = new Map();
  for (const l of lignes) {
    const cle = l.categorie || '(sans catégorie)';
    let t = parCat.get(cle);
    if (!t) {
      t = { categorie: cle, lignes: 0, produits: new Set(), qte: 0, poids: 0, poids_connu: false };
      parCat.set(cle, t);
    }
    t.lignes += 1;
    t.produits.add(l.no_produit);
    t.qte += nombre(l.unite2_qte_inv);
    if (l.poids_total !== null) { t.poids += l.poids_total; t.poids_connu = true; }
  }
  return [...parCat.values()]
    .map((t) => ({
      categorie: t.categorie,
      lignes: t.lignes,
      produits: t.produits.size,
      qte: Math.round(t.qte * 100) / 100,
      poids: t.poids_connu ? Math.round(t.poids * 100) / 100 : null,
    }))
    .sort((a, b) => (b.poids ?? -1) - (a.poids ?? -1)
      || b.qte - a.qte
      || a.categorie.localeCompare(b.categorie, 'fr'));
}

// ───── Couverture des regles ─────

/**
 * Produits dont aucune regle ne fournit la categorie ou le poids.
 * Tries par nombre de lignes concernees : traiter le premier de la
 * liste est ce qui fait progresser la couverture le plus vite.
 */
export function couvertureRegles(lignes) {
  const parCle = new Map();
  for (const l of lignes) {
    const sansCat = !l.categorie;
    const sansPoids = l.poids_unitaire === null;
    if (!sansCat && !sansPoids) continue;
    const cle = (l.client || '') + '\u0000' + (l.no_produit || '');
    let p = parCle.get(cle);
    if (!p) {
      p = {
        cle,
        client: l.client,
        no_produit: l.no_produit,
        description: l.description,
        lignes: 0,
        qte: 0,
        sans_categorie: false,
        sans_poids: false,
      };
      parCle.set(cle, p);
    }
    p.lignes += 1;
    p.qte += nombre(l.unite2_qte_inv);
    if (sansCat) p.sans_categorie = true;
    if (sansPoids) p.sans_poids = true;
    if (!p.description && l.description) p.description = l.description;
  }
  return [...parCle.values()]
    .map((p) => ({
      ...p,
      qte: Math.round(p.qte * 100) / 100,
      manque: p.sans_categorie && p.sans_poids ? 'catégorie et poids'
        : p.sans_categorie ? 'catégorie' : 'poids',
    }))
    .sort((a, b) => b.lignes - a.lignes || b.qte - a.qte);
}

// ───── Export ─────

function telecharger(contenu, nom) {
  const blob = new Blob(['\ufeff' + contenu], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  a.click();
  URL.revokeObjectURL(a.href);
}

const echapper = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const horodatage = () => new Date().toISOString().slice(0, 10);

/** CSV point-virgule + BOM, pour ouverture directe dans Excel FR. */
export function exporterCsv(lignes, colonnes) {
  const entetes = colonnes.map((c) => LIBELLES[c] || c);
  const contenu = [entetes.join(';')]
    .concat(lignes.map((l) => colonnes.map((c) => echapper(l[c])).join(';')))
    .join('\r\n');
  telecharger(contenu, 'inventaire-netrack-' + horodatage() + '.csv');
}

export function exporterCsvGroupe(groupes) {
  const entetes = COLONNES_GROUPE.map((c) => c.libelle);
  const contenu = [entetes.join(';')]
    .concat(groupes.map((g) => COLONNES_GROUPE.map((c) => echapper(g[c.cle])).join(';')))
    .join('\r\n');
  telecharger(contenu, 'inventaire-netrack-par-produit-' + horodatage() + '.csv');
}
