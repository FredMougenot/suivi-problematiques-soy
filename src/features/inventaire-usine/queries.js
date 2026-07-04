import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export function useReleveQuery() {
  return useQuery({
    queryKey: ['inventaire_usine'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventaire_usine').select('*').order('created_at');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSaveReleveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dateReleve, rows }) => {
      const { error: delErr } = await supabase.from('inventaire_usine').delete().not('id', 'is', null);
      if (delErr) throw new Error('Suppression échouée : ' + delErr.message);

      if (rows.length > 0) {
        const payload = rows.map((r) => ({
          date_releve: dateReleve,
          categorie_id: r.categorie_id || null,
          categorie_nom: r.categorie_nom || null,
          code_produit: r.code_produit,
          description: r.description || null,
          no_lot: r.no_lot,
          no_sous_lot: r.no_sous_lot || null,
          quantite: r.quantite !== '' ? parseFloat(r.quantite) : null,
          poids_unit: r.poids_unit !== '' ? parseFloat(r.poids_unit) : null,
          balance: r.balance !== '' ? parseFloat(r.balance) : null,
          poids_total: r.poids_total !== '' ? parseFloat(r.poids_total) : null,
          date_fab: r.date_fab || null,
          date_peremption: r.date_peremption || null,
          notes: r.notes || null,
        }));
        const { data, error: insErr } = await supabase.from('inventaire_usine').insert(payload).select();
        if (insErr) throw insErr;
        return data;
      }
      return [];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventaire_usine'] }),
  });
}
