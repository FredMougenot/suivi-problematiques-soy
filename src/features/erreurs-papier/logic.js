export const QUARTS = [
  { id: 1, label: 'Quart 1', short: 'Q1', color: '#D4AF37', glow: 'rgba(212,175,55,.2)', bg: 'rgba(212,175,55,.06)' },
  { id: 2, label: 'Quart 2', short: 'Q2', color: '#87CEEB', glow: 'rgba(135,206,235,.2)', bg: 'rgba(135,206,235,.06)' },
  { id: 3, label: 'Quart 3', short: 'Q3', color: '#DDA0DD', glow: 'rgba(221,160,221,.2)', bg: 'rgba(221,160,221,.06)' },
];

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

export function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d); monday.setDate(d.getDate() + diff);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}

export function getMonthRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear(), month = d.getMonth();
  const start = new Date(year, month, 1), end = new Date(year, month + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function getDaysInRange(startStr, endStr) {
  const days = [];
  const start = new Date(startStr + 'T00:00:00'), end = new Date(endStr + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(d.toISOString().slice(0, 10));
  return days;
}

export function isToday(dateStr) { return dateStr === todayStr(); }

export function changeDate(curDate, view, delta) {
  const d = new Date(curDate + 'T00:00:00');
  if (view === 'jour') d.setDate(d.getDate() + delta);
  else if (view === 'semaine') d.setDate(d.getDate() + delta * 7);
  else if (view === 'mois') d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 10);
}

export function isComptable(row) {
  const statut = (row.statut_ligne || '').toUpperCase();
  if (statut === 'INACTIF') return false;
  const dest = (row.destination || '').trim();
  if (dest.toUpperCase().includes('BOBTAIL')) return false;
  return true;
}

export function calculateStats(rows) {
  const comptables = rows.filter((r) => isComptable(r));
  const stats = QUARTS.map((q) => {
    const camionsVerifies = comptables.filter((r) => {
      const state = r.etat_verification || '';
      return state === `q${q.id}_ok` || state === `q${q.id}_err`;
    });
    const total = camionsVerifies.length;
    const errors = camionsVerifies.filter((r) => (r.etat_verification || '') === `q${q.id}_err`).length;
    const efficiency = total > 0 ? Math.round(((total - errors) / total) * 100) : null;
    return { ...q, errors, total, efficiency };
  });
  const totalGlobal = comptables.filter((r) => { const state = r.etat_verification || ''; return state && state !== 'none'; }).length;
  return { stats, total: totalGlobal };
}

export function getEfficiencyColor(efficiency) {
  if (efficiency === null) return '#6B7280';
  if (efficiency >= 95) return '#10B981';
  if (efficiency >= 85) return '#3B82F6';
  if (efficiency >= 70) return '#F59E0B';
  if (efficiency >= 50) return '#F97316';
  return '#EF4444';
}

export function getEfficiencyGlow(efficiency) {
  if (efficiency === null) return 'rgba(107,114,128,.3)';
  if (efficiency >= 95) return 'rgba(16,185,129,.3)';
  if (efficiency >= 85) return 'rgba(59,130,246,.3)';
  if (efficiency >= 70) return 'rgba(245,158,11,.3)';
  if (efficiency >= 50) return 'rgba(249,115,22,.3)';
  return 'rgba(239,68,68,.3)';
}

export function efficiencyLabel(efficiency) {
  if (efficiency === null) return 'Non calculable';
  if (efficiency >= 95) return 'Excellence';
  if (efficiency >= 85) return 'Très bon';
  if (efficiency >= 70) return 'Bon';
  if (efficiency >= 50) return 'Moyen';
  return 'Critique';
}

export function buildErrorList(rows, curView) {
  const errors = [];
  rows.forEach((row) => {
    if (!isComptable(row)) return;
    const state = row.etat_verification || '';
    QUARTS.forEach((q) => {
      if (state === `q${q.id}_err`) {
        errors.push({ time: row.heure_planif || '—', quart: q, truck: row.num_depart || row.num_camion || '—', dest: row.destination || '—', date: row.date_jour, id: row.id || null });
      }
    });
  });
  errors.sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)));
  return errors;
}

export function buildHeatmapData(allRows, days) {
  const byDay = {};
  days.forEach((day) => {
    const dayRows = allRows.filter((r) => r.date_jour === day);
    const dayStats = calculateStats(dayRows);
    byDay[day] = { total: dayStats.stats.reduce((s, q) => s + q.errors, 0), q1: dayStats.stats[0].errors, q2: dayStats.stats[1].errors, q3: dayStats.stats[2].errors };
  });
  return byDay;
}
