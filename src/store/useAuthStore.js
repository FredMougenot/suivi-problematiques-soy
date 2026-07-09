import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { fetchUserRole } from '../lib/roles';

/**
 * Enregistre (upsert) la session courante comme session active pour cet utilisateur.
 * Comme user_id est la clé primaire, ceci écrase automatiquement toute session
 * précédente : la dernière connexion gagne.
 */
async function enregistrerSessionActive(userId) {
  const sessionToken = crypto.randomUUID();
  const { error } = await supabase
    .from('sessions_actives')
    .upsert(
      {
        user_id: userId,
        session_token: sessionToken,
        derniere_activite: new Date().toISOString(),
        user_agent: navigator.userAgent,
      },
      { onConflict: 'user_id' }
    );
  if (error) {
    console.error('Erreur enregistrement session active :', error);
    return null;
  }
  return sessionToken;
}

async function supprimerSessionActive(userId) {
  if (!userId) return;
  const { error } = await supabase.from('sessions_actives').delete().eq('user_id', userId);
  if (error) console.error('Erreur suppression session active :', error);
}

export const useAuthStore = create((set, get) => ({
  user: null,
  role: null,           // 'admin' | 'viewer' | null
  isAuthenticated: false,
  isLoading: true,       // true tant qu'on n'a pas vérifié la session au chargement
  sessionToken: null,    // token de la session active locale, pour comparaison Realtime

  /**
   * Vérifie s'il y a une session active (appelé une fois au démarrage de l'app).
   */
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const role = await fetchUserRole(session.user.email);
      const sessionToken = await enregistrerSessionActive(session.user.id);
      set({ user: session.user, role, isAuthenticated: true, isLoading: false, sessionToken });
    } else {
      set({ user: null, role: null, isAuthenticated: false, isLoading: false, sessionToken: null });
    }

    // Réagit aux changements de session (login/logout dans un autre onglet, expiration, etc.)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Ne pas ré-enregistrer si c'est toujours le même utilisateur déjà suivi
        // (évite d'écraser le token à chaque refresh de token Supabase).
        const dejaSuivi = get().user?.id === session.user.id && get().sessionToken;
        if (dejaSuivi) {
          set({ user: session.user, isAuthenticated: true, isLoading: false });
          return;
        }
        const role = await fetchUserRole(session.user.email);
        const sessionToken = await enregistrerSessionActive(session.user.id);
        set({ user: session.user, role, isAuthenticated: true, isLoading: false, sessionToken });
      } else {
        set({ user: null, role: null, isAuthenticated: false, isLoading: false, sessionToken: null });
      }
    });
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const role = await fetchUserRole(data.user.email);
    const sessionToken = await enregistrerSessionActive(data.user.id);
    set({ user: data.user, role, isAuthenticated: true, isLoading: false, sessionToken });
    return data.user;
  },

  /**
   * @param {object} options
   * @param {boolean} options.supprimerSession - false quand on est déconnecté de force
   *   par une autre session (la ligne appartient déjà à cette autre session, il ne
   *   faut pas la supprimer).
   */
  logout: async ({ supprimerSession = true } = {}) => {
    const userId = get().user?.id;
    if (supprimerSession) {
      await supprimerSessionActive(userId);
    }
    await supabase.auth.signOut();
    set({ user: null, role: null, isAuthenticated: false, sessionToken: null });
  },
}));
