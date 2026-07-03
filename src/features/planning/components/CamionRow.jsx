import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function CamionRow({ c, heureAffichee, onDepart, isParti }) {
  if (isParti) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
        className="camion-row is-parti"
        onClick={() => onDepart(c.camion, true)}
      >
        <span className="camion-num">Camion {c.camion}</span>
        <span className="camion-heure">{heureAffichee}</span>
        <span className="camion-pct" style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none' }}>—</span>
        <span className="camion-badge parti">Parti</span>
        <span className="depart-hint">Annuler ‹</span>
      </motion.div>
    );
  }

  const estPret = c.statut === 'camion_pret';
  const pct = estPret ? 100 : Math.round((c.progression || 0) * 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      className={clsx('camion-row', { pret: estPret })}
      onClick={() => onDepart(c.camion, false)}
    >
      <div className="camion-fill" style={{ width: pct + '%' }}></div>
      <span className="camion-num">Camion {c.camion}</span>
      <span className="camion-heure">{heureAffichee}</span>
      <span className="camion-pct">{pct}%</span>
      <span className={clsx('camion-badge', estPret ? 'pret' : 'en-cours')}>{estPret ? 'Prêt' : 'En cours'}</span>
      <span className="depart-hint">Marquer parti ›</span>
    </motion.div>
  );
}
