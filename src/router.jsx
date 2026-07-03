import { createHashRouter } from 'react-router-dom';
import AppShell from './layout/AppShell';
import PlanningAutoPage from './features/planning/PlanningAutoPage';

/**
 * HashRouter choisi pour la Phase 0 : compatible GitHub Pages sans
 * config serveur supplémentaire (voir §6 du plan de migration).
 * Migration possible vers BrowserRouter + 404.html plus tard.
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <PlanningAutoPage /> },
    ],
  },
]);
