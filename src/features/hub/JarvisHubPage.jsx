import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import JarvisCore from './JarvisCore';
import HubPanels from './HubPanels';
import { findBranch } from './hubConfig';
import { useHubKpis } from './useHubKpis';
import { useAuthStore } from '../../store/useAuthStore';
import './jarvisHub.css';
import './hubIdentity.css';

/**
 * JarvisHubPage — la page unique qui évolue.
 *
 * Un seul état (`vue`) décide si le noyau occupe le centre (hub) ou s'il est
 * réduit en haut à gauche pour libérer la surface d'affichage (focus). Le
 * module correspondant est monté dans cette surface, quel que soit son type.
 *
 * L'état est synchronisé avec l'URL (?vue=netrack) : F5, bouton Précédent et
 * partage de lien continuent de fonctionner sans changement de page.
 *
 * RÉPARTITION DES RÔLES
 *   JarvisCore  — purement décoratif. On lui passe branches={[]} : les
 *                 raccourcis vivent désormais dans les rails latéraux, plus
 *                 sur le cercle. Le composant graphique reste intact.
 *   HubPanels   — raccourcis + fenêtres KPI, ancrés aux bords.
 *   cette page  — état, navigation, identité, déconnexion.
 */

const NO_BRANCHES = [];

export default function JarvisHubPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const requested = params.get('vue');
  const active = useMemo(() => findBranch(requested), [requested]);
  const focused = Boolean(active);

  const kpis = useHubKpis({ enabled: !focused });

  // Prénom seul : « Bonjour, Frédéric » sonne juste, le nom complet fait
  // administratif. Repli sur la partie locale de l'e-mail si les métadonnées
  // ne sont pas encore chargées.
  const firstName = useMemo(() => {
    const meta = user?.user_metadata || {};
    if (meta.prenom) return meta.prenom;
    const local = (user?.email ?? '').split('@')[0];
    if (!local) return null;
    const head = local.split(/[._-]/)[0];
    return head ? head.charAt(0).toUpperCase() + head.slice(1) : null;
  }, [user]);

  // Horloge du noyau — présente uniquement en mode hub.
  const [clock, setClock] = useState('');
  useEffect(() => {
    if (focused) return undefined;
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('fr-CA', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [focused]);

  const select = useCallback(
    (id) => setParams({ vue: id }, { replace: false }),
    [setParams]
  );
  const reset = useCallback(() => setParams({}, { replace: false }), [setParams]);

  // Échap ramène au hub.
  useEffect(() => {
    if (!focused) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') reset(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused, reset]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const ActiveComponent = active?.Component ?? null;

  return (
    <div className="jarvis-page">
      <JarvisCore
        branches={NO_BRANCHES}
        kpis={kpis}
        activeId={active?.id ?? null}
        focused={focused}
        clock={focused ? '' : clock}
        onSelect={select}
        onReset={reset}
      />

      <HubPanels
        kpis={kpis}
        activeId={active?.id ?? null}
        hidden={focused}
        onSelect={select}
      />

      {/* Accueil + déconnexion, dans le cercle central du noyau */}
      <div className={`hub-identity${focused ? ' is-hidden' : ''}`}>
        {firstName ? (
          <div className="hub-greeting">
            Bonjour, <strong>{firstName}</strong>
          </div>
        ) : null}

        <button
          type="button"
          className="hub-power"
          onClick={handleLogout}
          title="Se déconnecter"
          aria-label="Se déconnecter"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 3.6 v7.6" />
            <path d="M7.4 6.6 a6.6 6.6 0 1 0 9.2 0" />
          </svg>
        </button>
        <span className="hub-power-label">Déconnexion</span>
      </div>

      <div className={`view-surface${focused ? ' is-open' : ''}`}>
        {active ? (
          <>
            <div className="view-head">
              <span className="view-title">
                <span aria-hidden="true" style={{ marginRight: 8, opacity: .8 }}>{active.icon}</span>
                {active.title}
              </span>
              <span className="view-spacer" />
              <button type="button" className="view-back" onClick={reset}>
                ← Retour au hub
              </button>
            </div>
            <div className="view-body">
              <Suspense fallback={<div className="view-loading">CHARGEMENT…</div>}>
                {ActiveComponent ? <ActiveComponent /> : null}
              </Suspense>
            </div>
          </>
        ) : null}
      </div>

      <div className={`hub-hint${focused ? ' is-hidden' : ''}`}>
        SÉLECTIONNER UN MODULE
      </div>
    </div>
  );
}
