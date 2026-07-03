// Colonnes GH conservées à l'affichage (index dans _raw)
export const KEEP_COLS = [1, 2, 8, 13, 15, 16, 17, 18, 19, 20];

const MOIS_FMT = ['', 'janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
const MOIS_MAP = {
  janv: 1, janvier: 1, jan: 1, fevr: 2, fevrier: 2, fev: 2, feb: 2, mars: 3, mar: 3,
  avr: 4, avril: 4, apr: 4, mai: 5, may: 5, juin: 6, jun: 6, juil: 7, juillet: 7, jul: 7,
  aout: 8, aug: 8, sept: 9, septembre: 9, sep: 9, oct: 10, octobre: 10,
  nov: 11, novembre: 11, dec: 12, decembre: 12,
};

export function escH(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function cleanCell(s) {
  let cleaned = s.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  cleaned = cleaned
    .replace(/F[^\w\s\/-]+VR/gi, 'FEVR').replace(/F[^\w\s\/-]+V(?!R)/gi, 'FEV')
    .replace(/AO[^\w\s\/-]+T/gi, 'AOUT').replace(/A[^\w\s\/-]+T(?!O)/gi, 'AOU')
    .replace(/D[^\w\s\/-]+C/gi, 'DEC')
    .replace(/BO[^\w\s\/-]+TE/gi, 'BOITE').replace(/H[^\w\s\/-]+LICAP/gi, 'HELICAP')
    .replace(/MARCH[^\w\s\/-]+/gi, 'MARCHE').replace(/GLACI[^\w\s\/-]+RE/gi, 'GLACIERE')
    .replace(/INT[^\w\s\/-]+RIEUR/gi, 'INTERIEUR').replace(/HABRILL[^\w\s\/-]+/gi, 'HABRILLE')
    .replace(/SOYA-BL[^\w\s\/-]+/gi, 'SOYA-BLE').replace(/BL[^\w\s\/-]+\s/gi, 'BLE ')
    .replace(/EARTH[^\w\s\/-]+S/gi, "EARTH'S").replace(/PROT[^\w\s\/-]+INE/gi, 'PROTEINE')
    .replace(/(\d+)\s*[^\w\s\/-]+\s*X/gi, "$1'' X").replace(/X\s*(\d+)\s*[^\w\s\/-]+\s*X/gi, "X $1'' X")
    .replace(/X\s*H\s*(\d+)\s*[^\w\s\/-]+/gi, "X H $1''").replace(/(\d+)[^\w\s\/-]+(\s)/gi, "$1''$2")
    .replace(/(\d+)[^\w\s\/-]+$/gi, "$1''").replace(/[◆♦]/g, '');
  cleaned = cleaned
    .replace(/à/g, 'a').replace(/â/g, 'a').replace(/ä/g, 'a').replace(/æ/g, 'ae')
    .replace(/À/g, 'A').replace(/Â/g, 'A').replace(/Ä/g, 'A').replace(/Æ/g, 'AE')
    .replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e').replace(/ë/g, 'e')
    .replace(/É/g, 'E').replace(/È/g, 'E').replace(/Ê/g, 'E').replace(/Ë/g, 'E')
    .replace(/î/g, 'i').replace(/ï/g, 'i').replace(/Î/g, 'I').replace(/Ï/g, 'I')
    .replace(/ô/g, 'o').replace(/ö/g, 'o').replace(/œ/g, 'oe').replace(/Ô/g, 'O').replace(/Ö/g, 'O').replace(/Œ/g, 'OE')
    .replace(/ù/g, 'u').replace(/û/g, 'u').replace(/ü/g, 'u').replace(/Ù/g, 'U').replace(/Û/g, 'U').replace(/Ü/g, 'U')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
  return cleaned;
}

export function fmtDate(s) {
  if (!s) return '';
  s = s.trim();
  s = s.replace(/F[^\w-]+VR/gi, 'FEVR').replace(/F[^\w-]+V(?!R)/gi, 'FEV').replace(/AO[^\w-]+T/gi, 'AOUT').replace(/A[^\w-]+T(?!O)/gi, 'AOU').replace(/D[^\w-]+C/gi, 'DEC');
  let j, m, a;
  const m1 = s.match(/^(\d{1,2})[\-\/]([a-zA-Z]+)[\-\/](\d{2,4})$/i);
  if (m1) {
    j = m1[1];
    const moisStr = m1[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    m = MOIS_MAP[moisStr] || MOIS_MAP[moisStr.slice(0, 4)] || MOIS_MAP[moisStr.slice(0, 3)];
    a = m1[3];
    if (a.length === 2) a = '20' + a;
    if (m) return j + ' ' + MOIS_FMT[m] + ' ' + a;
  }
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m2) { j = parseInt(m2[1]); m = parseInt(m2[2]); a = m2[3]; }
  else {
    const m3 = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
    if (m3) { j = parseInt(m3[3]); m = parseInt(m3[2]); a = m3[1]; }
    else return s;
  }
  if (m < 1 || m > 12) return s;
  return j + ' ' + MOIS_FMT[m] + ' ' + a;
}

export function parseDate(s) {
  if (!s) return Infinity;
  s = String(s).trim();
  const norm = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const MOIS = { jan: 1, feb: 2, fev: 2, mar: 3, avr: 4, apr: 4, mai: 5, may: 5, jun: 6, jui: 7, jul: 7, aou: 8, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, des: 12 };
  const getMonth = (str) => MOIS[norm(str).slice(0, 3)] || null;

  const m0 = s.match(/^(\d{1,2})[-\/\s]([^\d\-\/\s]+)[-\/\s](\d{2,4})$/);
  if (m0) {
    const mNum = getMonth(m0[2]);
    if (mNum) { const y = m0[3].length === 2 ? '20' + m0[3] : m0[3]; return new Date(parseInt(y), mNum - 1, parseInt(m0[1])).getTime(); }
  }
  const m1 = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (m1) { const y = m1[3].length === 2 ? '20' + m1[3] : m1[3]; return new Date(parseInt(y), parseInt(m1[2]) - 1, parseInt(m1[1])).getTime(); }
  const m2 = s.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3])).getTime();
  return Infinity;
}

