/**
 * Sidebar.jsx — Menu de navigation centralisé pour SOY
 *
 * ═══════════════════════════════════════════════════════════════
 * POINT DE MODIFICATION UNIQUE pour tout changement de navigation :
 *
 *   1. NAV_SECTIONS  → ajouter/retirer/réordonner des items et sections
 *   2. MenuSection   → ajuster le rendu d'une section (titre + items)
 *   3. MenuItem      → ajuster le style visuel de chaque lien
 *   4. Sidebar       → ajuster le layout global (brand, footer, auth)
 *
 * Aucune logique de navigation n'existe ailleurs dans le projet.
 * ═══════════════════════════════════════════════════════════════
 */

import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

// ─────────────────────────────────────────────────────────────────
//  CONFIG : toute la navigation est définie ici.
//  Pour ajouter une page : ajouter { label, path, icon } dans la
//  section voulue, ou créer une nouvelle entrée dans le tableau.
// ─────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Problématiques',
    items: [
      { label: 'Tableau de bord', path: '/dashboard',     icon: '◈' },
      { label: 'Registre',        path: '/problematiques', icon: '◉' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { label: 'Planning auto',         path: '/',                      icon: '▤'  },
      { label: 'Intentions production', path: '/intentions-production', icon: '🏭' },
      { label: 'Planification camions', path: '/planning-camions',      icon: '🚛' },
      { label: 'Radar de ponctualité',  path: '/stats-ponctualite',     icon: '📊' },
    ],
  },
  {
    label: 'Inventaires',
    items: [
      { label: 'Inventaire cyclique', path: '/inventaire-cyclique', icon: '📋' },
      { label: 'Inventaire GH',       path: '/inventaire-gh',       icon: '🔗' },
      { label: 'Inventaire usine',    path: '/inventaire-usine',    icon: '🏭' },
      { label: 'Inventaire global',   path: '/inventaire-global',   icon: '🌐' },
      { label: 'Inventaire diff',     path: '/inventaire-diff',     icon: '📈' },
    ],
  },
  {
    label: 'Outils',
    items: [
      { label: 'Environnement',  path: '/environnement',  icon: '🌿' },
      { label: 'Erreurs papier', path: '/erreurs-papier', icon: '📝' },
    ],
  },
  {
    label: 'Mon compte',
    items: [
      { label: 'Mon profil', path: '/profil', icon: '◎' },
    ],
  },
  {
    label: 'Paramètres',
    items: [
      { label: 'Paramètres GH',            path: '/parametres-gh',         icon: '⚙️' },
      { label: 'Paramètres inventaire',     path: '/parametres-inventaire', icon: '⚙️' },
      { label: 'Paramètres problématiques', path: '/parametres-prob',       icon: '⚙️' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
//  MenuItem : un lien de navigation individuel
// ─────────────────────────────────────────────────────────────────
function MenuItem({ label, path, icon, isActive }) {
  return (
    <Link
      className={`sb-item${isActive ? ' active' : ''}`}
      to={path}
    >
      <span className="sb-ico">{icon}</span>
      {label}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MenuSection : titre de section + ses items
// ─────────────────────────────────────────────────────────────────
function MenuSection({ label, items, currentPath }) {
  return (
    <>
      <div className="sb-sec">{label}</div>
      {items.map((item) => (
        <MenuItem
          key={item.path}
          label={item.label}
          path={item.path}
          icon={item.icon}
          isActive={currentPath === item.path}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Sidebar : sidebar complète (brand + nav + footer utilisateur)
//  Importé uniquement par AppShell.jsx.
// ─────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuthStore();

  const initial = user?.email ? user.email[0].toUpperCase() : '?';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="sidebar">

      {/* ── Brand ─────────────────────────────────────────────── */}
      <div className="sb-brand">
        <div className="sb-logo-row">
          <div className="sb-icon">S</div>
          <div>
            <div className="sb-rule" />
            <div className="sb-sub">Expédition SOY</div>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="sb-nav">
        {NAV_SECTIONS.map((section) => (
          <MenuSection
            key={section.label}
            label={section.label}
            items={section.items}
            currentPath={location.pathname}
          />
        ))}
      </nav>

      {/* ── Footer utilisateur ────────────────────────────────── */}
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
  );
}
