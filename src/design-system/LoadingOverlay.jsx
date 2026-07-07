import { WeaveSpinner } from './WeaveSpinner';

/**
 * Indicateur de chargement global — remplace l'ancien .spinner-box/.spinner-ring.
 * Toujours affiché par-dessus le contenu, centré en bas de l'écran visible
 * (position fixed par rapport au viewport, pas au flux de la page), afin
 * qu'il apparaisse au même endroit peu importe la page ou le scroll.
 */
export default function LoadingOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '24px',
        transform: 'translateX(-50%) translateZ(0)',
        zIndex: 950,
        pointerEvents: 'none',
      }}
    >
      <div style={{ transform: 'scale(0.55)' }}>
        <WeaveSpinner />
      </div>
    </div>
  );
}
