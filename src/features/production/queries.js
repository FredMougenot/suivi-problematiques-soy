import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

function localToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getCurrentTimestampToronto() {
  const now = new Date();
  const torontoTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
  const yyyy = torontoTime.getFullYear();
  const mm = String(torontoTime.getMonth() + 1).padStart(2, '0');
  const dd = String(torontoTime.getDate()).padStart(2, '0');
  const hh = String(torontoTime.getHours()).padStart(2, '0');
  const mn = String(torontoTime.getMinutes()).padStart(2, '0');
  const ss = String(torontoTime.getSeconds()).padStart(2, '0');
  const ms = String(torontoTime.getMilliseconds()).padStart(3, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mn}:${ss}.${ms}`;
}

export { localToday };

export function useIntentionsQuery() {
  const today = localToday();
  return useQuery({
    queryKey: ['intentions_production', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intentions_production')
        .select('*')
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveIntentionsMutation() {
  const qc = useQueryClient();
  const today = localToday();

  return useMutation({
    mutationFn: async ({ l1Actif, l2Actif }) => {
      const payload = {
        date: today,
        l1_actif: l1Actif,
        l2_actif: l2Actif,
        updated_at: getCurrentTimestampToronto(),
      };
      const { error } = await supabase.from('intentions_production').upsert(payload, { onConflict: 'date' });
      if (error) throw error;
      return payload;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intentions_production', today] });
    },
  });
}
