import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export function usePlanningCamionsRangeQuery(days) {
  return useQuery({
    queryKey: ['planning_camions_range', days.join(',')],
    queryFn: async () => {
      let allRows = [];
      for (const day of days) {
        const { data, error } = await supabase.from('planning_camions').select('*').eq('date_jour', day).order('slot_index');
        if (error && error.code !== 'PGRST116') { console.error('Error loading day:', day, error); continue; }
        allRows = allRows.concat(data || []);
      }
      return allRows;
    },
    enabled: days.length > 0,
  });
}
