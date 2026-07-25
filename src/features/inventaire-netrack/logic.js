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

export function joursAvantExpiration(ligne) {
  const d = versDate(ligne.date_expiration);
  if (!d) return null;
  return Math.ceil((d - new Date()) / 86400000);
}

// ───── Appariement poids et categorie ─────

const norm = (v) => String(v ?? '').trim().toUpperCase();

/**
 * gh_poids : `exact` l'emporte sur `contains`.
 * A egalite de type, le code le plus long gagne (le plus specifique).
 */
export function indexerPoids(rows) {
  const exacts = new Map();
  const contient = [];
  for (const r of rows) {
    const code = norm(r.code);
    if (!code) continue;
    if (r.match_type === 'contains') contient.push({ code, poids: r.poids_unitaire });
    else exacts.set(code, r.poids_unitaire);
  }
  contient.sort((a, b) => b.code.length - a.code.length);
  return { exacts, contient };
}

export function poidsUnitaire(noProduit, index) {
  if (!index) return null;
  const p = norm(noProduit);
  if (!p) return null;
  if (index.exacts.has(p)) return index.exacts.get(p);
  const trouve = index.contient.find((r) => p.includes(r.code));
  return trouve ? trouve.poids : null;
}

const RANG_OPERATEUR = { egal: 0, commence_par: 1, contient: 2 };

/**
 * gh_regles_categorie : priorite croissante, puis operateur du plus
 * specifique au plus large, puis valeur la plus longue.
 * La premiere regle qui matche l'emporte.
 */
export function trierRegles(rows) {
  return [...rows]
    .filter((r) => r.actif !== false)
    .sort((a, b) => (a.priorite ?? 99) - (b.priorite ?? 99)
      || (RANG_OPERATEUR[a.operateur] ?? 9) - (RANG_OPERATEUR[b.operateur] ?? 9)
      || String(b.valeur ?? '').length - String(a.valeur ?? '').length);
}

export function categoriser(ligne, regles) {
  if (!regles || !regles.length) return { categorie: null, sous_categorie: null };
  for (const r of regles) {
    const champ = norm(ligne[r.champ] ?? ligne.no_produit);
    const val = norm(r.valeur);
    if (!val) continue;
    const ok = r.operateur === 'egal' ? champ === val
      : r.operateur === 'commence_par' ? champ.startsWith(val)
        : r.operateur === 'contient' ? champ.includes(val)
          : false;
    if (ok) {
      return {
        categorie: r.categorie || null,
        sous_categorie: r.sous_categorie || null,
      };
    }
  }
  return { categorie: null, sous_categorie: null };
}

/**
 * Enrichit chaque ligne avec categorie, sous_categorie, poids unitaire et
 * poids total. Rien n'est ecrit en base : les referentiels restent la
 * source de verite, une modification de regle prend effet immediatement.
 */
export function enrichir(lignes, indexPoids, reglesTriees) {
  return lignes.map((l) => {
    const { categorie, sous_categorie } = categoriser(l, reglesTriees);
    const pu = poidsUnitaire(l.no_produit, indexPoids);
    const qte = nombre(l.unite2_qte_inv);
    return {
      ...l,
      categorie,
      sous_categorie,
      poids_unitaire: pu,
      poids_total: pu === null ? null : Math.round(pu * qte * 100) / 100,
    };
  });
}

// ───── Affichage ─────

/** Libelles lisibles. Toute colonne absente d'ici est affichee avec son nom brut. */
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
  date_reception_originale: 'Réception orig.',
  unite2_qte_inv: 'Qté inventaire',
};

/**
 * Colonnes presentes en base mais jamais affichees.
 * `id` reste indispensable comme cle de ligne cote React,
 * `imported_at` et `unite2_type` sont conserves en base car
 * la vue v_gh_inventaire_complet en depend.
 */
const MASQUEES = new Set(['id', 'imported_at', 'unite2_type']);

/** Ordre d'affichage souhaite. Les colonnes non listees sont ajoutees a la fin. */
const ORDRE = [
  'client', 'categorie', 'sous_categorie',
  'no_produit', 'description',
  'unite2_qte_inv', 'poids_unitaire', 'poids_total',
  'etiquette', 'no_lot', 'no_sous_lot', 'no_comm_client',
  'date_lot', 'date_expiration', 'date_reception_originale',
];

export const COLONNES_NUM = new Set(['unite2_qte_inv', 'poids_unitaire', 'poids_total']);

const estVide = (v) => v === null || v === undefined || String(v).trim() === '';

/**
 * Colonnes derivees des donnees reelles, pas d'une liste ecrite en dur.
 * Les colonnes masquees et celles vides sur TOUTES les lignes sont exclues.
 */
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

/** Diagnostic par colonne : remplissage, valeurs distinctes, exemple. */
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
  const { client, recherche, categorie, stock } = criteres;
  const mots = recherche.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const filtrees = lignes.filter((l) => {
    if (client && l.client !== client) return false;
    if (categorie === '(sans)') {
      if (l.categorie) return false;
    } else if (categorie && l.categorie !== categorie) return false;
    if (stock === 'dispo' && nombre(l.unite2_qte_inv) <= 0) return false;
    if (stock === 'zero' && nombre(l.unite2_qte_inv) > 0) return false;
    if (stock === 'sans_poids' && l.poids_unitaire !== null) return false;
    if (stock === 'expire' || stock === 'expire90') {
      const j = joursAvantExpiration(l);
      if (j === null || j > (stock === 'expire' ? 30 : 90)) return false;
    }
    if (mots.length) {
      const foin = [l.no_produit, l.description, l.no_lot, l.no_sous_lot,
        l.etiquette, l.no_comm_client, l.categorie, l.sous_categorie]
        .join(' ').toLowerCase();
      if (!mots.every((m) => foin.includes(m))) return false;
    }
    return true;
  });

  const dates = new Set(['date_lot', 'date_expiration', 'date_reception_originale']);

  return filtrees.sort((a, b) => {
    const A = a[tri.colonne];
    const B = b[tri.colonne];
    if (COLONNES_NUM.has(tri.colonne)) return (nombre(A) - nombre(B)) * tri.sens;
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

/** CSV point-virgule + BOM, pour ouverture directe dans Excel FR. */
export function exporterCsv(lignes, colonnes) {
  const entetes = colonnes.map((c) => LIBELLES[c] || c);
  const echapper = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const contenu = [entetes.join(';')]
    .concat(lignes.map((l) => colonnes.map((c) => echapper(l[c])).join(';')))
    .join('\r\n');
  const blob = new Blob(['\ufeff' + contenu], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'inventaire-netrack-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
