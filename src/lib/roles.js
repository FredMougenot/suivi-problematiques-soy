import { supabase } from './supabaseClient';

/**
 * Détermine le rôle d'un utilisateur à partir de son email :
 * - 'admin' si présent dans public.admins
 * - 'viewer' si présent dans public.viewers
 * - null si présent dans aucune des deux (ne devrait pas arriver si le
 *   compte a été créé correctement, mais on le gère quand même)
 *
 * Tout compte authentifié a accès au site ; le rôle contrôle uniquement
 * quelles pages sont visibles (voir ProtectedRoute / AppShell).
 */
export async function fetchUserRole(email) {
  if (!email) return null;

  const { data: adminRow, error: adminError } = await supabase
    .from('admins')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (adminError) {
    console.error('[fetchUserRole] erreur table admins:', adminError);
  } else if (adminRow) {
    return 'admin';
  }

  const { data: viewerRow, error: viewerError } = await supabase
    .from('viewers')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (viewerError) {
    console.error('[fetchUserRole] erreur table viewers:', viewerError);
  } else if (viewerRow) {
    return 'viewer';
  }

  return null;
}
