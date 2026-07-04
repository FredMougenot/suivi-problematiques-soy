import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

const DEFAULT_DATE = '2026-03-10';

function seedRows() {
  return Array.from({ length: 200 }, (_, i) => ({
    id: -(i + 1), item_number: i + 1, nom: 'Item ' + (i + 1), recurrence: 30,
    derniere_verification: DEFAULT_DATE, dirty: true, isNew: true,
  }));
}

export function useParamsInventaireQuery() {
  return useQuery({
    queryKey: ['parametres_inventaire'],
    queryFn: async () => {
      const { data, error } = await supabase.from('parametres_inventaire').select('*').order('item_number');
      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((r) => ({
          id: r.id, item_number: r.item_number, nom: r.nom || 'Item #' + r.item_number,
          recurrence: r.recurrence || 30, derniere_verification: r.derniere_verification || DEFAULT_DATE,
          dirty: !r.derniere_verification, isNew: false,
        }));
      }
      return seedRows();
    },
  });
}

export function useSaveItemMutation() {
  return useMutation({
    mutationFn: async (row) => {
      const payload = { item_number: row.item_number, nom: row.nom, recurrence: row.recurrence };
      if (row.derniere_verification) payload.derniere_verification = row.derniere_verification;
      if (!row.isNew && row.id > 0) {
        const { error } = await supabase.from('parametres_inventaire').update(payload).eq('id', row.id);
        if (error) throw error;
        return { ...row, dirty: false };
      }
      const { data, error } = await supabase.from('parametres_inventaire').insert(payload).select().single();
      if (error) throw error;
      return { ...row, id: data.id, isNew: false, dirty: false };
    },
  });
}

export function useDeleteItemMutation() {
  return useMutation({
    mutationFn: async (row) => {
      if (!row.isNew && row.id > 0) {
        const { error } = await supabase.from('parametres_inventaire').delete().eq('id', row.id);
        if (error) throw error;
      }
    },
  });
}
