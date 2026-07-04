import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export function useProblemesQuery() {
  return useQuery({
    queryKey: ['problematiques'],
    queryFn: async () => {
      const { data, error } = await supabase.from('problematiques').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useResponsablesQuery() {
  return useQuery({
    queryKey: ['prob_responsables'],
    queryFn: async () => {
      const { data } = await supabase.from('prob_responsables').select('*').order('nom');
      return (data || []).map((r) => r.nom);
    },
  });
}

export function useCriteresSeuilsQuery() {
  return useQuery({
    queryKey: ['piliers_criteres_seuils'],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('piliers_criteres_lignes').select('pilier,seuil_vert,seuil_orange,seuil_rouge').eq('row_index', 0);
        const map = {};
        (data || []).forEach((r) => { map[r.pilier] = { v: r.seuil_vert, o: r.seuil_orange, r: r.seuil_rouge }; });
        return map;
      } catch { return {}; }
    },
  });
}

export function useCritereTexteQuery(pilier) {
  return useQuery({
    queryKey: ['piliers_critere_texte', pilier],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('piliers_criteres').select('critere').eq('pilier', pilier).single();
        if (error || !data) return '';
        return data.critere || '';
      } catch { return ''; }
    },
    enabled: !!pilier,
  });
}

export function useCreateProblemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { error } = await supabase.from('problematiques').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['problematiques'] }),
  });
}

export function useUpdateProblemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { error } = await supabase.from('problematiques').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['problematiques'] }),
  });
}

export function useCloturerProblemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('problematiques').update({ statut: 'Clôturé', updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['problematiques'] }),
  });
}
