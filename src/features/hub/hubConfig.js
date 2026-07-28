import { lazy } from 'react';

/**
 * hubConfig.js — POINT DE MODIFICATION UNIQUE des éléments du hub.
 *
 * ══ RACCOURCIS ═════════════════════════════════════════════
 * Pour brancher un module supplémentaire : ajouter une entrée ici. Rien
 * d'autre à toucher — numérotation, placement dans le rail, trace de
 * jonction et sens du coude sont dérivés automatiquement.
 *
 *   id        identifiant stable (segment d'URL : #/hub/<id>)
 *   title     libellé du panneau
 *   icon      glyphe court (cohérent avec NAV_ITEMS de Sidebar.jsx)
 *   side      'left' ou 'right' — rail d'ancrage
 *   unit      légende sous la valeur
 *   Component page montée dans la surface centrale (lazy → bundle séparé)
 *
 * La valeur affichée vient de useHubKpis, clé = `id`.
 */
export const HUB_BRANCHES = [
  {
    id: 'problematiques',
    title: 'Problématiques',
    icon: '◈',
    side: 'left',
    unit: 'actives',
    Component: lazy(() => import('../problematiques/ProblematiquesPage')),
  },
  {
    id: 'camions',
    title: 'Planification camions',
    icon: '🚛',
    side: 'left',
    unit: 'camions actifs aujourd\u2019hui',
    Component: lazy(() => import('../camions/PlanningCamionsPage')),
  },
  {
    id: 'netrack',
    title: 'Inventaire NetRack',
    icon: '📦',
    side: 'right',
    unit: 'palettes en stock',
    Component: lazy(() => import('../inventaire-netrack/InventaireNetrackPage')),
  },
  {
    id: 'parametres-prob',
    title: 'Paramètres prob.',
    icon: '⚙️',
    side: 'right',
    unit: 'responsables',
    Component: lazy(() => import('../parametres-prob/ParametresProbPage')),
  },
];

/**
 * ══ FENÊTRES KPI ══════════════════════════════════════════
 * Indicateurs en lecture seule, sans navigation.
 *
 *   fake   valeur de démonstration, affichée tant qu'aucun fetcher n'existe
 *          dans useHubKpis. Dès qu'un fetcher renvoie une valeur pour cet
 *          `id`, elle prend le dessus — rien d'autre à changer ici.
 *   trend  'up' | 'down' | null — colore la pastille de tendance
 *   bars   silhouette décorative (0–1), à remplacer par de vraies séries
 */
export const HUB_KPIS = [
  {
    id: 'ponctualite',
    title: 'Ponctualité',
    unit: 'sur 7 jours',
    side: 'left',
    trend: 'up',
    fake: '94 %',
    bars: [.35, .52, .44, .68, .61, .78, .72],
  },
  {
    id: 'quais',
    title: 'Occupation quais',
    unit: 'temps réel',
    side: 'left',
    trend: null,
    fake: '6 / 8',
    bars: [.5, .62, .58, .71, .66, .59, .74],
  },
  {
    id: 'ecarts',
    title: 'Écarts inventaire',
    unit: 'dernier cycle',
    side: 'right',
    trend: 'down',
    fake: '12',
    bars: [.72, .64, .58, .49, .43, .38, .3],
  },
  {
    id: 'charge',
    title: 'Charge expédition',
    unit: 'quart en cours',
    side: 'right',
    trend: 'up',
    fake: '78 %',
    bars: [.28, .41, .47, .55, .62, .69, .81],
  },
];

export function findBranch(id) {
  return HUB_BRANCHES.find((b) => b.id === id) ?? null;
}
