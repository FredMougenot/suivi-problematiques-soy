import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

const TZ = 'America/Toronto';

export function todayStr() {
  return formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
}

export function fmtDateFR(dateStr) {
  return formatInTimeZone(new Date(dateStr + 'T00:00:00'), TZ, 'EEEE d MMMM yyyy', { locale: fr });
}

export function fmtTimeTz(iso) {
  return formatInTimeZone(new Date(iso), TZ, 'HH:mm').replace(':', ' h ');
}

export function formatHeure(h) {
  if (!h) return '—';
  if (h.includes && (h.includes('T') || h.includes('-'))) {
    const d = new Date(h);
    if (!isNaN(d)) {
      return formatInTimeZone(d, TZ, 'HH').padStart(2, '0') + ' h ' + formatInTimeZone(d, TZ, 'mm');
    }
  }
  const parts = String(h).split(':');
  if (parts.length >= 2) {
    let hh = parseInt(parts[0], 10);
    if (!isNaN(hh) && hh >= 24) hh -= 24;
    const hStr = isNaN(hh) ? parts[0] : String(hh).padStart(2, '0');
    return `${hStr} h ${parts[1]}`;
  }
  return h;
}

export function normHeureTube(str) {
  if (typeof str !== 'string') return str;
  const m = str.match(/^(\d{1,2})\s*[h:]\s*(\d{2})\b/);
  if (!m) return str;
  let hh = parseInt(m[1], 10);
  if (hh >= 24) hh -= 24;
  return String(hh).padStart(2, '0') + 'h' + m[2];
}

export function heureLabelSlot(heure) {
  if (!heure) return null;
  const match = heure.match(/^(\d+)h(\d{2})$/);
  if (match) {
    let h = parseInt(match[1]);
    const m = match[2];
    if (h >= 24) {
      h -= 24;
      return { txt: `${String(h).padStart(2, '0')}h${m}`, lendemain: true };
    }
  }
  return { txt: heure, lendemain: false };
}

export function getStatutClass(statut) {
  if (statut === 'en_cours') return 'en-cours';
  if (statut === 'camion_pret') return 'camion-pret';
  return 'inactive';
}

export function getStatutLabel(statut) {
  if (statut === 'en_cours') return 'En cours';
  if (statut === 'camion_pret') return 'Camion prêt';
  return 'Inactive';
}
