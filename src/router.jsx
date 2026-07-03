import { createHashRouter } from 'react-router-dom';
import AppShell from './layout/AppShell';
import ProtectedRoute from './layout/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import PlanningAutoPage from './features/planning/PlanningAutoPage';

/**
 * HashRouter choisi pour la Phase 0 : compatible GitHub Pages sans
 * config serveur supplémentaire (voir §6 du plan de migration).
 * Migration possible vers BrowserRouter + 404.html plus tard.
 *
 * /login est hors AppShell (pas de sidebar avant connexion).
 * Toutes les autres routes sont protégées par ProtectedRoute.
 */
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
    ],
  },
]);
