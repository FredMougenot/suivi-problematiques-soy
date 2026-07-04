import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export function useGhCategoriesFullQuery() {
  return useQuery({
    queryKey: ['gh_categories_full'],
    queryFn: async () => {
      const { data } = await supabase.from('gh_categories').select('*').order('created_at');
      return (data || []).map((c) => ({ ...c, rules: c.cat_rules || c.rules || [] }));
    },
  });
}

export function useGhPoidsListQuery() {
  return useQuery({
    queryKey: ['gh_poids_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gh_poids').select('*');
      if (error) throw error;
      return (data || []).map((p) => ({ ...p, matchType: p.match_type || 'exact' }));
    },
  });
}

/** Données TRAX complètes (pour autocomplete) : [{trax, interne, desig}]. */
export function useTraxDataQuery() {
  return useQuery({
    queryKey: ['trax_data_full'],
    queryFn: async () => {
      const { data } = await supabase.from('correspondance_trax').select('code_trax,code_interne,designation');
      return (data || []).map((r) => ({ trax: r.code_trax || '', interne: r.code_interne || '', desig: r.designation || '' }));
    },
  });
}

/** Map code_interne (normalisé) → code_trax, pour affichage rapide. */
export function useTraxMapQuery() {
  return useQuery({
    queryKey: ['trax_map'],
    queryFn: async () => {
      const { data } = await supabase.from('correspondance_trax').select('code_trax,code_interne');
      const map = new Map();
      (data || []).forEach((r) => { if (r.code_interne && r.code_trax) map.set(r.code_interne.trim().toUpperCase(), r.code_trax.trim()); });
      return map;
    },
  });
}

export function getPoidsUnitaire(poidsList, code) {
  if (!code) return 0;
  const cu = String(code).trim().toUpperCase();
  const exact = poidsList.find((p) => (p.matchType || 'exact') === 'exact' && String(p.code || '').trim().toUpperCase() === cu);
  if (exact) return parseFloat(exact.poids_unitaire || 0);
  const cont = poidsList.find((p) => (p.matchType || 'exact') === 'contains' && p.code && cu.includes(String(p.code).trim().toUpperCase()));
  if (cont) return parseFloat(cont.poids_unitaire || 0);
  return 0;
}
