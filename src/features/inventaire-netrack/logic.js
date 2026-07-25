/** Helpers de l'inventaire NetRack (donnees texte issues du scraping NetRack). */

export const CLIENTS = ['EO', 'PBC'];

/** Les quantites arrivent en texte (« 1 234,5 »). Retourne 0 si illisible. */
export function nombre(v) {
  const n = parseFloat(String(v ?? '').replace(/[\s\u00a0]/g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

/** Accepte AAAA-MM-JJ et JJ/MM/AAAA. Retourne null si illisible. */
export function versDate(v) {
  if (!v) return null;
  const s = String(v);
  let m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}

export function joursAvantExpiration(ligne) {
  const d = versDate(ligne.date_expiration);
  if (!d) return null;
  return Math.ceil((d - new Date()) / 86400000);
}

export const CHAMPS_DETAIL = [
  ['division', 'Division'],
  ['no_produit', 'N° produit'],
  ['description', 'Description'],
  ['entrepot', 'Entrepôt'],
  ['etiquette', 'Étiquette'],
  ['no_comm_client', 'N° commande client'],
  ['no_lot', 'N° lot'],
  ['no_sous_lot', 'N° sous-lot'],
  ['date_lot', 'Date lot'],
  ['date_expiration', 'Expiration'],
  ['date_reception_originale', 'Réception originale'],
  ['unite1_type', 'U1 — type'],
  ['unite1_qte_inv', 'U1 — qté inventaire'],
  ['unite1_exped_att', 'U1 — expéd. en attente'],
  ['unite1_bloques', 'U1 — bloqués'],
  ['unite1_disponibles', 'U1 — disponibles'],
  ['unite2_type', 'U2 — type'],
  ['unite2_qte_inv', 'U2 — qté inventaire'],
  ['unite2_exped_att', 'U2 — expéd. en attente'],
  ['unite2_bloques', 'U2 — bloqués'],
  ['unite2_disponibles', 'U2 — disponibles'],
];

/** Filtre + tri. `tri` = { colonne, sens }. */
export function filtrerEtTrier(lignes, criteres, tri) {
  const { client, recherche, entrepot, division, stock } = criteres;
  const mots = recherche.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const filtrees = lignes.filter((l) => {
    if (client && l.client !== client) return false;
    if (entrepot && l.entrepot !== entrepot) return false;
    if (division && l.division !== division) return false;
    if (stock === 'dispo' && nombre(l.unite1_disponibles) <= 0) return false;
    if (stock === 'bloque' && nombre(l.unite1_bloques) <= 0) return false;
    if (stock === 'expire') {
      const j = joursAvantExpiration(l);
      if (j === null || j > 30) return false;
    }
    if (mots.length) {
      const foin = [l.no_produit, l.description, l.no_lot, l.no_sous_lot,
        l.etiquette, l.no_comm_client, l.division].join(' ').toLowerCase();
      if (!mots.every((m) => foin.includes(m))) return false;
    }
    return true;
  });

  const numeriques = new Set(['unite1_qte_inv', 'unite1_disponibles', 'unite1_bloques',
    'unite2_qte_inv', 'unite2_disponibles', 'unite2_bloques']);

  return filtrees.sort((a, b) => {
    const A = a[tri.colonne];
    const B = b[tri.colonne];
    if (numeriques.has(tri.colonne)) return (nombre(A) - nombre(B)) * tri.sens;
    return String(A ?? '').localeCompare(String(B ?? ''), 'fr', { numeric: true }) * tri.sens;
  });
}

/** CSV point-virgule + BOM, pour ouverture directe dans Excel FR. */
export function exporterCsv(lignes) {
  const colonnes = ['client', ...CHAMPS_DETAIL.map(([cle]) => cle)];
  const entetes = ['Client', ...CHAMPS_DETAIL.map(([, lib]) => lib)];
  const echapper = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const contenu = [entetes.join(';')]
    .concat(lignes.map((l) => colonnes.map((c) => echapper(l[c])).join(';')))
    .join('\r\n');
  const blob = new Blob(['\ufeff' + contenu], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'inventaire-netrack-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
