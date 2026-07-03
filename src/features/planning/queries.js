import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { callN8nWebhook } from '../../lib/n8nClient';
import { todayStr } from '../../lib/planningDateHelpers';
import { usePlanningStore } from '../../store/usePlanningStore';

export function useProductionQuery(enabled = true) {
  const today = todayStr();
  return useQuery({
    queryKey: ['production', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_temps_reel')
        .select('*')
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled,
  });
}

export function useHistoriqueQuery(enabled = true) {
  const today = todayStr();
  return useQuery({
    queryKey: ['historique', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historique_camions')
        .select('ligne, camion, heure_fin')
        .eq('date', today);
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
}

export function useOverridesQuery(enabled = true) {
  const today = todayStr();
  return useQuery({
    queryKey: ['overrides', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overrides_manuels')
        .select('ligne,camion')
        .eq('date', today)
        .eq('force_pret', true);
      if (error) throw error;
      const next = { L1: [], L2: [] };
      (data || []).forEach((r) => {
        if (!next[r.ligne]) next[r.ligne] = [];
        next[r.ligne].push(r.camion);
      });
      return next;
    },
    enabled,
    initialData: { L1: [], L2: [] },
  });
}

export function useForcerMutation() {
  const qc = useQueryClient();
  const addToast = usePlanningStore((s) => s.addToast);
  const today = todayStr();

  return useMutation({
    mutationFn: async ({ ligne, camion, estForce }) => {
      if (estForce) {
        const { error } = await supabase
          .from('overrides_manuels')
          .delete()
          .eq('date', today)
          .eq('ligne', ligne)
          .eq('camion', camion);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('overrides_manuels')
          .upsert({ date: today, ligne, camion, force_pret: true }, { onConflict: 'date,ligne,camion' });
        if (error) throw error;
      }
      callN8nWebhook('/webhook/forcer-depart', {
        body: { ligne, camion, action: estForce ? 'annuler' : 'forcer' },
      }).catch(() => {});
    },
    onSuccess: (_, { ligne, camion, estForce }) => {
      qc.invalidateQueries({ queryKey: ['overrides'] });
      addToast(
        estForce
          ? `Forçage annulé — ${ligne} Camion ${camion}`
          : `Départ forcé — ${ligne} Camion ${camion} · Recalcul en cours…`,
        estForce ? 'info' : 'success'
      );
      setTimeout(() => qc.invalidateQueries({ queryKey: ['production'] }), 8000);
    },
    onError: (e) => addToast('Erreur lors du forçage : ' + e.message, 'error'),
  });
}
