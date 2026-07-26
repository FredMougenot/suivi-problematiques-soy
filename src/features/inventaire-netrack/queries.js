import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

const TAILLE_PAGE = 1000;

/**
 * Inventaire NetRack alimente par le workflow n8n
 * « GH Logistics - Connexion NetRack ».
 * La colonne `client` de cette table est le COMPTE NetRack (EO / PBC),
 * a ne pas confondre avec le client final, qui vient des regles.
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
 * Referentiel unique. Chaque regle porte :
 *   - la condition 1 (champ / operateur / valeur), qui definit sa portee
 *   - une condition 2 optionnelle, qui arbitre entre les deux jeux de valeurs
 *   - les valeurs principales, et les valeurs `_sinon` appliquees quand
 *     la condition 2 est fausse
 * Rien n'est recopie dans l'inventaire : l'appariement se fait a l'affichage.
 */
export function useReglesCategorieQuery() {
  return useQuery({
    queryKey: ['gh_regles_categorie'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gh_regles_categorie')
        .select('priorite, champ, operateur, valeur, champ2, operateur2, valeur2, connecteur, categorie, sous_categorie, poids_unitaire, client, trax_code, categorie_sinon, sous_categorie_sinon, poids_unitaire_sinon, client_sinon, trax_code_sinon, actif')
        .eq('actif', true);
      if (error) throw error;
      return data || [];
    },
  });
}
