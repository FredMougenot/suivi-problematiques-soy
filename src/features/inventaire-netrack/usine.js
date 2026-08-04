import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

/**
 * Ecriture dans `usine_stock` — le stock interne a l'usine.
 *
 * ══ CE QU'ON N'ECRIT JAMAIS ══════════════════════════════════
 *   emplacement  — DEFAULT 'Usine' en base. Le poser ici permettrait un jour
 *                  d'ecrire une valeur incoherente depuis le navigateur.
 *   saisi_par    — DEFAULT auth.uid(). C'est la session qui fait foi, pas ce
 *                  que le client pretend etre.
 *   saisi_le / maj_le — poses et tenus par la base (declencheur).
 *   client       — une ligne usine n'a PAS de compte chez l'entreposeur ;
 *                  son client final se deduit du referentiel via no_produit.
 *   description  — vient du referentiel a la lecture. La copier ici figerait
 *                  le libelle au jour de la saisie.
 *
 * ══ QUANTITES ═════════════════════════════════════════════════
 *   qte      nombre d'unites entieres ;
 *   partiel  balance d'une unite entamee.
 * Deux colonnes et non un nombre a virgule : un sac ouvert avec 12,5 kg
 * dedans n'est pas « 0,5 sac », et les deux se comptent differemment.
 */

/** Chaine vide → null : un champ `date` ou `numeric` refuse ''. */
const nettoyer = (v) => {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
};

const nombre = (v, libelle) => {
  const s = nettoyer(v);
  if (s === null) return null;
  const n = Number(s);
  if (Number.isNaN(n)) throw new Error(libelle + ' invalide.');
  return n;
};

/** Champs modifiables a la main, et eux seuls. */
function charge(saisie) {
  return {
    no_lot: nettoyer(saisie.no_lot),
    no_sous_lot: nettoyer(saisie.no_sous_lot),
    etiquette: nettoyer(saisie.etiquette),
    no_comm_client: nettoyer(saisie.no_comm_client),
    qte: nombre(saisie.qte, 'Quantité'),
    partiel: nombre(saisie.partiel, 'Partiel'),
    date_lot: nettoyer(saisie.date_lot),
    date_expiration: nettoyer(saisie.date_expiration),
    note: nettoyer(saisie.note),
  };
}

/** La vue prefixe les identifiants : 'us-42' designe usine_stock.id = 42. */
function idReel(idVue) {
  const brut = String(idVue || '');
  if (!brut.startsWith('us-')) throw new Error('Cette ligne ne vient pas de l\'usine.');
  return Number(brut.slice(3));
}

export function useAjouterUsine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (saisie) => {
      const produit = nettoyer(saisie.no_produit);
      if (!produit) throw new Error('Le n° de produit est obligatoire.');

      const { data, error } = await supabase
        .from('usine_stock')
        .insert({ no_produit: produit, ...charge(saisie) })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // L'ecran lit la vue d'union : la ligne n'apparait qu'apres rechargement.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventaire_netrack'] }),
  });
}

/**
 * Modification d'UN champ, tel que le fait l'edition sur place. On n'envoie
 * que ce qui change : ecrire la ligne entiere ecraserait une correction faite
 * en parallele sur un autre champ.
 */
export function useModifierUsine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, champ, valeur }) => {
      const permis = new Set([
        'no_lot', 'no_sous_lot', 'etiquette', 'no_comm_client',
        'qte', 'partiel', 'date_lot', 'date_expiration', 'note',
      ]);
      if (!permis.has(champ)) throw new Error('Champ non modifiable : ' + champ);

      const valeurPropre = (champ === 'qte' || champ === 'partiel')
        ? nombre(valeur, champ === 'qte' ? 'Quantité' : 'Partiel')
        : nettoyer(valeur);

      const { error } = await supabase
        .from('usine_stock')
        .update({ [champ]: valeurPropre })
        .eq('id', idReel(id));

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventaire_netrack'] }),
  });
}

/** Retrait d'une ligne usine saisie par erreur. */
export function useSupprimerUsine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (idVue) => {
      const { error } = await supabase.from('usine_stock').delete().eq('id', idReel(idVue));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventaire_netrack'] }),
  });
}
