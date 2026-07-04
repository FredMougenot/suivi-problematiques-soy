import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export function useEnvRowsQuery(dateJour) {
  return useQuery({
    queryKey: ['environnement_verif', dateJour],
    queryFn: async () => {
      const { data, error } = await supabase.from('environnement_verif').select('*').eq('date_jour', dateJour).order('updated_at', { ascending: false });
      if (error && error.code !== 'PGRST116') throw error;
      const rows = {};
      (data || []).forEach((r) => { if (!rows[r.verif_key]) rows[r.verif_key] = r; });
      return rows;
    },
  });
}

export function useEnvHistoryQuery() {
  return useQuery({
    queryKey: ['environnement_verif_history'],
    queryFn: async () => {
      const now = new Date();
      const firstDay = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
      const { data, error } = await supabase.from('environnement_verif').select('date_jour,non_conforme').gte('date_jour', firstDay).order('date_jour');
      if (error) throw error;
      const byDay = {};
      (data || []).forEach((r) => {
        if (!byDay[r.date_jour]) byDay[r.date_jour] = 0;
        if (r.non_conforme) byDay[r.date_jour]++;
      });
      return byDay;
    },
  });
}

export function useSaveVerifMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.from('environnement_verif').upsert(payload, { onConflict: 'verif_key,date_jour' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['environnement_verif', variables.date_jour] });
      qc.invalidateQueries({ queryKey: ['environnement_verif_history'] });
    },
  });
}

export function useDeleteVerifMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dateJour }) => {
      if (id) { const { error } = await supabase.from('environnement_verif').delete().eq('id', id); if (error) throw error; }
      return dateJour;
    },
    onSuccess: (dateJour) => qc.invalidateQueries({ queryKey: ['environnement_verif', dateJour] }),
  });
}

export function useCreateProblemesBulkMutation() {
  return useMutation({
    mutationFn: async (payloadArray) => {
      const { error } = await supabase.from('problematiques').insert(payloadArray);
      if (error) throw error;
    },
  });
}

export function usePilierCritereTitreQuery() {
  return useQuery({
    queryKey: ['env_pilier_titre'],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('piliers_criteres_lignes').select('intitule').eq('pilier', 'Environnement').eq('row_index', 0).single();
        return data?.intitule || '';
      } catch { return ''; }
    },
  });
}
