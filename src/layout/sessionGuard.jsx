import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';

const DELAI_INACTIVITE_MS = 60 * 60 * 1000; // 1 heure
const EVENEMENTS_ACTIVITE = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

/**
 * Composant sans rendu, à monter une seule fois à la racine de l'app.
 * - Déconnecte l'utilisateur après 1h d'inactivité.
 * - Déconnecte l'utilisateur si sa session est reprise ailleurs (session_token
 *   différent détecté via Realtime sur la table sessions_actives).
 */
export function SessionGuard() {
  const user = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const logout = useAuthStore((s) => s.logout);
  const idleTimerRef = useRef(null);

  // --- Timer d'inactivité ---
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        logout();
      }, DELAI_INACTIVITE_MS);
    };

    resetTimer();
    EVENEMENTS_ACTIVITE.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      EVENEMENTS_ACTIVITE.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [user, logout]);

  // --- Détection de session concurrente (Realtime) ---
  useEffect(() => {
    if (!user || !sessionToken) return;

    const channel = supabase
      .channel(`session-guard-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions_actives',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const nouveauToken = payload.new?.session_token;
          // Si la ligne a été supprimée (payload.new vide) on ignore : c'est notre propre logout.
          if (!nouveauToken) return;
          if (nouveauToken !== sessionToken) {
            // Une autre connexion a pris la main : on se déconnecte sans re-supprimer sa ligne.
            logout({ supprimerSession: false });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sessionToken, logout]);

  return null;
}
