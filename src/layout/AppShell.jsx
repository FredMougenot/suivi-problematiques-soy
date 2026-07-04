import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import Toasts from '../features/planning/components/Toasts';

/**
 * AppShell — squelette partagé : sidebar + topbar + zone de contenu (Outlet).
 * Remplace la nav copiée-collée dans chacune des ~30 pages .html legacy.
 * Toasts monté ici (partagé entre toutes les pages protégées).
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
          <div className="sb-sec">Problématiques</div>
          <Link
            className={`sb-item${location.pathname === '/dashboard' ? ' active' : ''}`}
            to="/dashboard"
          >
            <span className="sb-ico">◈</span> Tableau de bord
          </Link>
          <Link
            className={`sb-item${location.pathname === '/problematiques' ? ' active' : ''}`}
            to="/problematiques"
          >
            <span className="sb-ico">◉</span> Registre
          </Link>
          <div className="sb-sec">Planning</div>
          <Link
            className={`sb-item${location.pathname === '/' ? ' active' : ''}`}
            to="/"
          >
            <span className="sb-ico">▤</span> Planning auto
          </Link>
          <Link
            className={`sb-item${location.pathname === '/intentions-production' ? ' active' : ''}`}
            to="/intentions-production"
          >
            <span className="sb-ico">🏭</span> Intentions de production
          </Link>
          <Link
            className={`sb-item${location.pathname === '/planning-camions' ? ' active' : ''}`}
            to="/planning-camions"
          >
            <span className="sb-ico">🚛</span> Planification camions
          </Link>
          <Link
            className={`sb-item${location.pathname === '/stats-ponctualite' ? ' active' : ''}`}
            to="/stats-ponctualite"
          >
            <span className="sb-ico">📊</span> Radar de ponctualité
          </Link>
          <div className="sb-sec">Inventaires</div>
          <Link
            className={`sb-item${location.pathname === '/inventaire-cyclique' ? ' active' : ''}`}
            to="/inventaire-cyclique"
          >
            <span className="sb-ico">📋</span> Inventaire cyclique
          </Link>
          <Link
            className={`sb-item${location.pathname === '/inventaire-gh' ? ' active' : ''}`}
            to="/inventaire-gh"
          >
            <span className="sb-ico">🔗</span> Inventaire GH
          </Link>
          <Link
            className={`sb-item${location.pathname === '/inventaire-usine' ? ' active' : ''}`}
            to="/inventaire-usine"
          >
            <span className="sb-ico">🏭</span> Inventaire usine
          </Link>
          <Link
            className={`sb-item${location.pathname === '/inventaire-global' ? ' active' : ''}`}
            to="/inventaire-global"
          >
            <span className="sb-ico">🌐</span> Inventaire global
          </Link>
          <Link
            className={`sb-item${location.pathname === '/inventaire-diff' ? ' active' : ''}`}
            to="/inventaire-diff"
          >
            <span className="sb-ico">📈</span> Inventaire diff
          </Link>
          <div className="sb-sec">Outils</div>
          <Link
            className={`sb-item${location.pathname === '/environnement' ? ' active' : ''}`}
            to="/environnement"
          >
            <span className="sb-ico">🌿</span> Environnement
          </Link>
          <Link
            className={`sb-item${location.pathname === '/erreurs-papier' ? ' active' : ''}`}
            to="/erreurs-papier"
          >
            <span className="sb-ico">📝</span> Erreurs papier
          </Link>
          <div className="sb-sec">Mon compte</div>
          <Link
            className={`sb-item${location.pathname === '/profil' ? ' active' : ''}`}
            to="/profil"
          >
            <span className="sb-ico">◎</span> Mon profil
          </Link>

          {/* Les autres sections (Camions, Paramètres) seront ajoutées
              au fur et à mesure de la migration */}
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

      <Toasts />
    </div>
  );
}
