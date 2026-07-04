export const REC_KEY = 'soy_recurrences';
const DEFAULT_RECS = [0, 1, 30, 60, 90, 120];

export function loadRecs() {
  try {
    const v = localStorage.getItem(REC_KEY);
    return v ? JSON.parse(v) : [...DEFAULT_RECS];
  } catch { return [...DEFAULT_RECS]; }
}

export function saveRecs(recs) {
  try { localStorage.setItem(REC_KEY, JSON.stringify(recs)); } catch { /* ignore */ }
}

export function todayStr() {
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

export function diffDays(s) {
  return Math.round((new Date(s + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000);
}

/** Calcule la classe/libellé de la date de prochaine vérification. */
export function prochaineInfo(row) {
  if (!row.derniere_verification) return { cls: 'never', lbl: 'Jamais vérifié', prochaine: null };
  const prochaine = addDays(row.derniere_verification, row.recurrence);
  const diff = diffDays(prochaine);
  if (diff < 0) return { cls: 'overdue', lbl: fmtDate(prochaine) + ' (' + Math.abs(diff) + 'j retard)', prochaine };
  if (diff <= 7) return { cls: 'soon', lbl: fmtDate(prochaine) + ' (dans ' + diff + 'j)', prochaine };
  return { cls: 'ok', lbl: fmtDate(prochaine), prochaine };
}
