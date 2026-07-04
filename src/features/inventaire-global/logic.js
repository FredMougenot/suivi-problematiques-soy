export function fmtDate(s) {
  if (!s) return '—';
  s = String(s).trim();
  if (s.match(/^\d{2}\/\d{2}\/\d{4}$/)) return s;
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return m2[3] + '/' + m2[2] + '/' + m2[1];
  if (s.match(/^\d{1,2}\s+[a-zA-Zéèêûàâôî]+\.?\s+\d{4}$/)) return s;
  return s;
}

export function parseDate(s) {
  if (!s) return 0;
  s = String(s).trim();
  const m1 = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m1) return new Date(m1[3], m1[2] - 1, m1[1]).getTime();
  const m2 = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (m2) return new Date(m2[1], m2[2] - 1, m2[3]).getTime();
  return 0;
}

export function daysUntil(s) {
  const t = parseDate(s);
  if (!t) return null;
  return Math.round((t - Date.now()) / 86400000);
}

const COL_MAP = { no_produit: 1, description: 2, qte_inv: 3, no_comm: 13, no_lot: 16, no_sous_lot: 17, date_lot: 18, expiration: 19, reception: 20 };

export function matchesCategory(row, cat) {
  if (!cat || !cat.rules || cat.rules.length === 0) return false;
  const raw = row._raw || [];
  let result = true;
  for (let i = 0; i < cat.rules.length; i++) {
    const rule = cat.rules[i];
    const colIdx = COL_MAP[rule.col] ?? parseInt(rule.col);
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

export function getCategoryForRow(row, categories) {
  if (row.source === 'usine') {
    if (row.categorie_id) return categories.find((c) => c.id === row.categorie_id) || null;
    return null;
  }
  const children = categories.filter((c) => c.parent_id);
  const roots = categories.filter((c) => !c.parent_id);
  const rowForMatch = row._original || row;
  for (const cat of [...children, ...roots]) {
    if (matchesCategory(rowForMatch, cat)) return cat;
  }
  return null;
}

export function getRootCategory(cat, categories) {
  if (!cat || !cat.parent_id) return cat;
  const parent = categories.find((c) => c.id === cat.parent_id);
  return parent ? getRootCategory(parent, categories) : cat;
}

/** Fusionne les palettes du même code+lot+source en une seule ligne agrégée. */
export function groupRows(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = [row.source, row.code_produit || '', row.no_lot || ''].join('|');
    if (!map.has(key)) {
      map.set(key, {
        source: row.source, _cat: row._cat, categorie_id: row.categorie_id, categorie_nom: row.categorie_nom,
        code_produit: row.code_produit, description: row.description, no_lot: row.no_lot, no_sous_lot: row.no_sous_lot,
        quantite: 0, poids_unit: row.poids_unit, poids_total: 0, date_fab: row.date_fab, date_peremption: row.date_peremption,
        date_fab_conflit: false, date_peremption_conflit: false, notes: row.notes, palettes: 0,
      });
    }
    const g = map.get(key);
    g.quantite += parseFloat(row.quantite) || 0;
    g.poids_total += parseFloat(row.poids_total) || 0;
    g.palettes += 1;
    if (row.date_fab && g.date_fab && row.date_fab !== g.date_fab) g.date_fab_conflit = true;
    if (row.date_peremption && g.date_peremption && row.date_peremption !== g.date_peremption) g.date_peremption_conflit = true;
    if (!g.date_fab && row.date_fab) g.date_fab = row.date_fab;
    if (!g.date_peremption && row.date_peremption) g.date_peremption = row.date_peremption;
  });
  return [...map.values()];
}

export function loadGhRowsFromStorage(poidsList, getPoidsUnitaire) {
  try {
    const saved = localStorage.getItem('gh_inventory');
    if (!saved) return [];
    const items = JSON.parse(saved);

    let lastCol1 = '', lastCol2 = '';
    (items || []).forEach((r) => {
      const raw = r._raw || [];
      if (raw[1] && raw[1].trim()) { lastCol1 = raw[1].toUpperCase().startsWith('DCA') ? raw[1].replace(/-\d{2}$/, '') : raw[1]; raw[1] = lastCol1; }
      else if (lastCol1) raw[1] = lastCol1;
      if (raw[2] && raw[2].trim()) lastCol2 = raw[2];
      else if (lastCol2) raw[2] = lastCol2;
    });

    return (items || []).map((r) => {
      const raw = r._raw || [];
      const rawQte = raw[8] || r.qte_inv || r._resolved_qte || '0';
      const qte = parseFloat(String(rawQte).replace(/[^\d.-]/g, '')) || 0;
      const code = raw[1] || r._resolved_code || r.no_produit || '';
      const poidsUnit = r._resolved_poids_unit || getPoidsUnitaire(poidsList, code) || 0;
      const poidsTotal = r._resolved_poids_total || qte * poidsUnit || 0;
      return {
        source: 'gh', categorie_id: '', categorie_nom: '', code_produit: code,
        description: raw[2] || r._resolved_desc || r.description || '', no_lot: raw[16] || r.no_lot || '',
        no_sous_lot: raw[17] || r.no_sous_lot || '', quantite: qte, poids_unit: poidsUnit, poids_total: poidsTotal,
        date_fab: raw[18] || r.date_lot || '', date_peremption: raw[19] || r.expiration || '', notes: '',
        raw, _raw: raw, _original: r,
      };
    });
  } catch { return []; }
}
