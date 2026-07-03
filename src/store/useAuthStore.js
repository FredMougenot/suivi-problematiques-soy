import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { fetchUserRole } from '../lib/roles';

export const useAuthStore = create((set) => ({
  user: null,
  role: null,           // 'admin' | 'viewer' | null
  isAuthenticated: false,
  isLoading: true,       // true tant qu'on n'a pas vérifié la session au chargement

  /**
   * Vérifie s'il y a une session active (appelé une fois au démarrage de l'app).
   */
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const role = await fetchUserRole(session.user.email);
      set({ user: session.user, role, isAuthenticated: true, isLoading: false });
    } else {
      set({ user: null, role: null, isAuthenticated: false, isLoading: false });
    }

    // Réagit aux changements de session (login/logout dans un autre onglet, expiration, etc.)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user.email);
        set({ user: session.user, role, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, role: null, isAuthenticated: false, isLoading: false });
      }
    });
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const role = await fetchUserRole(data.user.email);
    set({ user: data.user, role, isAuthenticated: true, isLoading: false });
    return data.user;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null, isAuthenticated: false });
  },
}));
