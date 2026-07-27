import { lazy } from 'react';

/**
 * hubConfig.js — POINT DE MODIFICATION UNIQUE des éléments du hub.
 *
 * ══ RACCOURCIS ═════════════════════════════════════════════
 * Pour brancher un module supplémentaire : ajouter une entrée dans
 * HUB_BRANCHES. Rien d'autre à toucher — numérotation, placement dans le
 * rail et trace de jonction sont dérivés automatiquement.
 *
 *   id        identifiant stable (utilisé dans l'URL ?vue=…)
 *   title     libellé du panneau
 *   icon      glyphe court (cohérent avec NAV_ITEMS de Sidebar.jsx)
 *   side      'left' ou 'right' — rail d'ancrage
 *   unit      légende sous la valeur
 *   Component page montée dans la surface centrale (lazy → bundle séparé)
 *
 * Les pages sont chargées paresseusement : tant qu'un raccourci n'a pas été
 * cliqué, son code n'est jamais téléchargé.
 */
export const HUB_BRANCHES = [
  {
    id: 'problematiques',
    title: 'Problématiques',
    icon: '◈',
    side: 'left',
    unit: 'ouvertes aujourd\u2019hui',
    Component: lazy(() => import('../problematiques/ProblematiquesPage')),
  },
  {
    id: 'camions',
    title: 'Planification camions',
    icon: '🚛',
    side: 'left',
    unit: 'camions planifiés',
    Component: lazy(() => import('../camions/PlanningCamionsPage')),
  },
  {
    id: 'netrack',
    title: 'Inventaire NetRack',
    icon: '📦',
    side: 'right',
    unit: 'items en stock',
    Component: lazy(() => import('../inventaire-netrack/InventaireNetrackPage')),
  },
  {
    id: 'parametres-prob',
    title: 'Paramètres prob.',
    icon: '⚙️',
    side: 'right',
    unit: 'critères actifs',
    Component: lazy(() => import('../parametres-prob/ParametresProbPage')),
  },
];

/**
 * ══ FENÊTRES KPI ══════════════════════════════════════════
 * Indicateurs purement lecture, sans navigation. `id` sert de clé dans
 * l'objet retourné par useHubKpis ; tant qu'aucun fetcher n'est câblé, la
 * fenêtre affiche « — » sans jamais tomber en erreur.
 *
 *   trend  'up' | 'down' | null — colore la pastille de tendance
 *   bars   silhouette décorative (0–1), remplacée par de vraies séries plus tard
 */
export const HUB_KPIS = [
  {
    id: 'ponctualite',
    title: 'Ponctualité',
    unit: 'sur 7 jours',
    side: 'left',
    trend: 'up',
    bars: [.35, .52, .44, .68, .61, .78, .72],
  },
  {
    id: 'quais',
    title: 'Occupation quais',
    unit: 'temps réel',
    side: 'left',
    trend: null,
    bars: [.5, .62, .58, .71, .66, .59, .74],
  },
  {
    id: 'ecarts',
    title: 'Écarts inventaire',
    unit: 'dernier cycle',
    side: 'right',
    trend: 'down',
    bars: [.72, .64, .58, .49, .43, .38, .3],
  },
  {
    id: 'charge',
    title: 'Charge expédition',
    unit: 'quart en cours',
    side: 'right',
    trend: 'up',
    bars: [.28, .41, .47, .55, .62, .69, .81],
  },
];

export function findBranch(id) {
  return HUB_BRANCHES.find((b) => b.id === id) ?? null;
}