export function getExpiryClass(dateStr) {
  if (!dateStr) return '';
  const t = parseDate(dateStr);
  if (t === Infinity) return '';
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const oneMonth = new Date(now); oneMonth.setMonth(oneMonth.getMonth() + 1);
  if (t < now.getTime()) return 'expired';
  if (t < oneMonth.getTime()) return 'expiring';
  return '';
}

/** Parse le HTML brut retourné par GH (table TR/TD) en tableau de lignes. */
export function parseInventoryHtml(html) {
  const allRows = [];
  const trRegex = /<TR[^>]*>([\s\S]*?)<\/TR>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const cells = [];
    const tdReg = /<TD[^>]*>([\s\S]*?)<\/TD>/gi;
    let tdMatch;
    while ((tdMatch = tdReg.exec(rowHtml)) !== null) cells.push(cleanCell(tdMatch[1]));
    if (cells.length >= 3) allRows.push(cells);
  }
  if (!allRows.length) return [];

  let prev = {};
  const inventory = [];
  for (let v of allRows) {
    const rowText = v.join(' ');
    if (rowText.includes('Total du produit') || rowText.includes('TOTAL') || rowText.includes('GRAND TOTAL') || rowText.includes('RESERVEE') || rowText.includes('RÉSERVÉE')) continue;

    const get = (idx, key) => { const val = (v[idx] || '').trim(); if (val) { prev[key] = val; return val; } return prev[key] || ''; };
    const row = {
      division: get(3, 'division'), no_produit: get(4, 'no_produit'), description: get(5, 'description'),
      unite1: get(6, 'unite1'), unite2: get(7, 'unite2'), no_comm: get(8, 'no_comm'), entrepot: get(9, 'entrepot'),
      etiquette: get(10, 'etiquette'), no_lot: get(11, 'no_lot'), no_sous_lot: get(12, 'no_sous_lot'),
      date_lot: get(13, 'date_lot'), expiration: get(14, 'expiration'), reception: get(15, 'reception'),
      bloquer: get(16, 'bloquer'), raison: get(17, 'raison'), qte_inv: get(18, 'qte_inv'),
      exped_att: get(19, 'exped_att'), bloques: get(20, 'bloques'), disponibles: get(21, 'disponibles'),
      qte_inv_p: get(22, 'qte_inv_p'), exped_att_p: get(23, 'exped_att_p'), bloques_p: get(24, 'bloques_p'), disponibles_p: get(25, 'disponibles_p'),
    };

    const displayCols = [1, 2, 3, 8, 13, 15, 16, 17, 18, 19, 20];
    if (displayCols.every((idx) => !(v[idx] || '').trim())) continue;

    v = [...v];
    if (v[13]) v[13] = fmtDate(v[13]);
    if (v[14]) v[14] = fmtDate(v[14]);
    if (v[15]) v[15] = fmtDate(v[15]);

    row._raw = v;
    row._idx = inventory.length;
    inventory.push(row);
  }

  // Fill-down colonnes 1 (no_produit) et 2 (description)
  let lastCol1 = '', lastCol2 = '';
  inventory.forEach((row) => {
    const raw = row._raw;
    if (raw[1] && raw[1].trim()) { lastCol1 = raw[1].toUpperCase().startsWith('DCA') ? raw[1].replace(/-\d{2}$/, '') : raw[1]; raw[1] = lastCol1; }
    else if (lastCol1) raw[1] = lastCol1;
    if (raw[2] && raw[2].trim()) lastCol2 = raw[2];
    else if (lastCol2) raw[2] = lastCol2;
  });

  return inventory;
}

