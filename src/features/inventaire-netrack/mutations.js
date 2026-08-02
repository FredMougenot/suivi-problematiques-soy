import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

/**
 * Colonnes ecrites par l'editeur de regles.
 *
 * `categorie_id` designe un noeud de base_reference_categories ; les colonnes
 * texte `categorie` et `sous_categorie` en sont derivees par le trigger
 * gh_regles_appliquer_categorie et ne sont donc PAS envoyees.
 * `trax_code` a quitte les regles : il appartient au referentiel produits.
 */
const CHAMPS_ECRITS = [
  'priorite', 'champ', 'operateur', 'valeur',
  'champ2', 'operateur2', 'valeur2',
  'colonne_sortie', 'valeur_si_vrai', 'valeur_si_faux',
  'categorie_id', 'poids_unitaire', 'client',
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
    if (cle === 'categorie_id') {
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

// ───── Nomenclature des categories ─────

/**
 * Renommer un noeud change le libelle partout : les regles qui le pointent
 * verront leurs colonnes texte reecrites au prochain enregistrement, mais pas
 * avant. On force donc un recalcul apres toute ecriture sur la nomenclature,
 * sinon base_reference_produits garderait l'ancien libelle jusqu'au lendemain.
 */
function useInvalidationCategories() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['base_reference_categories'] });
    qc.invalidateQueries({ queryKey: ['gh_regles_categorie'] });
    qc.invalidateQueries({ queryKey: ['base_reference_produits'] });
  };
}

function nettoyerCategorie(c) {
  const ordre = c.ordre === '' || c.ordre === null || c.ordre === undefined
    ? null
    : Number(c.ordre);
  return {
    parent_id: c.parent_id === '' || c.parent_id === null || c.parent_id === undefined
      ? null
      : Number(c.parent_id),
    libelle: String(c.libelle ?? '').trim(),
    ordre: Number.isFinite(ordre) ? ordre : null,
    actif: c.actif !== false,
    notes: typeof c.notes === 'string' && c.notes.trim() !== '' ? c.notes.trim() : null,
  };
}

export function useCreerCategorie() {
  const invalider = useInvalidationCategories();
  return useMutation({
    mutationFn: async (categorie) => {
      const { data, error } = await supabase
        .from('base_reference_categories')
        .insert(nettoyerCategorie(categorie))
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalider,
  });
}

export function useModifierCategorie() {
  const invalider = useInvalidationCategories();
  return useMutation({
    mutationFn: async ({ id, ...categorie }) => {
      const { data, error } = await supabase
        .from('base_reference_categories')
        .update(nettoyerCategorie(categorie))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await supabase.rpc('gh_appliquer_libelles_categories');
      await recalculerReferentiel();
      return data;
    },
    onSuccess: invalider,
  });
}

/**
 * La suppression est volontairement stricte cote base : ON DELETE RESTRICT
 * sur le parent et sur categorie_id. Une categorie encore utilisee par une
 * regle, ou qui porte des sous-categories, ne peut pas disparaitre — l'erreur
 * remonte telle quelle a l'utilisateur, qui saura quoi corriger.
 */
export function useSupprimerCategorie() {
  const invalider = useInvalidationCategories();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('base_reference_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalider,
  });
}
