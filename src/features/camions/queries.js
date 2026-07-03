import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function useParamsQuery() {
  return useQuery({
    queryKey: ['planning_params'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_params')
        .select('categorie,valeur,text_color,border_color,border_opacity,font_weight,has_background,ordre,delai_nl')
        .order('ordre')
        .order('created_at');
      if (error) throw error;
      const grouped = {};
      (data || []).forEach((r) => {
        if (!grouped[r.categorie]) grouped[r.categorie] = [];
        grouped[r.categorie].push(r);
      });
      return grouped;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCamionsQuery(dateStr) {
  return useQuery({
    queryKey: ['planning_camions', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_camions')
        .select('*')
        .eq('date_jour', dateStr)
        .order('slot_index');
      if (error && error.code !== 'PGRST116') throw error;
      const rows = {};
      (data || []).forEach((r) => { rows[r.slot_index] = r; });
      return rows;
    },
  });
}

export function useSaveRowMutation(dateStr) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ idx, payload }) => {
      const full = { date_jour: dateStr, slot_index: idx, updated_at: new Date().toISOString(), ...payload };
      if (payload.id) {
        const { error } = await supabase.from('planning_camions').update(full).eq('id', payload.id);
        if (error) throw error;
        return full;
      } else {
        const { data, error } = await supabase.from('planning_camions').insert([full]).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planning_camions', dateStr] }),
  });
}

export function useDeleteRowMutation(dateStr) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      if (id) {
        const { error } = await supabase.from('planning_camions').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planning_camions', dateStr] }),
  });
}