export function sortByExpiration(rows) {
  return [...rows].sort((a, b) => parseDate((a._raw || [])[19] || '') - parseDate((b._raw || [])[19] || ''));
}

// ── Poids unitaires ────────────────────────────────────────────
export function getPoidsUnitaire(poidsList, code) {
  if (!code) return 0;
  const codeUpper = String(code).trim().toUpperCase();
  const exact = poidsList.find((p) => (p.matchType || p.match_type || 'exact') === 'exact' && String(p.code || '').trim().toUpperCase() === codeUpper);
  if (exact) return parseFloat(exact.poids_unitaire || 0);
  const contains = poidsList.find((p) => {
    if ((p.matchType || p.match_type || 'exact') !== 'contains') return false;
    const term = String(p.code || '').trim().toUpperCase();
    return term && codeUpper.includes(term);
  });
  if (contains) return parseFloat(contains.poids_unitaire || 0);
  return 0;
}

export function isItemManuel(poidsList, code) {
  if (!code) return false;
  const codeUpper = String(code).trim().toUpperCase();
  const exact = poidsList.find((p) => (p.matchType || p.match_type || 'exact') === 'exact' && String(p.code || '').trim().toUpperCase() === codeUpper);
  if (exact) return exact.ajout_manuel || false;
  const contains = poidsList.find((p) => {
    if ((p.matchType || p.match_type || 'exact') !== 'contains') return false;
    const term = String(p.code || '').trim().toUpperCase();
    return term && codeUpper.includes(term);
  });
  return contains ? contains.ajout_manuel || false : false;
}

// ── Catégories ──────────────────────────────────────────────────
const CAT_COL_MAP = { no_produit: 1, description: 2, qte_inv: 3, no_comm: 13, no_lot: 16, no_sous_lot: 17, date_lot: 18, expiration: 19, reception: 20 };

export function matchesCategory(row, cat) {
  if (!cat.rules || cat.rules.length === 0) return false;
  const raw = row._raw || [];
  let result = true;
  for (let i = 0; i < cat.rules.length; i++) {
    const rule = cat.rules[i];
    const colIdx = CAT_COL_MAP[rule.col] ?? parseInt(rule.col);
    const cellVal = (raw[colIdx] || '').toLowerCase();
    const ruleVal = (rule.value || '').toLowerCase();
    let match = false;
    if (rule.operator === 'contains') match = cellVal.includes(ruleVal);
    if (rule.operator === 'not_contains') match = !cellVal.includes(ruleVal);
    if (rule.operator === 'starts_with') match = cellVal.startsWith(ruleVal);
    if (rule.operator === 'ends_with') match = cellVal.endsWith(ruleVal);
    if (rule.operator === 'equals') match = cellVal === ruleVal;
    if (rule.operator === 'not_equals') match = cellVal !== ruleVal;
    if (i === 0) result = match;
    else if (rule.logic === 'OR') result = result || match;
    else result = result && match;
  }
  return result;
}
