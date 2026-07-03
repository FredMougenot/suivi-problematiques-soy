import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { calcRow, localToday } from './logic';

export function useParamItemsQuery() {
  return useQuery({
    queryKey: ['parametres_inventaire'],
    queryFn: async () => {
      const { data, error } = await supabase.from('parametres_inventaire').select('*').order('item_number');
      if (error) throw error;
      // Dédupliquer par item_number — garder le plus récent
      const seen = new Map();
      (data || []).forEach((p) => {
        if (!seen.has(p.item_number) || p.created_at > seen.get(p.item_number).created_at) seen.set(p.item_number, p);
      });
      return Array.from(seen.values())
        .sort((a, b) => a.item_number - b.item_number)
        .map((p) => ({
          id: p.id, item_number: p.item_number,
          item: p.nom || 'Item #' + p.item_number,
          recurrence: p.recurrence || 30,
          derniere_verification: p.derniere_verification || null,
        }));
    },
  });
}

export function useStockQuery(dateStr) {
  return useQuery({
    queryKey: ['inventaire_cyclique', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventaire_cyclique').select('*').eq('date_jour', dateStr).order('item_index');
      if (error && error.code !== 'PGRST116') throw error;
      const rows = {};
      (data || []).forEach((r) => { rows[r.item_index] = r; });
      return rows;
    },
  });
}

export function useHistoryQuery() {
  return useQuery({
    queryKey: ['inventaire_cyclique_history'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventaire_cyclique').select('*').order('date_jour', { ascending: false }).order('label');
      if (error) throw error;
      return (data || []).filter((r) => r.label);
    },
  });
}

export function useMarquerVerifieMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paramId) => {
      const today = localToday();
      const { error } = await supabase.from('parametres_inventaire').update({ derniere_verification: today }).eq('id', paramId);
      if (error) throw error;
      return today;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parametres_inventaire'] }),
  });
}

export function useSaveAllStockMutation(dateStr) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ stockRows, indices, paramItems }) => {
      let errors = 0;
      const nomsSauvegardes = new Set();
      for (const idx of indices) {
        const r = stockRows[idx] || {};
        const hasData = r.qte_e1 || r.balance1 || r.qte_e2 || r.balance2 || r.erp || r.poids_unitaire;
        if (!r.id && !hasData) continue;
        const { total, ecart } = calcRow(r);
        const payload = {
          date_jour: dateStr, item_index: idx, label: r.label || '',
          poids_unitaire: parseFloat(r.poids_unitaire) || null,
          qte_e1: parseFloat(r.qte_e1) || null, balance1: parseFloat(r.balance1) || null,
          qte_e2: parseFloat(r.qte_e2) || null, balance2: parseFloat(r.balance2) || null,
          erp: parseFloat(r.erp) || null,
          total_calcule: isNaN(total) ? null : total, ecart_calcule: isNaN(ecart) ? null : ecart,
          updated_at: new Date().toISOString(),
        };
        try {
          const { error } = await supabase.from('inventaire_cyclique').upsert(payload, { onConflict: 'date_jour,item_index' });
          if (error) errors++;
          else if (r.label) nomsSauvegardes.add(r.label);
        } catch (e) { errors++; }
      }
      // Mettre à jour derniere_verification pour chaque item sauvegardé
      const today = localToday();
      for (const p of paramItems) {
        if (nomsSauvegardes.has(p.item)) {
          try { await supabase.from('parametres_inventaire').update({ derniere_verification: today }).eq('id', p.id); } catch (e) { /* ignore */ }
        }
      }
      return { errors };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventaire_cyclique', dateStr] });
      qc.invalidateQueries({ queryKey: ['parametres_inventaire'] });
      qc.invalidateQueries({ queryKey: ['inventaire_cyclique_history'] });
    },
  });
}

export function useDeleteStockRowMutation(dateStr) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (idx) => {
      await supabase.from('inventaire_cyclique').delete().eq('date_jour', dateStr).eq('item_index', idx);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventaire_cyclique', dateStr] }),
  });
}

export function useSubmitNcMutation() {
  return useMutation({
    mutationFn: async (dateStr) => {
      const { error } = await supabase.from('problematiques').insert([{
        intitule: 'Non conformité inventaire cyclique', pilier: 'Qualite', priorite: 'Haute',
        statut: 'À traiter', description: 'Inventaire cyclique non complété — Date: ' + dateStr,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }]);
      if (error) throw error;
    },
  });
}
