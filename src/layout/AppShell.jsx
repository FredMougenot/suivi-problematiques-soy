import { Outlet } from 'react-router-dom';
import Toasts from '../features/planning/components/Toasts';
import AppBackground from './AppBackground';
import FloatingMenu from './Sidebar';

/**
 * AppShell — squelette partagé : menu flottant + zone de contenu (Outlet).
 *
 * La navigation est entièrement gérée dans Sidebar.jsx (point unique de
 * modification). Le menu est position:fixed et passe par-dessus le contenu.
 * Le contenu principal prend 100% de la largeur.
 */
export default function AppShell() {
  return (
    <div className="app-layout">
      <AppBackground />
      <FloatingMenu />
      <div className="main">
        <Outlet />
      </div>
      <Toasts />
    </div>
  );
}
