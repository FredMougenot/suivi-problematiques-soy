import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

const CHAMPS_ECRITS = [
  'priorite', 'champ', 'operateur', 'valeur',
  'champ2', 'operateur2', 'valeur2',
  'colonne_sortie', 'valeur_si_vrai', 'valeur_si_faux',
  'categorie', 'sous_categorie', 'poids_unitaire', 'client', 'trax_code',
  'actif', 'notes',
];

/**
 * Ne conserve que les colonnes de la table et convertit les champs vides
 * en null. Un trigger fait la meme normalisation cote base : cette passe
 * evite simplement d'envoyer du bruit sur le reseau.
 */
function nettoyer(regle) {
  const sortie = {};
  for (const cle of CHAMPS_ECRITS) {
    let v = regle[cle];
    if (typeof v === 'string') v = v.trim() === '' ? null : v.trim();
    if (cle === 'poids_unitaire') {
      v = v === null || v === undefined || v === '' ? null : Number(v);
      if (Number.isNaN(v)) v = null;
    }
    if (cle === 'priorite') v = Number(v) || 1;
    if (cle === 'actif') v = v !== false;
    sortie[cle] = v ?? null;
  }
  return sortie;
}

/** Invalide l'inventaire enrichi en meme temps que les regles. */
function useInvalidation() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['gh_regles_categorie'] });
}

export function useCreerRegle() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: async (regle) => {
      const { data, error } = await supabase
        .from('gh_regles_categorie')
        .insert(nettoyer(regle))
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalider,
  });
}

export function useModifierRegle() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: async ({ id, ...regle }) => {
      const { data, error } = await supabase
        .from('gh_regles_categorie')
        .update(nettoyer(regle))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalider,
  });
}

export function useSupprimerRegle() {
  const invalider = useInvalidation();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('gh_regles_categorie')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalider,
  });
}
