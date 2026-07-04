export function fmtDate(s) {
  if (!s) return '—';
  s = String(s).trim();
  if (s.match(/^\d{2}\/\d{2}\/\d{4}$/)) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];
  return s;
}

export function fmtNum(v) {
  const n = parseFloat(v) || 0;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
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

export function getRootCategory(cat, categories) {
  if (!cat || !cat.parent_id) return cat;
  const p = categories.find((c) => c.id === cat.parent_id);
  return p ? getRootCategory(p, categories) : cat;
}

export function getCategoryForRow(row, categories) {
  if (row.source === 'usine') {
    if (row.categorie_id) return categories.find((x) => x.id === row.categorie_id) || null;
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

export function loadGhRowsFromStorage() {
  try {
    const saved = localStorage.getItem('gh_inventory');
    if (!saved) return [];
    const items = JSON.parse(saved);
    let lastCol1 = '', lastCol2 = '';
    (items || []).forEach((r) => {
      const raw = r._raw || [];
      if (raw[1] && raw[1].trim()) lastCol1 = raw[1]; else if (lastCol1) raw[1] = lastCol1;
      if (raw[2] && raw[2].trim()) lastCol2 = raw[2]; else if (lastCol2) raw[2] = lastCol2;
    });
    return (items || []).map((r) => {
      const raw = r._raw || [];
      const rawQte = raw[8] || r.qte_inv || r._resolved_qte || '0';
      const qte = parseFloat(String(rawQte).replace(/[^\d.-]/g, '')) || 0;
      const code = raw[1] || r._resolved_code || r.no_produit || '';
      const poidsTotal = r._resolved_poids_total || 0;
      return {
        source: 'gh', code_produit: code, description: raw[2] || r._resolved_desc || r.description || '',
        no_lot: raw[16] || r.no_lot || '', quantite: qte, poids_total: poidsTotal,
        date_fab: raw[18] || r.date_lot || '', date_peremption: raw[19] || r.expiration || '',
        raw, _raw: raw, _original: r, categorie_id: '', categorie_nom: '',
      };
    });
  } catch { return []; }
}

/** Fusionne (source+code+lot) en additionnant qté/poids. */
export function groupRows(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = [row.source, row.code_produit || '', row.no_lot || ''].join('|');
    if (!map.has(key)) {
      map.set(key, {
        source: row.source, code_produit: row.code_produit, description: row.description, no_lot: row.no_lot,
        quantite: 0, poids_total: 0, date_fab: row.date_fab, date_peremption: row.date_peremption,
        categorie_id: row.categorie_id, categorie_nom: row.categorie_nom,
        raw: row.raw, _raw: row._raw, _original: row._original,
      });
    }
    const g = map.get(key);
    g.quantite += parseFloat(row.quantite) || 0;
    g.poids_total += parseFloat(row.poids_total) || 0;
  });
  return [...map.values()];
}

/**
 * Compare snapshot précédent et actuel, retourne les lignes de changement
 * consolidées par code produit + lot (usine + GH additionnés).
 */
export function computeDiff(precData, actData, categories) {
  const precMap = new Map();
  precData.forEach((r) => precMap.set([r.source, r.code_produit, r.no_lot].join('|'), r));
  const actMap = new Map();
  actData.forEach((r) => actMap.set([r.source, r.code_produit, r.no_lot].join('|'), r));

  const changedCodes = new Set();
  actMap.forEach((actRow, key) => {
    const precRow = precMap.get(key);
    if (!precRow) { changedCodes.add(actRow.code_produit); return; }
    const qteChanged = Math.abs((parseFloat(actRow.quantite) || 0) - (parseFloat(precRow.quantite) || 0)) > 0.001;
    const poidsChanged = Math.abs((parseFloat(actRow.poids_total) || 0) - (parseFloat(precRow.poids_total) || 0)) > 0.001;
    if (qteChanged || poidsChanged) changedCodes.add(actRow.code_produit);
  });
  precMap.forEach((precRow, key) => { if (!actMap.has(key)) changedCodes.add(precRow.code_produit); });

  const consolidatedMap = new Map();
  actData.filter((r) => changedCodes.has(r.code_produit)).forEach((r) => {
    const lotKey = [r.code_produit, r.no_lot].join('|');
    if (!consolidatedMap.has(lotKey)) {
      consolidatedMap.set(lotKey, {
        code_produit: r.code_produit, description: r.description || '', no_lot: r.no_lot,
        categorie_id: r.categorie_id, categorie_nom: r.categorie_nom,
        usine_qte: 0, usine_poids: 0, gh_qte: 0, gh_poids: 0,
        date_fab: r.date_fab || '', date_peremption: r.date_peremption || '',
      });
    }
    const g = consolidatedMap.get(lotKey);
    if (r.source === 'usine') { g.usine_qte += parseFloat(r.quantite) || 0; g.usine_poids += parseFloat(r.poids_total) || 0; }
    else { g.gh_qte += parseFloat(r.quantite) || 0; g.gh_poids += parseFloat(r.poids_total) || 0; }
    if (!g.date_fab && r.date_fab) g.date_fab = r.date_fab;
    if (!g.date_peremption && r.date_peremption) g.date_peremption = r.date_peremption;
  });

  const diffRows = [];
  consolidatedMap.forEach((row, lotKey) => {
    const [code, lot] = lotKey.split('|');
    const _cat = getCategoryForRow({ source: 'gh', categorie_id: row.categorie_id, code_produit: code, description: row.description, no_lot: lot, _original: null, raw: null, _raw: null }, categories)
      || getCategoryForRow({ source: 'usine', categorie_id: row.categorie_id, code_produit: code, description: row.description, no_lot: lot, _original: null, raw: null, _raw: null }, categories);

    const usineKey = ['usine', code, lot].join('|'), ghKey = ['gh', code, lot].join('|');
    const usineAct = actMap.get(usineKey), usinePrc = precMap.get(usineKey);
    const ghAct = actMap.get(ghKey), ghPrc = precMap.get(ghKey);

    let type = 'mod';
    if (!usinePrc && !ghPrc) type = 'new';
    if (!usineAct && !ghAct) type = 'gone';

    const prev_total_qte = (parseFloat(usinePrc?.quantite) || 0) + (parseFloat(ghPrc?.quantite) || 0);
    const prev_total_poids = (parseFloat(usinePrc?.poids_total) || 0) + (parseFloat(ghPrc?.poids_total) || 0);
    const total_qte = row.usine_qte + row.gh_qte;
    const total_poids = row.usine_poids + row.gh_poids;

    diffRows.push({
      type, _cat, code_produit: code, description: row.description, no_lot: lot, categorie_id: row.categorie_id,
      usine_qte: row.usine_qte, usine_poids: row.usine_poids, gh_qte: row.gh_qte, gh_poids: row.gh_poids,
      total_qte, total_poids, prev_total_qte, prev_total_poids,
      date_fab: row.date_fab, date_peremption: row.date_peremption,
    });
  });

  return diffRows;
}
