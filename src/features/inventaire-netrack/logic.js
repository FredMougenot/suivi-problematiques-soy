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
    .replace(/[\s\u00a0]/g, '')  // espaces et espaces insecables
    .replace(/,/g, '')           // separateur de milliers
    .replace(/\.$/, '');         // point final orphelin
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

/** Libelles lisibles. Toute colonne absente d'ici est affichee avec son nom brut. */
export const LIBELLES = {
  id: 'ID',
  client: 'Client',
  division: 'Division',
  no_produit: 'N° produit',
  description: 'Description',
  entrepot: 'Entrepôt',
  etiquette: 'Étiquette',
  no_comm_client: 'N° comm. client',
  no_lot: 'N° lot',
  no_sous_lot: 'N° sous-lot',
  date_lot: 'Date lot',
  date_expiration: 'Expiration',
  date_reception_originale: 'Réception orig.',
  unite1_type: 'U1 type',
  unite1_qte_inv: 'U1 qté inv.',
  unite1_exped_att: 'U1 expéd. att.',
  unite1_bloques: 'U1 bloqués',
  unite1_disponibles: 'U1 dispo',
  unite2_type: 'U2 type',
  unite2_qte_inv: 'U2 qté inv.',
  unite2_exped_att: 'U2 expéd. att.',
  unite2_bloques: 'U2 bloqués',
  unite2_disponibles: 'U2 dispo',
  execution_id: 'Exécution n8n',
  imported_at: 'Importé le',
};

/** Ordre d'affichage souhaite. Les colonnes non listees sont ajoutees a la fin. */
const ORDRE = [
  'client', 'no_produit', 'description', 'division', 'entrepot', 'etiquette',
  'no_lot', 'no_sous_lot', 'no_comm_client',
  'unite1_type', 'unite1_qte_inv', 'unite1_disponibles', 'unite1_bloques', 'unite1_exped_att',
  'unite2_type', 'unite2_qte_inv', 'unite2_disponibles', 'unite2_bloques', 'unite2_exped_att',
  'date_lot', 'date_expiration', 'date_reception_originale',
  'imported_at', 'execution_id', 'id',
];

export const COLONNES_NUM = new Set([
  'unite1_qte_inv', 'unite1_disponibles', 'unite1_bloques', 'unite1_exped_att',
  'unite2_qte_inv', 'unite2_disponibles', 'unite2_bloques', 'unite2_exped_att',
]);

/**
 * Colonnes derivees des donnees reelles, pas d'une liste ecrite en dur :
 * si le workflow ajoute un champ, il apparait automatiquement.
 */
export function colonnesDe(lignes) {
  if (!lignes.length) return [];
  const presentes = new Set();
  lignes.slice(0, 50).forEach((l) => Object.keys(l).forEach((k) => presentes.add(k)));
  const connues = ORDRE.filter((c) => presentes.has(c));
  const extras = [...presentes].filter((c) => !ORDRE.includes(c)).sort();
  return [...connues, ...extras];
}

const estVide = (v) => v === null || v === undefined || String(v).trim() === '';

/**
 * Diagnostic par colonne : taux de remplissage, valeurs distinctes, exemple.
 * Sert a decider quelles colonnes conserver en base.
 */
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
  const { client, recherche, entrepot, division, stock } = criteres;
  const mots = recherche.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const filtrees = lignes.filter((l) => {
    if (client && l.client !== client) return false;
    if (entrepot && l.entrepot !== entrepot) return false;
    if (division && l.division !== division) return false;
    if (stock === 'dispo' && nombre(l.unite1_disponibles) <= 0) return false;
    if (stock === 'bloque' && nombre(l.unite1_bloques) <= 0) return false;
    if (stock === 'expire') {
      const j = joursAvantExpiration(l);
      if (j === null || j > 30) return false;
    }
    if (mots.length) {
      const foin = [l.no_produit, l.description, l.no_lot, l.no_sous_lot,
        l.etiquette, l.no_comm_client, l.division].join(' ').toLowerCase();
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
