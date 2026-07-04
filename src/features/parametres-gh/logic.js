export const COLORS = ['#4A9EE8', '#2DD4A0', '#F59E0B', '#EF4444', '#A78BFA', '#F97316', '#EC4899', '#06B6D4', '#84CC16', '#14B8A6'];

export const EMOJIS = [
  '📦', '🧪', '🏭', '⚗️', '🔬', '🧬', '🌿', '🍃', '💊', '🧴', '🥤', '🫙', '📋', '⚙️', '🔧', '🏷️', '🎯', '🔑', '⭐', '🚀',
  '🌾', '🌽', '🍚', '🥜', '🫘', '🧈', '🥣', '🍜', '🥐', '🥖', '🍞', '🧇',
  '🧂', '🍯', '🧊', '🥛', '🧋', '🍶', '🧃', '🥫', '🫗', '🧉', '🍵', '☕', '🫖', '🍼',
  '🧻', '📜', '📄', '🗞️', '🎞️', '🧵', '🧶', '🪡', '🔘', '⚪', '⚫', '🔴', '🔵', '🟡', '🟢', '🟣', '🟠', '🟤',
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🥕', '🥦', '🥬', '🥚', '🍖', '🥩', '🥓',
  '📁', '📂', '🗂️', '📊', '📈', '📉', '🗒️', '📝', '✉️', '🗃️',
  '🔨', '🪛', '🪚', '⚒️', '🛠️', '🔩', '⚡', '🔋', '🔌', '💡', '🧯', '🧲',
  '🌱', '🌵', '🌴', '🌳', '🌲', '🌺', '🌻', '🌼',
  '🧫', '🩺', '💉', '🌡️', '⚛️', '🔭', '🩻',
];

export const COLUMNS = [
  { key: '1', label: 'No. produit' }, { key: '2', label: 'Description' }, { key: '3', label: 'Qté inv.' },
  { key: '8', label: 'No. comm client' }, { key: '11', label: 'No. lot' }, { key: '12', label: 'No. sous-lot' },
  { key: '13', label: 'Date lot' }, { key: '14', label: 'Expiration' }, { key: '15', label: 'Réception originale' },
];

export const OPERATORS = [
  { key: 'contains', label: 'contient' }, { key: 'not_contains', label: 'ne contient pas' },
  { key: 'starts_with', label: 'commence par' }, { key: 'ends_with', label: 'se termine par' },
  { key: 'equals', label: 'est égal à' }, { key: 'not_equals', label: 'est différent de' },
  { key: 'is_empty', label: 'est vide' }, { key: 'is_not_empty', label: "n'est pas vide" },
];

export function buildPreviewParts(cat) {
  if (!cat.rules || cat.rules.length === 0) return null;
  return cat.rules.map((rule, i) => {
    const col = COLUMNS.find((c) => c.key === rule.col)?.label || rule.col;
    const op = OPERATORS.find((o) => o.key === rule.operator)?.label || rule.operator;
    const val = rule.value || null;
    const logic = i === 0 ? 'SI' : (rule.logic || 'AND');
    return { logic, col, op, val, isFirst: i === 0 };
  });
}
