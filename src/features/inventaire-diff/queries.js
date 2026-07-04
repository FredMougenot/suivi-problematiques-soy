import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { loadGhRowsFromStorage, groupRows, getCategoryForRow } from './logic';

export function useSnapshotsQuery() {
  return useQuery({
    queryKey: ['inventaire_snapshots'],
    queryFn: async () => {
      const [{ data: precData }, { data: actData }] = await Promise.all([
        supabase.from('snapshot_precedent').select('*'),
        supabase.from('snapshot_actuel').select('*'),
      ]);
      return { precData: precData || [], actData: actData || [] };
    },
  });
}

export function useSaveSnapshotMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (categories) => {
      // Charger GH (localStorage) + Usine (Supabase) au moment de la sauvegarde
      const ghRows = loadGhRowsFromStorage();
      const { data: usineData } = await supabase.from('inventaire_usine').select('*').order('created_at');
      const usineRows = (usineData || []).map((r) => ({
        source: 'usine', code_produit: r.code_produit || '', description: r.description || '', no_lot: r.no_lot || '',
        quantite: parseFloat(r.quantite) || 0, poids_total: parseFloat(r.poids_total) || 0,
        date_fab: r.date_fab || '', date_peremption: r.date_peremption || '',
        categorie_id: r.categorie_id || '', categorie_nom: r.categorie_nom || '',
        raw: null, _raw: null, _original: null,
      }));

      const allRows = groupRows([...ghRows, ...usineRows]);
      allRows.forEach((r) => { r._cat = getCategoryForRow(r, categories); });

      const now = new Date().toISOString();
      const payload = allRows.map((r) => ({
        source: r.source, categorie_id: r._cat?.id || null, categorie_nom: r._cat?.name || null,
        code_produit: r.code_produit, description: r.description || null, no_lot: r.no_lot,
        quantite: r.quantite || null, poids_total: r.poids_total || null,
        date_fab: r.date_fab || null, date_peremption: r.date_peremption || null, saved_at: now,
      }));

      // 1. Copier actuel → précédent
      const { data: actData } = await supabase.from('snapshot_actuel').select('*');
      if (actData && actData.length > 0) {
        await supabase.from('snapshot_precedent').delete().not('id', 'is', null);
        const precPayload = actData.map(({ id, ...rest }) => rest);
        await supabase.from('snapshot_precedent').insert(precPayload);
      }

      // 2. Remplacer actuel
      await supabase.from('snapshot_actuel').delete().not('id', 'is', null);
      await supabase.from('snapshot_actuel').insert(payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventaire_snapshots'] }),
  });
}
