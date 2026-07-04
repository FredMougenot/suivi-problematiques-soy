const STATUT_CLASS = { 'À traiter': 'bt', 'En cours': 'bc', 'Résolu': 'br', 'Annulé': 'ban', 'Clôturé': 'bcl' };
const PRIO_CLASS = { Critique: 'bpC', Haute: 'bpH', Moyenne: 'bpM', Basse: 'bpB' };

export function StatutBadge({ statut }) {
  return <span className={`badge ${STATUT_CLASS[statut] || 'ban'}`}>{statut || '—'}</span>;
}

export function PrioriteBadge({ priorite }) {
  return <span className={`badge ${PRIO_CLASS[priorite] || 'bpB'}`}>{priorite || ''}</span>;
}

export function PilierBadge({ pilier }) {
  return <span className="badge bd">{pilier || ''}</span>;
}
