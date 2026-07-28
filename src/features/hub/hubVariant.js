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
 * Réglages du réacteur — valeurs du 3e export Claude Design.
 *
 * Le canvas a besoin de vraies valeurs hexadécimales, pas de var(--…) : ces
 * couleurs ne peuvent donc pas venir de tokens.css. Pour rapprocher le hub de
 * la charte SOY, remplacer cyan par '#14C9B7' ou '#4FE0D4'.
 *
 *   speed        2.25 — entre les deux exports précédents (0.6 puis 3)
 *   surgeEvery   6 — surtension plus fréquente
 *   surgePower   0 — mais d'amplitude nulle : la surtension n'accélère plus
 *                les anneaux, elle ne fait que respirer en luminosité
 *
 * Les mêmes couleurs sont reprises dans reactor.css (ligne de balayage) et
 * dans HubStage (liseré des cartes) : les changer ici seul ne suffit pas à
 * tout aligner.
 */
export const REACTEUR = {
  cyan: '#7f8cff',
  amber: '#ffc542',
  speed: 2.25,
  intensity: 2,
  density: 1,
  surgeEvery: 6,
  surgePower: 0,
};
