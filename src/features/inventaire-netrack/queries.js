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

/**
 * Referentiel unique : chaque regle porte a la fois la categorie,
 * la sous-categorie et le poids unitaire. La regle qui matche donne
 * donc les trois d'un coup. Rien n'est recopie dans l'inventaire,
 * l'appariement se fait a l'affichage.
 */
export function useReglesCategorieQuery() {
  return useQuery({
    queryKey: ['gh_regles_categorie'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gh_regles_categorie')
        .select('priorite, champ, operateur, valeur, categorie, sous_categorie, poids_unitaire, actif')
        .eq('actif', true);
      if (error) throw error;
      return data || [];
    },
  });
}
