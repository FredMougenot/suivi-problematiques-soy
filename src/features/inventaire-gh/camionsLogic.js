import { getPoidsUnitaire, isItemManuel, KEEP_COLS } from './logic';

const STORAGE_KEY = 'gh_camions';

export function loadCamions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const camions = JSON.parse(saved);
      return { camions, camionActifId: camions[0]?.id || null };
    }
  } catch { /* ignore */ }
  const camions = [
    { id: 'cam_' + Date.now(), nom: 'Camion 1', items: [], dateCreation: new Date().toISOString() },
    { id: 'cam_' + (Date.now() + 1), nom: 'Camion 2', items: [], dateCreation: new Date().toISOString() },
  ];
  return { camions, camionActifId: camions[0].id };
}

export function persistCamions(camions) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(camions)); } catch { /* ignore */ }
}

/** Nombre d'"items" affiché sur la carte camion (les items manuels comptent par série de 15). */
export function computeItemCount(camion) {
  let count = 0;
  camion.items.forEach((item) => {
    if (item._is_manual) count += Math.ceil((item._resolved_qte || 0) / 15);
    else count += 1;
  });
  return count;
}

export function addSelectionToCamion(camion, filtered, selectedRowKeys, poidsList) {
  const existingKeys = new Set(camion.items.map((it) => it._key));
  const newItems = [];

  filtered.forEach((r, i) => {
    const key = r._idx !== undefined ? 'row_' + r._idx : (r.no_lot || r.no_produit + i);
    if (!selectedRowKeys.has(key) || existingKeys.has(key)) return;
    const raw = r._raw || [];
    const code = raw[KEEP_COLS[0]] || '';
    const desc = raw[KEEP_COLS[1]] || '';
    const qte = parseFloat(raw[KEEP_COLS[2]] || 0);
    const poidsUnit = getPoidsUnitaire(poidsList, code);
    const poidsTotal = qte * poidsUnit;
    const isManual = isItemManuel(poidsList, code);

    newItems.push({
      ...r, _key: key,
      _resolved_code: code, _resolved_desc: desc, _resolved_qte: qte,
      _resolved_poids_unit: poidsUnit, _resolved_poids_total: poidsTotal,
      _is_manual: isManual, isNew: true,
    });
  });

  return { camion: { ...camion, items: [...camion.items, ...newItems] }, addedCount: newItems.length };
}

export function removeItemFromCamion(camion, key) {
  return { ...camion, items: camion.items.filter((it) => it._key !== key) };
}

export function adjustItemQty(camion, key, delta) {
  const step = 15;
  return {
    ...camion,
    items: camion.items.map((item) => {
      if (item._key !== key) return item;
      let newQty = (item._resolved_qte || 0) + delta * step;
      if (newQty < step) newQty = step;
      const poidsUnit = item._resolved_poids_unit || 0;
      return { ...item, _resolved_qte: newQty, _resolved_poids_total: newQty * poidsUnit };
    }),
  };
}

export function markCamionSent(camion) {
  return { ...camion, items: camion.items.map((item) => ({ ...item, isNew: false })) };
}

export function camionTotalWeight(camion) {
  return camion.items.reduce((sum, item) => sum + (item._resolved_poids_total || 0), 0);
}
