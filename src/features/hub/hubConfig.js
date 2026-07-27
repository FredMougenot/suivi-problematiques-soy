import { lazy } from 'react';

/**
 * hubConfig.js — POINT DE MODIFICATION UNIQUE des branches du hub.
 *
 * Pour brancher un module supplémentaire sur le noyau Jarvis :
 *   1. ajouter une entrée dans HUB_BRANCHES
 *   2. c'est tout — géométrie, connecteur, KPI et montage sont dérivés.
 *
 * Champs :
 *   id       identifiant stable (utilisé dans l'URL ?vue=…)
 *   title    libellé affiché sur la carte de branche
 *   icon     glyphe court (cohérent avec NAV_ITEMS de Sidebar.jsx)
 *   angle    position autour du noyau, en degrés, repère écran (y vers le bas) :
 *              -135 = haut-gauche   -45 = haut-droite
 *               135 = bas-gauche     45 = bas-droite
 *   unit     légende sous le KPI
 *   Component  page montée dans la surface centrale (lazy → bundle séparé)
 *
 * Les pages sont chargées paresseusement : tant qu'une branche n'a pas été
 * cliquée, son code n'est jamais téléchargé. Le hub reste donc léger.
 */
export const HUB_BRANCHES = [
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    icon: '◈',
    angle: -135,
    unit: 'problématiques ouvertes',
    Component: lazy(() => import('../problematiques/DashboardPage')),
  },
  {
    id: 'camions',
    title: 'Planification camions',
    icon: '🚛',
    angle: -45,
    unit: 'camions planifiés aujourd\u2019hui',
    Component: lazy(() => import('../camions/PlanningCamionsPage')),
  },
  {
    id: 'netrack',
    title: 'Inventaire NetRack',
    icon: '📦',
    angle: 45,
    unit: 'items en stock',
    Component: lazy(() => import('../inventaire-netrack/InventaireNetrackPage')),
  },
  {
    id: 'parametres-prob',
    title: 'Paramètres prob.',
    icon: '⚙️',
    angle: 135,
    unit: 'critères actifs',
    Component: lazy(() => import('../parametres-prob/ParametresProbPage')),
  },
];

export function findBranch(id) {
  return HUB_BRANCHES.find((b) => b.id === id) ?? null;
}
