import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

/**
 * Ecriture dans `usine_stock` — le stock interne a l'usine.
 *
 * ══ CE QU'ON N'ECRIT PAS ═════════════════════════════════════
 *   emplacement  — DEFAULT 'Usine' en base. Le poser ici permettrait un jour
 *                  d'ecrire une valeur incoherente depuis le navigateur.
 *   saisi_par    — DEFAULT auth.uid(). C'est la session qui fait foi, pas ce
 *                  que le client pretend etre.
 *   saisi_le / maj_le — poses et tenus par la base.
 *   client       — une ligne usine n'a PAS de compte chez l'entreposeur ;
 *                  son client final se deduit du referentiel via no_produit.
 *
 * La description non plus : elle vient de base_reference_produits. La copier
 * ici la figerait au moment de la saisie.
 */

export function useAjouterUsine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (saisie) => {
      const nettoyer = (v) => {
        const s = (v ?? '').toString().trim();
        return s === '' ? null : s;
      };

      const produit = nettoyer(saisie.no_produit);
      if (!produit) throw new Error('Le n° de produit est obligatoire.');

      const qte = saisie.qte === '' || saisie.qte === null || saisie.qte === undefined
        ? null : Number(saisie.qte);
      if (qte !== null && Number.isNaN(qte)) throw new Error('Quantité invalide.');

      const { data, error } = await supabase
        .from('usine_stock')
        .insert({
          no_produit: produit,
          no_lot: nettoyer(saisie.no_lot),
          no_sous_lot: nettoyer(saisie.no_sous_lot),
          etiquette: nettoyer(saisie.etiquette),
          no_comm_client: nettoyer(saisie.no_comm_client),
          qte,
          // Champs `date` en base : une chaine vide serait refusee.
          date_lot: nettoyer(saisie.date_lot),
          date_expiration: nettoyer(saisie.date_expiration),
          note: nettoyer(saisie.note),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // L'ecran lit la vue d'union : la nouvelle ligne n'apparait qu'apres
    // rechargement de cette requete-la.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventaire_netrack'] }),
  });
}

/** Retrait d'une ligne usine saisie par erreur. */
export function useSupprimerUsine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (idVue) => {
      // La vue prefixe les identifiants : 'us-42' designe usine_stock.id = 42.
      const brut = String(idVue || '');
      if (!brut.startsWith('us-')) throw new Error('Cette ligne ne vient pas de l\'usine.');
      const id = Number(brut.slice(3));

      const { error } = await supabase.from('usine_stock').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventaire_netrack'] }),
  });
}
