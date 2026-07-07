import { Outlet } from 'react-router-dom';
import Toasts from '../features/planning/components/Toasts';
import AppBackground from './AppBackground';
import Sidebar from './Sidebar';

/**
 * AppShell — squelette partagé : sidebar + topbar + zone de contenu (Outlet).
 *
 * La navigation est entièrement gérée dans Sidebar.jsx (point unique de
 * modification). AppShell ne s'occupe que du layout général.
 */
export default function AppShell() {
  return (
    <div className="app-layout">
      <AppBackground />
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div className="tool-title">SOY</div>
          <div className="tb-acts" />
        </header>
        <Outlet />
      </div>
      <Toasts />
    </div>
  );
}
