import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

/** Paramètres stats_parametres (seuils) + valeurs réelles statut_ligne depuis planning_params. */
export function useStatsParamsQuery() {
  return useQuery({
    queryKey: ['stats_parametres'],
    queryFn: async () => {
      let seuil1 = 30, seuil2 = 60, objectif = 80;
      try {
        const { data } = await supabase.from('stats_parametres').select('*').eq('id', 1).maybeSingle();
        if (data) {
          seuil1 = data.seuil1 ?? 30;
          seuil2 = data.seuil2 ?? 60;
          objectif = data.objectif ?? 80;
        }
      } catch (e) { /* table optionnelle */ }

      let slActif = 'ACTIF', slInactif = 'INACTIF', slNonLivre = null;
      try {
        const { data: slData } = await supabase.from('planning_params').select('valeur,ordre').eq('categorie', 'statut_ligne').order('ordre');
        if (slData && slData.length >= 1) {
          slActif = slData[0]?.valeur || 'ACTIF';
          slInactif = slData[1]?.valeur || 'INACTIF';
          slNonLivre = slData[2]?.valeur || null;
        }
      } catch (e) { /* fallback */ }

      return { seuil1, seuil2, objectif, slActif, slInactif, slNonLivre };
    },
  });
}

export function useSaveStatsParamsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seuil1, seuil2, objectif }) => {
      const { error } = await supabase.from('stats_parametres').upsert(
        { id: 1, seuil1, seuil2, objectif, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stats_parametres'] }),
  });
}

export function useCamionsRangeQuery(start, end) {
  return useQuery({
    queryKey: ['planning_camions_range', start, end],
    queryFn: async () => {
      const { data, error } = await supabase.from('planning_camions').select('*').gte('date_jour', start).lte('date_jour', end);
      if (error) throw error;
      return data || [];
    },
  });
}
