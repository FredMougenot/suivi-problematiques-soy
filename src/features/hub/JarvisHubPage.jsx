import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import JarvisCore from './JarvisCore';
import HubPanels from './HubPanels';
import HubStage from './HubStage';
import { findBranch } from './hubConfig';
import { HUB_VARIANT } from './hubVariant';
import { useHubKpis } from './useHubKpis';
import { useAuthStore } from '../../store/useAuthStore';
import './jarvisHub.css';
import './hubIdentity.css';

/**
 * JarvisHubPage — la page unique qui évolue.
 *
 * Un seul état décide si le noyau occupe le centre (hub) ou s'il est réduit
 * en haut à gauche pour libérer la surface d'affichage (focus). Le module
 * correspondant est monté dans cette surface, quel que soit son type.
 *
 * ══ DEUX APPARENCES, UNE SEULE LOGIQUE ═══════════════════════════
 * HUB_VARIANT (hubVariant.js) choisit entre le réacteur canvas et l'ancien
 * noyau SVG. État, navigation, KPI, identité et surface d'affichage sont
 * communs : seule la couche visuelle change. Basculer la constante suffit à
 * revenir en arrière.
 *
 * ══ L'ÉTAT EST DANS LE CHEMIN, PAS DANS LES PARAMÈTRES ══════════════
 * #/hub/problematiques et non #/hub?vue=… : ProblematiquesPage appelle
 * setSearchParams({}) au montage pour nettoyer ses propres paramètres, ce
 * qui effacerait la clé maintenant la vue ouverte. Le chemin, lui, n'est
 * touché par personne. Ne pas rebasculer sur useSearchParams.
 */

const NO_BRANCHES = [];

export default function JarvisHubPage() {
  const { vue } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const active = useMemo(() => findBranch(vue), [vue]);
  const focused = Boolean(active);
  const reacteur = HUB_VARIANT === 'reacteur';

  const kpis = useHubKpis({ enabled: !focused });

  // Prénom seul : « Bonjour, Frédéric » sonne juste, le nom complet fait
  // administratif. Repli sur la partie locale de l'e-mail.
  const firstName = useMemo(() => {
    const meta = user?.user_metadata || {};
    if (meta.prenom) return meta.prenom;
    const local = (user?.email ?? '').split('@')[0];
    if (!local) return null;
    const head = local.split(/[._-]/)[0];
    return head ? head.charAt(0).toUpperCase() + head.slice(1) : null;
  }, [user]);

  const [clock, setClock] = useState('');
  useEffect(() => {
    if (focused) return undefined;
    const tick = () =>
      setClock(new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false }));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [focused]);

  const select = useCallback((id) => navigate(`/hub/${id}`), [navigate]);
  const reset = useCallback(() => navigate('/hub'), [navigate]);

  // Un identifiant inconnu ramène au hub plutôt que d'afficher une page vide.
  useEffect(() => {
    if (vue && !active) navigate('/hub', { replace: true });
  }, [vue, active, navigate]);

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

  /* ── Éléments communs aux deux apparences ─────────────────────── */
  const identite = (
    <div className={`hub-identity${focused ? ' is-hidden' : ''}`}>
      {firstName ? (
        <div className="hub-greeting">Bonjour, <strong>{firstName}</strong></div>
      ) : null}
      <button
        type="button"
        className="hub-power"
        onClick={handleLogout}
        title="Se déconnecter"
        aria-label="Se déconnecter"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M12 3.6 v7.6" />
          <path d="M7.4 6.6 a6.6 6.6 0 1 0 9.2 0" />
        </svg>
      </button>
      <span className="hub-power-label">Déconnexion</span>
    </div>
  );

  const surface = (
    <div className={`view-surface${focused ? ' is-open' : ''}`}>
      {active ? (
        <>
          <div className="view-body">
            <Suspense fallback={<div className="view-loading">CHARGEMENT…</div>}>
              {ActiveComponent ? <ActiveComponent /> : null}
            </Suspense>
          </div>
        </>
      ) : null}
    </div>
  );

  /* ── Apparence réacteur (canvas) ─────────────────────────────── */
  if (reacteur) {
    return (
      <HubStage
        kpis={kpis}
        activeId={active?.id ?? null}
        focused={focused}
        onSelect={select}
        onReset={reset}
      >
        {identite}
        {surface}
        <div className={`hub-hint${focused ? ' is-hidden' : ''}`}>SÉLECTIONNER UN MODULE</div>
      </HubStage>
    );
  }

  /* ── Apparence classique (noyau SVG + rails) ───────────────────── */
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
      <HubPanels kpis={kpis} activeId={active?.id ?? null} hidden={focused} onSelect={select} />
      {identite}
      {surface}
      <div className={`hub-hint${focused ? ' is-hidden' : ''}`}>SÉLECTIONNER UN MODULE</div>
    </div>
  );
}
