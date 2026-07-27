import { createHashRouter, Navigate } from 'react-router-dom';
import AppShell from './layout/AppShell';
import ProtectedRoute from './layout/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import JarvisHubPage from './features/hub/JarvisHubPage';
import PlanningAutoPage from './features/planning/PlanningAutoPage';
import IntentionsProductionPage from './features/production/IntentionsProductionPage';
import PlanningCamionsPage from './features/camions/PlanningCamionsPage';
import ParametresPlanningPage from './features/camions/ParametresPlanningPage';
import StatsPonctualitePage from './features/stats/StatsPonctualitePage';
import InventaireCycliquePage from './features/inventaire-cyclique/InventaireCycliquePage';
import InventaireGhPage from './features/inventaire-gh/InventaireGhPage';
import InventaireNetrackPage from './features/inventaire-netrack/InventaireNetrackPage';
import InventaireUsinePage from './features/inventaire-usine/InventaireUsinePage';
import InventaireGlobalPage from './features/inventaire-global/InventaireGlobalPage';
import InventaireDiffPage from './features/inventaire-diff/InventaireDiffPage';
import DashboardPage from './features/problematiques/DashboardPage';
import ProblematiquesPage from './features/problematiques/ProblematiquesPage';
import ProfilPage from './features/profil/ProfilPage';
import EnvironnementPage from './features/environnement/EnvironnementPage';
import ErreursPapierPage from './features/erreurs-papier/ErreursPapierPage';
import ParametresProbPage from './features/parametres-prob/ParametresProbPage';
import ParametresInventairePage from './features/parametres-inventaire/ParametresInventairePage';
import ParametresGhPage from './features/parametres-gh/ParametresGhPage';

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
      // Le hub Jarvis est l'écran d'accueil. Pour revenir à l'ancien
      // comportement : remettre to="/dashboard" ci-dessous.
      { index: true, element: <Navigate to="/hub" replace /> },

      // L'état du hub est dans le CHEMIN, pas dans les paramètres d'URL :
      // certains modules (ProblematiquesPage) appellent setSearchParams({})
      // au montage pour nettoyer leurs propres paramètres, ce qui effacerait
      // l'état du hub et refermerait la vue à l'instant même où elle s'ouvre.
      { path: 'hub', element: <JarvisHubPage /> },
      { path: 'hub/:vue', element: <JarvisHubPage /> },

      { path: 'planning-auto', element: <PlanningAutoPage /> },
      { path: 'intentions-production', element: <IntentionsProductionPage /> },
      { path: 'planning-camions', element: <PlanningCamionsPage /> },
      { path: 'parametres-planning', element: <ParametresPlanningPage /> },
      { path: 'stats-ponctualite', element: <StatsPonctualitePage /> },
      { path: 'inventaire-cyclique', element: <InventaireCycliquePage /> },
      { path: 'inventaire-gh', element: <InventaireGhPage /> },
      { path: 'inventaire-netrack', element: <InventaireNetrackPage /> },
      { path: 'inventaire-usine', element: <InventaireUsinePage /> },
      { path: 'inventaire-global', element: <InventaireGlobalPage /> },
      { path: 'inventaire-diff', element: <InventaireDiffPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'problematiques', element: <ProblematiquesPage /> },
      { path: 'profil', element: <ProfilPage /> },
      { path: 'environnement', element: <EnvironnementPage /> },
      { path: 'erreurs-papier', element: <ErreursPapierPage /> },
      { path: 'parametres-prob', element: <ParametresProbPage /> },
      { path: 'parametres-inventaire', element: <ParametresInventairePage /> },
      { path: 'parametres-gh', element: <ParametresGhPage /> },
    ],
  },
]);
