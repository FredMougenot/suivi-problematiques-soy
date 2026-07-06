import './glowingShadow.css';

/**
 * Enveloppe une carte avec un halo lumineux animé (rotation + pulsation au survol).
 * - accent : couleur CSS (ex: 'var(--copper-light)') utilisée pour la barre du haut et le halo
 * - Le contenu (children) reçoit l'apparence de carte (fond, bordure, radius, padding)
 *   via .glow-content — pas besoin d'ajouter .kpi ou un fond dessus.
 */
export default function GlowingShadow({ children, accent = 'var(--copper)', onClick, className }) {
  return (
    <div
      className={`glow-container${className ? ' ' + className : ''}`}
      style={{ '--accent': accent }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <span className="glow"></span>
      <div className="glow-content">{children}</div>
    </div>
  );
}
