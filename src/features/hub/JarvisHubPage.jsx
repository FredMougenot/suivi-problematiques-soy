import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import JarvisCore from './JarvisCore';
import { HUB_BRANCHES, findBranch } from './hubConfig';
import { useHubKpis } from './useHubKpis';
import './jarvisHub.css';

/**
 * JarvisHubPage — la page unique qui évolue.
 *
 * Il n'y a pas de changement de page : un seul état (`vue`) décide si le
 * noyau occupe le centre (hub) ou s'il est réduit en haut à gauche pour
 * libérer la surface d'affichage (focus). Le module correspondant est monté
 * dans cette surface, quel que soit son contenu (tableau, graphique, formulaire).
 *
 * L'état est synchronisé avec l'URL (?vue=netrack) pour que F5, le bouton
 * Précédent du navigateur et le partage de lien continuent de fonctionner.
 */
export default function JarvisHubPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('vue');
  const active = useMemo(() => findBranch(requested), [requested]);
  const focused = Boolean(active);

  const kpis = useHubKpis({ enabled: !focused });

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

  const ActiveComponent = active?.Component ?? null;

  return (
    <div className="jarvis-page">
      <JarvisCore
        branches={HUB_BRANCHES}
        kpis={kpis}
        activeId={active?.id ?? null}
        focused={focused}
        clock={focused ? '' : clock}
        onSelect={select}
        onReset={reset}
      />

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
