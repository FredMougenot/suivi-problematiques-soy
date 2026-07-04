import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

// ── Catégories ──────────────────────────────────────────────────
export function useGhCategoriesQuery() {
  return useQuery({
    queryKey: ['gh_categories_full'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gh_categories').select('*').order('created_at');
      if (error) throw error;
      return (data || []).map((c) => ({ ...c, rules: c.cat_rules || [] }));
    },
  });
}

export function useSaveCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat) => {
      const { error } = await supabase.from('gh_categories').upsert({
        id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, cat_rules: cat.rules,
        parent_id: cat.parent_id || null, updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gh_categories_full'] }),
  });
}

export function useDeleteCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { const { error } = await supabase.from('gh_categories').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gh_categories_full'] }),
  });
}

// ── Poids ───────────────────────────────────────────────────────
export function useGhPoidsQuery() {
  return useQuery({
    queryKey: ['gh_poids_full'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gh_poids').select('*').order('code');
      if (error) throw error;
      return (data || []).map((p) => ({ ...p, matchType: p.match_type || 'exact' }));
    },
  });
}

export function useSaveAllPoidsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poidsList) => {
      for (const p of poidsList) {
        const { error } = await supabase.from('gh_poids').upsert({
          id: p.id, code: p.code, description: p.description || '', poids_unitaire: p.poids_unitaire,
          match_type: p.matchType || 'exact', ajout_manuel: p.ajout_manuel || false, updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gh_poids_full'] }),
  });
}

// ── Correspondance TRAX ─────────────────────────────────────────
export function useCorrespondanceQuery() {
  return useQuery({
    queryKey: ['correspondance_trax_full'],
    queryFn: async () => {
      const { data, error } = await supabase.from('correspondance_trax').select('*').order('created_at');
      if (error) throw error;
      return (data || []).map((r) => ({ id: r.id, trax: r.code_trax || '', interne: r.code_interne || '', desig: r.designation || '' }));
    },
  });
}

export function useSaveCorrespondanceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trax, interne, desig }) => {
      if (id) {
        const { error } = await supabase.from('correspondance_trax').update({ code_trax: trax || null, code_interne: interne || null, designation: desig || null }).eq('id', id);
        if (error) throw error;
        return { id, trax, interne, desig };
      }
      const { data, error } = await supabase.from('correspondance_trax').insert({ code_trax: trax || null, code_interne: interne || null, designation: desig || null }).select().single();
      if (error) throw error;
      return { id: data.id, trax, interne, desig };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['correspondance_trax_full'] }),
  });
}

export function useDeleteCorrespondanceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { const { error } = await supabase.from('correspondance_trax').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['correspondance_trax_full'] }),
  });
}
