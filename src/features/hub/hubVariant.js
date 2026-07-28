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
 * Couleurs du réacteur. Celles de l'export d'origine ; pour rapprocher le
 * hub de la charte SOY, passer cyan à '#14C9B7' (--copper) ou '#4FE0D4'.
 * Le canvas a besoin de vraies valeurs hexadécimales, pas de var(--…).
 */
export const REACTEUR = {
  cyan: '#38d6ff',
  amber: '#ff7a18',
  speed: 0.6,
  intensity: 2,
  density: 1,
  surgeEvery: 10.5,
  surgePower: 0.1,
};
