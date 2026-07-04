import { createHashRouter } from 'react-router-dom';
import AppShell from './layout/AppShell';
import ProtectedRoute from './layout/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import PlanningAutoPage from './features/planning/PlanningAutoPage';
import IntentionsProductionPage from './features/production/IntentionsProductionPage';
import PlanningCamionsPage from './features/camions/PlanningCamionsPage';
import ParametresPlanningPage from './features/camions/ParametresPlanningPage';
import StatsPonctualitePage from './features/stats/StatsPonctualitePage';
import InventaireCycliquePage from './features/inventaire-cyclique/InventaireCycliquePage';
import InventaireGhPage from './features/inventaire-gh/InventaireGhPage';
import InventaireUsinePage from './features/inventaire-usine/InventaireUsinePage';
import InventaireGlobalPage from './features/inventaire-global/InventaireGlobalPage';
import InventaireDiffPage from './features/inventaire-diff/InventaireDiffPage';

export const router = createHashRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <PlanningAutoPage /> },
      { path: 'intentions-production', element: <IntentionsProductionPage /> },
      { path: 'planning-camions', element: <PlanningCamionsPage /> },
      { path: 'parametres-planning', element: <ParametresPlanningPage /> },
      { path: 'stats-ponctualite', element: <StatsPonctualitePage /> },
      { path: 'inventaire-cyclique', element: <InventaireCycliquePage /> },
      { path: 'inventaire-gh', element: <InventaireGhPage /> },
      { path: 'inventaire-usine', element: <InventaireUsinePage /> },
      { path: 'inventaire-global', element: <InventaireGlobalPage /> },
      { path: 'inventaire-diff', element: <InventaireDiffPage /> },
    ],
  },
]);
