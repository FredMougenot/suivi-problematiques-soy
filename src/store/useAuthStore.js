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

// Empêche deux appels concurrents (ex: init() + onAuthStateChange déclenché par
// signInWithPassword) de traiter le même événement SIGNED_IN en double.
let traitementEnCours = null;

async function traiterSession(session, set, get) {
  if (!session?.user) {
    set({ user: null, role: null, isAuthenticated: false, isLoading: false, sessionToken: null });
    return;
  }

  // Si on suit déjà cet utilisateur avec un token actif, un événement
  // onAuthStateChange supplémentaire (refresh de token, etc.) ne doit rien
  // ré-enregistrer : ça écraserait inutilement la session active.
  if (get().user?.id === session.user.id && get().sessionToken) {
    set({ user: session.user, isAuthenticated: true, isLoading: false });
    return;
  }

  // Déduplique les appels concurrents pour le même utilisateur (évite la
  // double écriture qui causait le blocage intermittent sur l'écran login).
  if (traitementEnCours?.userId === session.user.id) {
    await traitementEnCours.promise;
    return;
  }

  const promise = (async () => {
    const role = await fetchUserRole(session.user.email);
    const sessionToken = await enregistrerSessionActive(session.user.id);
    set({ user: session.user, role, isAuthenticated: true, isLoading: false, sessionToken });
  })();

  traitementEnCours = { userId: session.user.id, promise };
  try {
    await promise;
  } finally {
    traitementEnCours = null;
  }
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
    await traiterSession(session, set, get);

    // Source unique de vérité pour toute transition d'état d'auth : login,
    // logout, refresh de token, connexion dans un autre onglet, etc.
    supabase.auth.onAuthStateChange((_event, session) => {
      traiterSession(session, set, get);
    });
  },

  /**
   * Ne fait que déclencher l'authentification côté Supabase. C'est
   * onAuthStateChange (via traiterSession) qui met à jour le store — une
   * seule source de vérité, pour éviter toute course avec l'événement
   * SIGNED_IN déclenché automatiquement par signInWithPassword.
   */
  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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
