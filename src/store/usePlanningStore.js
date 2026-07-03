import { create } from 'zustand';

/**
 * État UI éphémère de la page planning (pas persisté, remis à zéro au reload) :
 * - quais : affectation visuelle des 4 quais (off/temp/frais)
 * - parti : liste des camions marqués "parti" par ligne, pour l'affichage
 * - slotTypes : type visuel (froid/chaud/neutre) appliqué à un slot
 * - toasts : notifications
 */
export const usePlanningStore = create((set, get) => ({
  quais: { 1: 'off', 2: 'off', 3: 'off', 4: 'off' },
  setQuaiSide: (id, side) => set((s) => ({ quais: { ...s.quais, [id]: side } })),
  setQuaiOff: (id) => set((s) => ({ quais: { ...s.quais, [id]: 'off' } })),

  parti: { 1: [], 2: [] },
  seq: 1,
  addParti: (ligne, num, heure) =>
    set((s) => {
      if ((s.parti[ligne] || []).some((x) => String(x.num) === String(num))) return {};
      return {
        parti: { ...s.parti, [ligne]: [...(s.parti[ligne] || []), { num, heure, seq: s.seq }] },
        seq: s.seq + 1,
      };
    }),
  removeParti: (ligne, num) =>
    set((s) => ({
      parti: { ...s.parti, [ligne]: (s.parti[ligne] || []).filter((x) => String(x.num) !== String(num)) },
    })),

  slotTypes: {},
  toggleSlotType: (index) =>
    set((s) => {
      const cur = s.slotTypes[index] || 'neutre';
      const next = cur === 'neutre' ? 'froid' : cur === 'froid' ? 'chaud' : 'neutre';
      return { slotTypes: { ...s.slotTypes, [index]: next } };
    }),

  toasts: [],
  addToast: (msg, type = 'info') =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now() + Math.random(), msg, type }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
