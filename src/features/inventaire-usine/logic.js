export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function getMondayStr() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export function fmtDate(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return d + '/' + m + '/' + y;
}

/** Trouve la catégorie GH correspondant à un code produit (teste sous-catégories avant racines). */
export function matchCategoryForCode(allCategories, code) {
  if (!code || !allCategories.length) return null;
  const codeUp = String(code).trim().toUpperCase();
  const children = allCategories.filter((c) => c.parent_id);
  const roots = allCategories.filter((c) => !c.parent_id);

  for (const cat of [...children, ...roots]) {
    if (!cat.rules || !cat.rules.length) continue;
    let result = true;
    for (let i = 0; i < cat.rules.length; i++) {
      const rule = cat.rules[i];
      if (rule.col !== 'no_produit' && rule.col !== '1') continue;
      const cellVal = codeUp;
      const ruleVal = (rule.value || '').toUpperCase();
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
    if (result) return cat;
  }
  return null;
}

export function calcPoidsTotal(row) {
  return (parseFloat(row.quantite) || 0) * (parseFloat(row.poids_unit) || 0) + (parseFloat(row.balance) || 0);
}

let tmpIdCounter = -1;
export function nextTmpId() { return tmpIdCounter--; }
