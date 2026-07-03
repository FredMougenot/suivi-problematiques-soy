import { SLOTS } from './constants';

const WK_INACTIF_IDX = [0, 1, 7, 8, 9];

export function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00').getDay();
  return d === 0 || d === 6;
}

/** Un statut "ACTIF" ou une valeur tierce (NON LIVRÉ) compte comme actif pour les règles auto. */
function isActifOuNL(stEff, vActif, vInactif) {
  if (stEff === vActif) return true;
  if (stEff !== vActif && stEff !== vInactif && stEff !== '') return true;
  return false;
}

/**
 * Construit le contexte de règles pour une date donnée : liste triée des créneaux
 * (fixes + extras), statuts effectifs, index des 1er/2e/dernier créneaux actifs,
 * et une fonction `effective(idx)` qui calcule les valeurs affichées (avec défauts auto).
 */
export function buildRowContext(dateStr, rows, params) {
  const wkEnd = isWeekend(dateStr);
  const slP = params['statut_ligne'] || [{ valeur: 'ACTIF' }, { valeur: 'INACTIF' }];
  const vActif = slP[0]?.valeur || 'ACTIF';
  const vInactif = slP[1]?.valeur || 'INACTIF';
  const vNonLivre = slP[2]?.valeur || null;
  const delaiH = slP.reduce((acc, p) => acc ?? (p.delai_nl != null ? parseFloat(p.delai_nl) : null), null);

  const tcP = params['type_camion'] || [];
  const vReefer = tcP[0]?.valeur || 'REEFER';
  const vChauffe = tcP[1]?.valeur || 'CHAUFFÉE';

  const dstP = params['destination'] || [];
  const vBobtail = dstP[5]?.valeur || '';

  function statutLigneEffectif(idx) {
    const dbSt = (rows[idx] || {}).statut_ligne;
    return dbSt || (wkEnd && WK_INACTIF_IDX.includes(idx) ? vInactif : vActif);
  }

  // Liste complète triée par heure (fixes + extras)
  const extras = Object.keys(rows).map(Number).filter((i) => i >= 10);
  const all = [
    ...SLOTS.map((s) => ({ idx: s.idx, h: s.h, lbl: s.lbl, extra: false })),
    ...extras.map((i) => {
      const r = rows[i];
      const h = r.heure_planif || '00:00';
      return { idx: i, h, lbl: h + ' · Extra', extra: true };
    }),
  ].sort((a, b) => (a.h < b.h ? -1 : a.h > b.h ? 1 : a.idx - b.idx));

  // 1er et 2e créneau actif (pour type_camion)
  let premierActifIdx = null, deuxiemeActifIdx = null, cnt = 0;
  for (const s of all) {
    if (isActifOuNL(statutLigneEffectif(s.idx), vActif, vInactif)) {
      cnt++;
      if (cnt === 1) premierActifIdx = s.idx;
      else if (cnt === 2) { deuxiemeActifIdx = s.idx; break; }
    }
  }

  // Dernier créneau actif (pour destination BOBTAIL)
  let dernierActifIdx = null;
  for (const s of [...all].reverse()) {
    if (isActifOuNL(statutLigneEffectif(s.idx), vActif, vInactif)) { dernierActifIdx = s.idx; break; }
  }

  // Créneau "attendu" (1ère ligne ACTIF stricte sans heure_reelle) — pour l'animation de pulsation
  let awaitedIdx = null;
  for (const s of all) {
    const r = rows[s.idx] || {};
    if (statutLigneEffectif(s.idx) === vActif && !r.heure_reelle) { awaitedIdx = s.idx; break; }
  }

  const isLundi = new Date(dateStr + 'T00:00:00').getDay() === 1;
  const dscP = params['description'] || [];
  const dv = (n) => dscP[n - 1]?.valeur || '';

  function effective(idx) {
    const r = rows[idx] || {};
    const statutLigne = statutLigneEffectif(idx);
    const isInactif = statutLigne === vInactif;

    // Type camion
    let typeCamion = r.type_camion;
    if (!typeCamion) {
      if (wkEnd) typeCamion = idx === premierActifIdx ? '' : vChauffe;
      else if (idx === premierActifIdx) typeCamion = '';
      else if (idx === deuxiemeActifIdx) typeCamion = vReefer;
      else typeCamion = vChauffe;
    } else if (typeCamion === '__VIDE__') typeCamion = '';

    // Destination (règle BOBTAIL sur le dernier actif)
    const hasManualDest = r.id && r.destination != null && r.destination !== vBobtail && r.destination !== '';
    let destination;
    if (idx === dernierActifIdx && vBobtail && !hasManualDest) destination = vBobtail;
    else if (r.destination === vBobtail) destination = '';
    else destination = r.destination || '';
    const isBobtail = !!vBobtail && destination === vBobtail;

    // Description auto (si pas déjà sauvegardée)
    let description = r.description;
    const hasSavedDesc = r.id && r.description != null;
    if (!hasSavedDesc && isActifOuNL(statutLigne, vActif, vInactif)) {
      if (wkEnd) {
        if (idx === premierActifIdx) description = dv(1);
        else if (idx === deuxiemeActifIdx) description = dv(4);
      } else {
        if (idx === premierActifIdx) description = dv(1);
        else if (idx === deuxiemeActifIdx) description = isLundi ? dv(5) : dv(4);
        else if (idx === 4) description = dv(2);
        else if (idx === 5) description = dv(3);
      }
    }
    description = description || '';

    const statutArrivee = r.heure_reelle ? (r.statut || 'FAIT') : (r.statut || 'ATTENTE');

    return {
      statutLigne, typeCamion, destination, description, statutArrivee,
      chargement: r.chargement || '',
      isInactif, isBobtail,
      isLocked: isInactif || isBobtail, // pour num_depart/chargement uniquement dans le cas bobtail ; inactif verrouille tout
    };
  }

  return { all, premierActifIdx, deuxiemeActifIdx, dernierActifIdx, awaitedIdx, effective, vNonLivre, delaiH, wkEnd };
}
