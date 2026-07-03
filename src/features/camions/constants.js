// 10 créneaux fixes quotidiens
export const SLOTS = [
  { idx: 0, h: '06:00', lbl: '06h00 · Camion A' },
  { idx: 1, h: '06:00', lbl: '06h00 · Camion B' },
  { idx: 2, h: '07:30', lbl: '07h30' },
  { idx: 3, h: '09:00', lbl: '09h00' },
  { idx: 4, h: '11:30', lbl: '11h30' },
  { idx: 5, h: '14:00', lbl: '14h00' },
  { idx: 6, h: '15:30', lbl: '15h30' },
  { idx: 7, h: '17:00', lbl: '17h00' },
  { idx: 8, h: '18:00', lbl: '18h00' },
  { idx: 9, h: '19:00', lbl: '19h00' },
];

export const DESC_OPTS = ['', 'Camion vide', 'Stock palette', 'Stock 1 commande', 'Stock 2 grains', 'VENIR BOBTAIL'];
export const DESTS = ['GH', 'ADVANTECH', 'PROACTIVE', 'LJDERY', 'AUCUN REPARTIR BOBTAIL'];

export function hexToRgb(hex) {
  if (!hex || hex.length < 7) return '200,132,58';
  return parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16);
}

/** Retourne la liste des items d'une catégorie de paramètres, triés par `ordre`. */
export function getParamItems(params, cat) {
  return params[cat] || [];
}

/** Style React (objet) pour un <select> selon la valeur sélectionnée. */
export function getParamStyle(params, cat, val) {
  const item = (params[cat] || []).find((i) => i.valeur === val);
  if (!item) return {};
  const style = {};
  if (item.text_color) style.color = item.text_color;
  if (item.font_weight) style.fontWeight = item.font_weight;
  if (item.border_color && item.border_opacity) {
    const rgb = hexToRgb(item.border_color);
    style.borderColor = `rgba(${rgb},${item.border_opacity})`;
    if (item.has_background) style.background = `rgba(${rgb},${item.border_opacity})`;
  }
  return style;
}

/** Style de fond seul (pour le wrapper .statut-badge quand le <select> a background:transparent). */
export function getBgStyle(params, cat, val) {
  const item = (params[cat] || []).find((i) => i.valeur === val);
  if (!item || !item.has_background || !item.border_color || !item.border_opacity) return {};
  return { background: `rgba(${hexToRgb(item.border_color)},${item.border_opacity})` };
}
