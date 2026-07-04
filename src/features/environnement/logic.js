export const VERIFS_FIXES = [
  'Portes et accès dégagés',
  'Zones de déchets conformes',
  'Contenants identifiés et fermés',
  'Planchers propres et secs',
  'Éclairage fonctionnel',
  'Extincteurs accessibles',
  'Matières dangereuses sécurisées',
  'Bacs de récupération en ordre',
];

export function localToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function isToday(dateStr) { return dateStr === localToday(); }

export function changeDayStr(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ── Limites graphiques (localStorage) ──────────────────────────
export function getEnvLimit(period) {
  try {
    const v = localStorage.getItem('env_limit_' + period);
    return v !== null && v !== '' ? Number(v) : null;
  } catch { return null; }
}

export function saveEnvLimit(period, val) {
  try { localStorage.setItem('env_limit_' + period, val); } catch { /* ignore */ }
}

// ── Paramètres de création automatique des problématiques NC ──
const NC_PARAMS_KEY = 'env_nc_params';
const defaultNcParams = () => ({ pilier: 'Environnement', priorite: 'Moyenne', statut: 'À traiter', responsable: '', soumis_par: 'Environnement auto' });

export function getNcParams() {
  try {
    const saved = localStorage.getItem(NC_PARAMS_KEY);
    if (!saved) return defaultNcParams();
    return { ...defaultNcParams(), ...JSON.parse(saved) };
  } catch { return defaultNcParams(); }
}

export function saveNcParams(params) {
  try { localStorage.setItem(NC_PARAMS_KEY, JSON.stringify(params)); } catch { /* ignore */ }
}

// ── Séries graphiques (semaine / mois) à partir de l'historique ──
export function computeNcSeries(historyByDay) {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
  const weekLabels = [], weekData = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    weekLabels.push(d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric' }));
    weekData.push(historyByDay[ds] || 0);
  }

  const yr = today.getFullYear(), mo = today.getMonth();
  const monthLabels = [], monthData = [];
  for (let i = 1; i <= today.getDate(); i++) {
    const ds = yr + '-' + String(mo + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0');
    monthLabels.push(String(i));
    monthData.push(historyByDay[ds] || 0);
  }

  return { week: { labels: weekLabels, data: weekData }, month: { labels: monthLabels, data: monthData } };
}
