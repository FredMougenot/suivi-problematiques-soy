import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

/**
 * AppShell — squelette partagé : sidebar + topbar + zone de contenu (Outlet).
 * Remplace la nav copiée-collée dans chacune des ~30 pages .html legacy.
 * Phase 1 : nav connectée à l'auth réelle (email + logout fonctionnel).
 * Les items de nav spécifiques (Inventaires, Problématiques, Paramètres)
 * seront ajoutés au fur et à mesure de la migration — Phase 3+.
 */
export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuthStore();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-row">
            <div className="sb-icon">S</div>
            <div>
              <div className="sb-rule" />
              <div className="sb-sub">Expédition SOY</div>
            </div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-sec">Planning</div>
          <Link
            className={`sb-item${location.pathname === '/' ? ' active' : ''}`}
            to="/"
          >
            <span className="sb-ico">▤</span> Planning auto
          </Link>

          {/* Les autres sections (Inventaires, Problématiques, Paramètres)
              seront ajoutées au fur et à mesure de la migration — Phase 3+ */}
        </nav>

        <div className="sb-foot">
          <div className="sb-user">
            <div className="sb-avatar">{initial}</div>
            <div className="sb-uinfo">
              <div className="sb-uname">{user?.email ?? '—'}</div>
              <div className="sb-urole">{role === 'admin' ? 'Admin' : 'Viewer'}</div>
            </div>
            <div className="sb-logout" onClick={handleLogout} title="Se déconnecter">
              ⏻
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="tool-title">SOY</div>
          <div className="tb-acts" />
        </header>

        <Outlet />
      </div>
    </div>
  );
}
