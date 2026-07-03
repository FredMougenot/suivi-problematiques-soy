import { Outlet, Link, useLocation } from 'react-router-dom';

/**
 * AppShell — squelette partagé : sidebar + topbar + zone de contenu (Outlet).
 * Remplace la nav copiée-collée dans chacune des ~30 pages .html legacy.
 * Phase 0 : structure minimale, la navigation complète (sections/items du
 * sb-nav) sera enrichie au fur et à mesure que chaque page est migrée.
 */
export default function AppShell() {
  const location = useLocation();

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
            <div className="sb-avatar">F</div>
            <div className="sb-uinfo">
              <div className="sb-uname">Fred</div>
              <div className="sb-urole">Admin</div>
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
