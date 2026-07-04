import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export function useResponsablesFullQuery() {
  return useQuery({
    queryKey: ['prob_responsables_full'],
    queryFn: async () => {
      const { data, error } = await supabase.from('prob_responsables').select('*').order('nom');
      if (error) return [];
      return (data || []).map((r) => ({ id: r.id, nom: r.nom || '' }));
    },
  });
}

export function useSaveResponsableMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nom }) => {
      if (id) {
        const { error } = await supabase.from('prob_responsables').update({ nom }).eq('id', id);
        if (error) throw error;
        return { id, nom };
      }
      const { data, error } = await supabase.from('prob_responsables').insert([{ nom }]).select().single();
      if (error) throw error;
      return { id: data.id, nom };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prob_responsables_full'] }),
  });
}

export function useDeleteResponsableMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      if (id > 0) { const { error } = await supabase.from('prob_responsables').delete().eq('id', id); if (error) throw error; }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prob_responsables_full'] }),
  });
}

export function useDeleteAllProblematiquesMutation() {
  return useMutation({
    mutationFn: async () => {
      const { data: all } = await supabase.from('problematiques').select('id');
      const n = (all || []).length;
      if (!n) return 0;
      const ids = all.map((p) => p.id);
      const { error } = await supabase.from('problematiques').delete().in('id', ids);
      if (error) throw error;
      return n;
    },
  });
}
