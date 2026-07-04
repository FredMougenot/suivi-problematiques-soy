import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export function useUsineStockQuery() {
  return useQuery({
    queryKey: ['inventaire_usine_global'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventaire_usine').select('*').order('created_at');
      if (error) throw error;
      const rows = (data || []).map((r) => ({
        source: 'usine', categorie_id: r.categorie_id || '', categorie_nom: r.categorie_nom || '',
        code_produit: r.code_produit || '', description: r.description || '', no_lot: r.no_lot || '',
        no_sous_lot: r.no_sous_lot || '', quantite: parseFloat(r.quantite) || 0, poids_unit: r.poids_unit || 0,
        poids_total: r.poids_total || 0, date_fab: r.date_fab || '', date_peremption: r.date_peremption || '',
        notes: r.notes || '', raw: null,
      }));
      const dateReleve = data && data.length > 0 ? data[0].date_releve : null;
      return { rows, dateReleve };
    },
  });
}
