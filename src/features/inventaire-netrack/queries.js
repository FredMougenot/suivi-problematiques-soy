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
 * gh_regles_categorie : table de reference UNIQUE de toutes les regles.
 * Une ligne = une regle :
 *   condition 1 (champ / operateur / valeur) — si fausse, regle ignoree
 *   condition 2 optionnelle — evaluee seulement si la 1 est vraie,
 *     elle arbitre entre valeur_si_vrai et valeur_si_faux
 *   colonne_sortie — l'attribut que la regle renseigne
 * Rien n'est recopie dans l'inventaire : l'appariement se fait a l'affichage.
 */
export function useReglesCategorieQuery() {
  return useQuery({
    queryKey: ['gh_regles_categorie'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gh_regles_categorie')
        .select('id, priorite, champ, operateur, valeur, champ2, operateur2, valeur2, colonne_sortie, valeur_si_vrai, valeur_si_faux, actif')
        .eq('actif', true);
      if (error) throw error;
      return data || [];
    },
  });
}
