import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

const TAILLE_PAGE = 1000;

/**
 * Inventaire NetRack alimente par le workflow n8n
 * « GH Logistics - Connexion NetRack ».
 * La table contient les deux clients (EO et PBC), distingues
 * par la colonne `client`. Lecture par tranches de 1000 lignes
 * car PostgREST plafonne chaque reponse.
 */
export function useInventaireNetrackQuery() {
  return useQuery({
    queryKey: ['inventaire_netrack'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let toutes = [];
      let debut = 0;
      for (;;) {
        const { data, error } = await supabase
          .from('n8n_gh_inventaire')
          .select('*')
          .order('no_produit')
          .range(debut, debut + TAILLE_PAGE - 1);
        if (error) throw error;
        toutes = toutes.concat(data || []);
        if (!data || data.length < TAILLE_PAGE) break;
        debut += TAILLE_PAGE;
      }
      return toutes;
    },
  });
}
