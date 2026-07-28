/**
 * hubVariant.js — COMMUTATEUR D'APPARENCE DU HUB.
 *
 *   'reacteur'  noyau canvas + cartes de l'export Claude Design (actuel)
 *   'classique' noyau SVG maison + rails latéraux (JarvisCore.jsx,
 *               HubPanels.jsx, jarvisHub.css, hubPanels.css)
 *
 * Les deux implémentations coexistent : basculer cette constante suffit à
 * revenir en arrière, sans git, sans rien réinstaller. Les données, la
 * navigation et les KPI sont communs — seule la couche visuelle change.
 *
 * Ne pas supprimer l'ancienne version tant que la nouvelle n'a pas tourné
 * quelques semaines en production.
 */
export const HUB_VARIANT = 'reacteur';

/**
 * Réglages du réacteur — valeurs du 2e export Claude Design.
 *
 * Le canvas a besoin de vraies valeurs hexadécimales, pas de var(--…) : ces
 * couleurs ne peuvent donc pas venir de tokens.css. Pour rapprocher le hub de
 * la charte SOY, remplacer cyan par '#14C9B7' ou '#4FE0D4'.
 *
 *   speed        3 — le double export précédent tournait à 0.6, beaucoup plus lent
 *   surgePower   0 — désactive la surtension périodique (plus de « coup de jus »)
 *
 * Les mêmes couleurs sont reprises dans reactor.css (ligne de balayage) et
 * dans HubStage (liseré des cartes) : les changer ici seul ne suffit pas à
 * tout aligner.
 */
export const REACTEUR = {
  cyan: '#7f8cff',
  amber: '#ffc542',
  speed: 3,
  intensity: 2,
  density: 1,
  surgeEvery: 10,
  surgePower: 0,
};
