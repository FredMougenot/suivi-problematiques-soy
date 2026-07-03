export function localToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function addDays(s, n) {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(2).replace(/\.?0+$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

export function calcRow(r) {
  const pu = parseFloat(r.poids_unitaire) || 0, q1 = parseFloat(r.qte_e1) || 0;
  const b1 = parseFloat(r.balance1) || 0, q2 = parseFloat(r.qte_e2) || 0;
  const b2 = parseFloat(r.balance2) || 0, erp = parseFloat(r.erp) || 0;
  const total = (q1 * pu + b1) + (q2 * pu + b2);
  return { total, ecart: total - erp };
}

export const BASE_ITEMS = [{ idx: 0, label: 'Item 1' }, { idx: 1, label: 'Item 2' }, { idx: 2, label: 'Item 3' }];

export function countOverdueOnDate(paramItems, dateStr) {
  return paramItems.filter((p) => {
    if (!p.derniere_verification) return true;
    const prochaine = addDays(p.derniere_verification, p.recurrence);
    return prochaine < dateStr;
  }).length;
}

/** Algorithme de lissage : détermine quels items "OK" ou "jamais vérifiés" sont recommandés aujourd'hui. */
export function computeRecommended(paramItems, today) {
  const urgent = [], soon = [], never = [], ok = [];
  paramItems.forEach((p) => {
    if (!p.derniere_verification) { never.push(p); return; }
    const prochaine = addDays(p.derniere_verification, p.recurrence);
    const diff = Math.round((new Date(prochaine + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    if (diff < 0) urgent.push(p);
    else if (diff <= 7) soon.push(p);
    else ok.push(p);
  });

  const candidates = [...ok, ...never];
  if (!candidates.length) return new Set();

  const scheduleOccupied = {};
  [...urgent, ...soon].forEach((p) => {
    const deadline = addDays(p.derniere_verification, p.recurrence);
    let best = today, bestCount = Infinity, d = today;
    while (d <= deadline) {
      const c = scheduleOccupied[d] || 0;
      if (c < bestCount) { bestCount = c; best = d; }
      const nd = new Date(d + 'T00:00:00'); nd.setDate(nd.getDate() + 1);
      d = nd.toISOString().slice(0, 10);
    }
    scheduleOccupied[best] = (scheduleOccupied[best] || 0) + 1;
  });

  const byRec = {};
  candidates.forEach((p) => {
    const r = p.recurrence || 30;
    if (!byRec[r]) byRec[r] = [];
    byRec[r].push(p);
  });

  const assignedDates = {};
  Object.entries(byRec).forEach(([rec, items]) => {
    const r = parseInt(rec);
    const sorted = [...items].sort((a, b) => {
      if (!a.derniere_verification && b.derniere_verification) return -1;
      if (a.derniere_verification && !b.derniere_verification) return 1;
      return (a.derniere_verification || '') < (b.derniere_verification || '') ? -1 : 1;
    });
    const step = r / sorted.length;
    sorted.forEach((p, idx) => {
      const offset = Math.round((idx + 1) * step);
      if (!p.derniere_verification) {
        const idealDate = addDays(today, Math.round(idx * step));
        assignedDates[p.id] = idealDate <= today ? today : idealDate;
      } else {
        const idealDate = addDays(p.derniere_verification, offset);
        assignedDates[p.id] = idealDate <= today ? today : idealDate;
      }
    });
  });

  const dailyCap = Math.ceil(paramItems.filter((p) => p.recurrence > 0).reduce((s, p) => s + 1 / p.recurrence, 0));
  const loadToday = scheduleOccupied[today] || 0;
  const available = Math.max(0, dailyCap - loadToday);

  const todayCandidates = Object.entries(assignedDates)
    .filter(([, date]) => date === today)
    .map(([id]) => candidates.find((p) => p.id === id))
    .filter(Boolean)
    .sort((a, b) => {
      if (!a.derniere_verification && b.derniere_verification) return -1;
      if (a.derniere_verification && !b.derniere_verification) return 1;
      return addDays(a.derniere_verification || today, a.recurrence) < addDays(b.derniere_verification || today, b.recurrence) ? -1 : 1;
    });

  const recommendedToday = new Set();
  todayCandidates.slice(0, available).forEach((p) => recommendedToday.add(p.id));
  return recommendedToday;
}

/** Calcule le statut d'affichage de chaque item pour la liste de vérification (miroir de renderVerif). */
export function buildVerifRows(paramItems, today) {
  const recommended = computeRecommended(paramItems, today);
  let nUrgent = 0, nSoon = 0, nRec = 0, nOk = 0;

  const rows = paramItems
    .map((p, i) => {
      const prochaine = p.derniere_verification ? addDays(p.derniere_verification, p.recurrence) : null;
      const verifAujourdhui = p.derniere_verification === today;
      let statut, badgeCls, show = true, isRec = false;
      if (!prochaine) {
        if (recommended.has(p.id)) { statut = 'Recommandé'; badgeCls = 'vbadge-recommended'; nRec++; isRec = true; }
        else { nOk++; show = false; }
      } else {
        const diff = Math.round((new Date(prochaine + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
        if (diff < 0) { statut = Math.abs(diff) + 'j de retard'; badgeCls = 'vbadge-overdue'; nUrgent++; }
        else if (diff <= 7) { statut = 'Dans ' + diff + 'j'; badgeCls = 'vbadge-soon'; nSoon++; }
        else if (recommended.has(p.id)) { statut = 'Recommandé'; badgeCls = 'vbadge-recommended'; nRec++; isRec = true; }
        else { nOk++; show = false; }
      }
      return { p, i, prochaine, verifAujourdhui, statut, badgeCls, show, isRec };
    })
    .filter((x) => x.show);

  return { rows, kpis: { total: paramItems.length, nUrgent, nSoon, nRec, nOk }, recommended };
}
