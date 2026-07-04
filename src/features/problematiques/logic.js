export const PILIERS = ['SST', 'Qualite', 'Couts', 'Delais', 'Motivation', 'Environnement', 'Informations'];

export function localToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function localDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function fmtDate(d) {
  if (!d) return '';
  const s = String(d).length === 10 ? d + 'T00:00:00' : d;
  return new Date(s).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtId(id) {
  return String(id || '').padStart(4, '0').slice(-4);
}

export function isIncomplet(p) {
  return !p.cause || !p.action || !p.responsable || !p.date_prevue;
}

const STATUTS_TERMINES = ['Résolu', 'Clôturé', 'Annulé'];
const MASQUEES = ['Clôturé', 'Annulé'];

export function retardJours(p) {
  if (!p.date_prevue || STATUTS_TERMINES.includes(p.statut)) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const prevue = new Date(p.date_prevue + 'T00:00:00');
  const diffJ = Math.floor((today - prevue) / 86400000);
  return diffJ > 0 ? diffJ : null;
}

/** Filtre commun utilisé par le tableau de bord et le registre. */
export function filterProblemes(allProblems, { search = '', pilier = '', statut = '', priorite = '', showCloture = false, incomplet = false, dateCutoff = null } = {}) {
  const q = search.toLowerCase();
  return allProblems.filter((p) => {
    if (dateCutoff && localDate(p.created_at) > dateCutoff) return false;
    if (!showCloture && MASQUEES.includes(p.statut)) return false;
    if (q && !(p.intitule || '').toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false;
    if (pilier && p.pilier !== pilier) return false;
    if (statut && p.statut !== statut) return false;
    if (priorite && p.priorite !== priorite) return false;
    if (incomplet && !isIncomplet(p)) return false;
    return true;
  });
}

// ── Paramètres graphique critère (localStorage) ──────────────────
const emptySide = () => ({ min: null, labelMin: 'Minimum', max: null, labelMax: 'Maximum' });

export function getCritereParams(pilier) {
  try {
    const saved = localStorage.getItem('critere_params_' + pilier);
    if (!saved) return { week: emptySide(), month: emptySide() };
    const p = JSON.parse(saved);
    if (p.week === undefined) {
      // Rétrocompatibilité ancienne structure plate {minmax,label} ou {min,max,labelMin,labelMax}
      const legacy = p.minmax !== undefined
        ? { min: p.minmax, labelMin: p.label || 'Objectif', max: null, labelMax: 'Maximum' }
        : { min: p.min ?? null, labelMin: p.labelMin || 'Minimum', max: p.max ?? null, labelMax: p.labelMax || 'Maximum' };
      return { week: legacy, month: legacy };
    }
    return p;
  } catch { return { week: emptySide(), month: emptySide() }; }
}

export function saveCritereParams(pilier, params) {
  try { localStorage.setItem('critere_params_' + pilier, JSON.stringify(params)); } catch { /* ignore */ }
}

// ── Séries pour les graphiques ────────────────────────────────────
function weekDays() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
  const days = [], labels = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    days.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    labels.push(d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric' }));
  }
  return { days, labels };
}

function monthDays() {
  const today = new Date();
  const yr = today.getFullYear(), mo = today.getMonth();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const days = [], labels = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(yr + '-' + String(mo + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0'));
    labels.push(String(i));
  }
  return { days, labels };
}

function isActiveOnDay(p, d) {
  if (localDate(p.created_at) > d) return false;
  const resolue = p.date_resolue ? localDate(p.date_resolue) : null;
  if (resolue && resolue <= d && STATUTS_TERMINES.includes(p.statut)) return false;
  return true;
}

/**
 * Calcule les séries semaine/mois pour un ensemble de problématiques.
 * mode 'created' : compte les créations du jour (comportement tableau de bord).
 * mode 'active'  : compte les problématiques actives ce jour-là (comportement registre).
 */
export function computeSeries(probs, mode = 'active') {
  const w = weekDays(), m = monthDays();
  const countFn = mode === 'created'
    ? (d) => probs.filter((p) => localDate(p.created_at) === d).length
    : (d) => probs.filter((p) => isActiveOnDay(p, d)).length;
  return {
    week: { labels: w.labels, data: w.days.map(countFn) },
    month: { labels: m.labels, data: m.days.map(countFn) },
  };
}
