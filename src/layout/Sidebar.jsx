/**
 * Sidebar.jsx — Menu de navigation flottant centralisé pour SOY
 *
 * ═══════════════════════════════════════════════════════════════
 * POINT DE MODIFICATION UNIQUE pour tout changement de navigation :
 *
 *   1. NAV_ITEMS     → ajouter/retirer/réordonner des items de navigation
 *   2. NavItem       → ajuster le style visuel de chaque item
 *   3. FloatingMenu  → ajuster le comportement du menu (position, animation,
 *                      icône trigger, logique expand/collapse)
 *
 * Le menu est position:fixed et passe par-dessus tout le contenu.
 * Aucune logique de navigation n'existe ailleurs dans le projet.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

// ─────────────────────────────────────────────────────────────────
//  CONFIG : toute la navigation est définie ici.
//  Pour ajouter une page : ajouter { label, path, icon } dans le tableau.
// ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Tableau de bord',        path: '/dashboard',             icon: '◈' },
  { label: 'Registre',               path: '/problematiques',         icon: '◉' },
  { label: 'Planning auto',          path: '/',                       icon: '▤' },
  { label: 'Intentions production',  path: '/intentions-production',  icon: '🏭' },
  { label: 'Planification camions',  path: '/planning-camions',       icon: '🚛' },
  { label: 'Radar de ponctualité',   path: '/stats-ponctualite',      icon: '📊' },
  { label: 'Inventaire cyclique',    path: '/inventaire-cyclique',    icon: '📋' },
  { label: 'Inventaire GH',          path: '/inventaire-gh',          icon: '🔗' },
  { label: 'Inventaire usine',       path: '/inventaire-usine',       icon: '🏭' },
  { label: 'Inventaire global',      path: '/inventaire-global',      icon: '🌐' },
  { label: 'Inventaire diff',        path: '/inventaire-diff',        icon: '📈' },
  { label: 'Environnement',          path: '/environnement',          icon: '🌿' },
  { label: 'Erreurs papier',         path: '/erreurs-papier',         icon: '📝' },
  { label: 'Mon profil',             path: '/profil',                 icon: '◎' },
  { label: 'Paramètres GH',         path: '/parametres-gh',          icon: '⚙️' },
  { label: 'Paramètres inventaire',  path: '/parametres-inventaire',  icon: '⚙️' },
  { label: 'Paramètres prob.',       path: '/parametres-prob',        icon: '⚙️' },
];

// ─────────────────────────────────────────────────────────────────
//  NavItem : un lien de navigation individuel dans le menu déroulé
// ─────────────────────────────────────────────────────────────────
function NavItem({ label, path, icon, isActive, onClick }) {
  return (
    <Link
      to={path}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 14px',
        borderRadius: '8px',
        fontSize: '.84rem',
        color: isActive ? 'var(--copper-pale)' : 'var(--text-secondary)',
        background: isActive ? 'var(--copper-dim)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(139,92,246,.22)' : 'transparent'}`,
        fontWeight: isActive ? 500 : 400,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'all .15s cubic-bezier(.4,0,.2,1)',
        transform: 'translateZ(0)',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--bg-raised)';
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--text-faint)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.borderColor = 'transparent';
        }
      }}
    >
      <span style={{ width: '18px', textAlign: 'center', opacity: isActive ? 1 : .65, flexShrink: 0 }}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────
//  FloatingMenu : menu flottant fixe, passe par-dessus tout
// ─────────────────────────────────────────────────────────────────
export default function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuthStore();

  const initial = user?.email ? user.email[0].toUpperCase() : '?';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  function close() { setIsOpen(false); }

  return (
    <>
      {/* ── Backdrop (ferme le menu au clic extérieur) ── */}
      {isOpen && (
        <div
          onClick={close}
          style={{ position: 'fixed', inset: 0, zIndex: 299 }}
        />
      )}

      {/* ── Conteneur fixe en haut à gauche ── */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 300,
        transform: 'translateZ(0)',
      }}>

        {/* ── Bouton trigger (toujours visible) ── */}
        <button
          onClick={() => setIsOpen(v => !v)}
          title="Menu"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: isOpen ? 'var(--copper-dim)' : 'rgba(14, 10, 26, .82)',
            border: `1px solid ${isOpen ? 'rgba(139,92,246,.4)' : 'var(--text-faint)'}`,
            backdropFilter: 'blur(16px)',
            color: isOpen ? 'var(--copper-light)' : 'var(--text-muted)',
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all .15s cubic-bezier(.4,0,.2,1)',
            transform: 'translateZ(0)',
          }}
        >
          {isOpen ? '✕' : '☰'}
        </button>

        {/* ── Panneau déroulant ── */}
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '52px',
            left: 0,
            width: '240px',
            background: 'rgba(14, 10, 26, .92)',
            backdropFilter: 'blur(20px) saturate(140%)',
            border: '1px solid var(--text-faint)',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-xl)',
            transform: 'translateZ(0)',
            overflow: 'hidden',
          }}>

            {/* ── Brand ── */}
            <div style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid var(--text-faint)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <div style={{
                width: '32px', height: '32px',
                border: '1px solid rgba(139,92,246,.35)',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontStyle: 'italic', fontSize: '.9rem',
                color: 'var(--copper-light)',
                background: 'var(--copper-dim)',
                flexShrink: 0,
                transform: 'translateZ(0)',
              }}>S</div>
              <div style={{ fontSize: '.6rem', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '.18em', textTransform: 'uppercase' }}>
                Expédition SOY
              </div>
            </div>

            {/* ── Items de navigation ── */}
            <div style={{
              padding: '8px',
              maxHeight: 'calc(100vh - 180px)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}>
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.path}
                  label={item.label}
                  path={item.path}
                  icon={item.icon}
                  isActive={location.pathname === item.path}
                  onClick={close}
                />
              ))}
            </div>

            {/* ── Footer utilisateur ── */}
            <div style={{
              padding: '10px',
              borderTop: '1px solid var(--text-faint)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--copper), var(--copper-light))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.68rem', fontWeight: 700,
                color: 'var(--bg-void)', flexShrink: 0,
                transform: 'translateZ(0)',
              }}>{initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email ?? '—'}
                </div>
                <div style={{ fontSize: '.64rem', color: 'var(--copper)', marginTop: '1px' }}>
                  {role === 'admin' ? 'Admin' : 'Viewer'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Se déconnecter"
                style={{
                  padding: '5px',
                  borderRadius: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '.85rem',
                  cursor: 'pointer',
                  transition: 'all .15s',
                  transform: 'translateZ(0)',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--ruby)'; e.currentTarget.style.background = 'var(--ruby-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
              >⏻</button>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
