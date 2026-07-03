export const SLOTS = [
  { idx: 0, h: '06:00', lbl: '06h00 · A' },
  { idx: 1, h: '06:00', lbl: '06h00 · B' },
  { idx: 2, h: '07:30', lbl: '07h30' },
  { idx: 3, h: '09:00', lbl: '09h00' },
  { idx: 4, h: '11:30', lbl: '11h30' },
  { idx: 5, h: '14:00', lbl: '14h00' },
  { idx: 6, h: '15:30', lbl: '15h30' },
  { idx: 7, h: '17:00', lbl: '17h00' },
  { idx: 8, h: '18:00', lbl: '18h00' },
  { idx: 9, h: '19:00', lbl: '19h00' },
];
export const HOURS = ['06:00', '07:30', '09:00', '11:30', '14:00', '15:30', '17:00', '18:00', '19:00'];

export function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function diff(planif, reel) {
  if (!planif || !reel) return null;
  const [ph, pm] = planif.split(':').map(Number);
  const [rh, rm] = reel.split(':').map(Number);
  return rh * 60 + rm - (ph * 60 + pm);
}

export function cls(d, seuil1, seuil2) {
  if (d === null) return 'attente';
  if (d <= seuil1) return 'ok';
  if (d <= seuil2) return 'warn';
  return 'bad';
}

export function tcls(t, objectif) {
  if (t === null) return 'copper';
  if (t >= objectif) return 'green';
  if (t >= objectif * 0.8) return 'yellow';
  return 'red';
}

export function isActif(r, slActif) {
  const sl = (r.statut_ligne || '').trim();
  return sl === '' || sl.toUpperCase() === slActif.toUpperCase();
}

export function isNonLivre(r, slActif, slInactif, slNonLivre) {
  const sl = (r.statut_ligne || '').trim();
  if (!sl) return false;
  if (slNonLivre) return sl.toUpperCase() === slNonLivre.toUpperCase();
  return sl.toUpperCase() !== slActif.toUpperCase() && sl.toUpperCase() !== slInactif.toUpperCase();
}

export function statutCamion(r, seuils) {
  const { slActif, slInactif, slNonLivre, seuil1 } = seuils;
  if (isNonLivre(r, slActif, slInactif, slNonLivre)) return 'nonlivre';
  if (!isActif(r, slActif)) return 'inactif';
  const d = diff(r.heure_planif, r.heure_reelle);
  if (d !== null) return d <= seuil1 ? 'arrive_ok' : 'arrive_retard';
  return 'attente';
}

/** Analyse un ensemble de lignes planning_camions et retourne les KPIs agrégés. */
export function analyze(rows, seuils) {
  let onTime = 0, late = 0, attente = 0, nonLivre = 0, inactif = 0;
  const retards = [];
  rows.forEach((r) => {
    const st = statutCamion(r, seuils);
    if (st === 'inactif') { inactif++; return; }
    if (st === 'arrive_ok') onTime++;
    else if (st === 'arrive_retard') {
      late++;
      const d = diff(r.heure_planif, r.heure_reelle);
      if (d !== null) retards.push(d);
    } else if (st === 'nonlivre') nonLivre++;
    else attente++;
  });
  const arrived = onTime + late;
  const total = onTime + late + attente + nonLivre;
  const tauxBase = arrived + nonLivre;
  const taux = tauxBase > 0 ? Math.round((onTime / tauxBase) * 100) : total > 0 ? 0 : null;
  const avgRet = retards.length > 0 ? Math.round(retards.reduce((a, b) => a + b, 0) / retards.length) : 0;
  const maxRet = retards.length > 0 ? Math.max(...retards) : 0;
  return { onTime, late, attente, nonLivre, arrived, total, inactif, taux, avgRet, maxRet, retards };
}

export function getRange(period, curDate) {
  const d = new Date(curDate + 'T00:00:00');
  if (period === 'day') return { start: curDate, end: curDate };
  if (period === 'week') {
    const dow = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
  }
  const ms = new Date(d.getFullYear(), d.getMonth(), 1);
  const me = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: ms.toISOString().slice(0, 10), end: me.toISOString().slice(0, 10) };
}

export function periodLabel(period, curDate) {
  const { start, end } = getRange(period, curDate);
  const fmtDay = (s) => {
    const d = new Date(s + 'T00:00:00');
    const jour = d.toLocaleDateString('fr-CA', { weekday: 'long' });
    const date = d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
    return jour.charAt(0).toUpperCase() + jour.slice(1) + ' · ' + date;
  };
  const fmts = (s) => new Date(s + 'T00:00:00').toLocaleDateString('fr-CA', { day: '2-digit', month: 'short' });
  if (period === 'day') return fmtDay(start);
  if (period === 'week') return fmts(start) + ' – ' + fmts(end);
  return new Date(start + 'T00:00:00').toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
}

export function daysInRange(start, end) {
  const days = [];
  let d = new Date(start + 'T00:00:00');
  const ed = new Date(end + 'T00:00:00');
  while (d <= ed) { days.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  return days;
}
