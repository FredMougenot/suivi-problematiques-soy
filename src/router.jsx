import { createHashRouter } from 'react-router-dom';
import AppShell from './layout/AppShell';
import ProtectedRoute from './layout/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import PlanningAutoPage from './features/planning/PlanningAutoPage';
import IntentionsProductionPage from './features/production/IntentionsProductionPage';
import PlanningCamionsPage from './features/camions/PlanningCamionsPage';

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
    ],
  },
]);
