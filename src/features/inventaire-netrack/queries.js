import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

const TAILLE_PAGE = 1000;

/**
 * Inventaire NetRack alimente par le workflow n8n
 * « GH Logistics - Connexion NetRack ».
 * La colonne `client` de cette table est le COMPTE NetRack (EO / PBC),
 * a ne pas confondre avec le client final, qui vient du referentiel.
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
 * base_reference_produits : reference unique des produits, commune a
 * l'inventaire externe (NetRack) et au futur inventaire interne usine.
 *
 * C'est desormais ELLE qui porte categorie, sous_categorie, client,
 * poids_unitaire et trax_code. Les 4 premiers sont recalcules en base par
 * gh_recalculer_reference_produits() a partir des regles ; trax_code est
 * une saisie manuelle que rien d'automatique ne touche.
 *
 * La page ne resout donc plus les regles a l'affichage : elle joint.
 */
export function useReferenceProduitsQuery() {
  return useQuery({
    queryKey: ['base_reference_produits'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let toutes = [];
      let debut = 0;
      for (;;) {
        const { data, error } = await supabase
          .from('base_reference_produits')
          .select('code, nom, trax_code, categorie, sous_categorie, client, poids_unitaire')
          .order('code')
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
 * gh_regles_categorie : les regles restent la SOURCE DE VERITE des
 * attributs calcules. La page ne les lit plus pour afficher l'inventaire,
 * seulement pour l'editeur de regles et son apercu avant enregistrement.
 *
 * trax_code n'est plus lu ici : il appartient au referentiel produits.
 */
export function useReglesCategorieQuery() {
  return useQuery({
    queryKey: ['gh_regles_categorie'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gh_regles_categorie')
        .select('id, priorite, champ, operateur, valeur, categorie, sous_categorie, poids_unitaire, client, champ2, operateur2, valeur2, colonne_sortie, valeur_si_vrai, valeur_si_faux, actif')
        .eq('actif', true);
      if (error) throw error;
      return data || [];
    },
  });
}
