/**
 * AppBackground — fond global de l'application.
 *
 * Monté une seule fois dans AppShell (donc persiste entre les changements
 * de page, pas de remontage à chaque navigation).
 *
 * Pour l'instant : dégradé statique en CSS pur (.app-background dans
 * tokens.css), aucune animation ni WebGL — volontaire pour un outil
 * utilisé des heures durant un quart de travail.
 *
 * Pour changer le fond plus tard (image, dégradé animé, vidéo, etc.),
 * il suffit de modifier ce fichier — aucun autre composant n'a besoin
 * d'être touché.
 */
export default function AppBackground() {
  return <div className="app-background" aria-hidden="true" />;
}
