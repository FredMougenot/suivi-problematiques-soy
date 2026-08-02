import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

const CHAMPS_ECRITS = [
  'priorite', 'champ', 'operateur', 'valeur',
  'champ2', 'operateur2', 'valeur2',
  'colonne_sortie', 'valeur_si_vrai', 'valeur_si_faux',
  'categorie', 'sous_categorie', 'poids_unitaire', 'client',
  'actif', 'notes',
];

/**
 * Ne conserve que les colonnes de la table et convertit les champs vides
 * en null. Un trigger fait la meme normalisation cote base : cette passe
 * evite simplement d'envoyer du bruit sur le reseau.
 *
 * `trax_code` ne figure plus ici : il appartient au referentiel produits
 * et se saisit produit par produit, pas via une regle.
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
    if (cle === 'priorite') {
      const n = Number(v);
      v = Number.isFinite(n) ? n : 1;   // 0 est une priorite valide
    }
    if (cle === 'actif') v = v !== false;
    sortie[cle] = v ?? null;
  }
  return sortie;
}

/**
 * Les attributs sont resolus A L'ECRITURE : modifier une regle ne change
 * rien tant que base_reference_produits n'a pas ete recalculee. On appelle
 * donc la RPC apres chaque ecriture, avant d'invalider les caches.
 *
 * Si le recalcul echoue, l'ecriture de la regle reste valide : on remonte
 * l'erreur sans la masquer, mais sans annuler la regle non plus.
 */
async function recalculerReferentiel() {
  const { error } = await supabase.rpc('gh_recalculer_reference_produits');
  if (error) throw error;
}

function useInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['gh_regles_categorie'] });
    qc.invalidateQueries({ queryKey: ['base_reference_produits'] });
  };
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
      await recalculerReferentiel();
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
      await recalculerReferentiel();
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
      await recalculerReferentiel();
      return id;
    },
    onSuccess: invalider,
  });
}

/**
 * Saisie manuelle du TRAXcode d'un produit.
 * Seule ecriture directe autorisee dans base_reference_produits : toutes
 * les autres colonnes viennent des regles et seraient ecrasees au prochain
 * recalcul. Une valeur vide remet la colonne a null.
 */
export function useEnregistrerTraxCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, trax_code }) => {
      const valeur = typeof trax_code === 'string' && trax_code.trim() !== ''
        ? trax_code.trim()
        : null;
      const { data, error } = await supabase
        .from('base_reference_produits')
        .update({ trax_code: valeur })
        .eq('code', code)
        .select('code, trax_code')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['base_reference_produits'] }),
  });
}
