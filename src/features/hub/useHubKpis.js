import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { isWeekend } from '../camions/rules';
import { HUB_BRANCHES } from './hubConfig';

/**
 * useHubKpis — alimente le chiffre affiché sur chaque panneau.
 *
 * ══ CONCEPTION DÉFENSIVE ═══════════════════════════════════
 * Chaque KPI est calculé indépendamment, enveloppé dans un try/catch. Une
 * requête qui échoue affiche « — » et laisse le hub fonctionnel : c'est le
 * premier écran que voit l'équipe le matin, il ne doit jamais tomber.
 *
 * ══ LES DÉFINITIONS VIENNENT DU CODE MÉTIER, PAS D'UNE INTERPRÉTATION ══
 * Chaque chiffre reprend la règle déjà écrite ailleurs dans l'app, pour
 * qu'un panneau et sa page affichent toujours la même chose :
 *   • problématiques → STATUTS_TERMINES de problematiques/logic.js
 *   • camions        → règle de statut effectif de camions/rules.js
 *   • palettes       → une ligne d'inventaire = une palette
 * Si l'une de ces règles change là-bas, la reporter ici.
 */

/** Date du jour au format AAAA-MM-JJ, en heure locale (pas UTC). */
function aujourdhui() {
  const d = new Date();
  return d.getFullYear()
    + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

/** COUNT côté serveur : aucune ligne ne transite. */
async function compter(table, appliquer) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (appliquer) q = appliquer(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Problématiques actives.
 * Même définition que STATUTS_TERMINES dans problematiques/logic.js :
 * une problématique Résolue, Clôturée ou Annulée ne demande plus de suivi.
 */
const STATUTS_TERMINES = ['Résolu', 'Clôturé', 'Annulé'];

function problematiquesActives() {
  const liste = '(' + STATUTS_TERMINES.map((s) => `"${s}"`).join(',') + ')';
  return compter('problematiques', (q) => q.not('statut', 'in', liste));
}

/**
 * Camions actifs du jour.
 *
 * Attention : compter les lignes de la table donne un faux total. Un créneau
 * non touché n'existe pas en base et compte pourtant comme ACTIF — c'est la
 * règle de buildRowContext (camions/rules.js) :
 *   statut effectif = valeur en base, sinon INACTIF les week-ends pour les
 *   créneaux 0,1,7,8,9, sinon ACTIF.
 * Et comme dans isActifOuNL, toute valeur tierce (NON LIVRÉ) reste active :
 * seul INACTIF exclut.
 *
 * Les 10 créneaux fixes sont donc toujours comptés, plus les extras
 * (slot_index >= 10) qui, eux, n'existent que s'ils ont été créés.
 */
const SLOTS_FIXES = 10;
const WK_INACTIF_IDX = [0, 1, 7, 8, 9];
const V_INACTIF = 'INACTIF'; // libellé par défaut de planning_params.statut_ligne

async function camionsActifs() {
  const jour = aujourdhui();
  const { data, error } = await supabase
    .from('planning_camions')
    .select('slot_index, statut_ligne')
    .eq('date_jour', jour);
  if (error) throw error;

  const enBase = new Map((data || []).map((r) => [r.slot_index, r.statut_ligne]));
  const creneaux = new Set();
  for (let i = 0; i < SLOTS_FIXES; i += 1) creneaux.add(i);
  (data || []).forEach((r) => { if (r.slot_index >= SLOTS_FIXES) creneaux.add(r.slot_index); });

  const wk = isWeekend(jour);
  let actifs = 0;
  creneaux.forEach((i) => {
    const defaut = wk && WK_INACTIF_IDX.includes(i) ? V_INACTIF : 'ACTIF';
    const statut = enBase.get(i) || defaut;
    if (statut !== V_INACTIF) actifs += 1;
  });
  return actifs;
}

const FETCHERS = {
  problematiques: () => problematiquesActives(),

  camions: () => camionsActifs(),

  // Une ligne d'inventaire = une palette : un COUNT suffit, inutile de lire
  // les quantités (l'ancienne somme de unite2_qte_inv comptait des unités).
  netrack: () => compter('n8n_gh_inventaire'),

  'parametres-prob': () => compter('prob_responsables'),
};

/** Groupe les milliers à la française : 12 480 plutôt que 12480. */
function formater(v) {
  return typeof v === 'number' ? v.toLocaleString('fr-CA') : v;
}

async function executer(id) {
  const fn = FETCHERS[id];
  if (!fn) return null;
  try {
    const valeur = await fn();
    return valeur === null || valeur === undefined ? null : formater(valeur);
  } catch (err) {
    console.warn(`[hub] KPI « ${id} » indisponible :`, err?.message ?? err);
    return null;
  }
}

export function useHubKpis({ enabled = true, refreshMs = 120000 } = {}) {
  const [kpis, setKpis] = useState({});

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;

    async function load() {
      const entrees = await Promise.all(
        HUB_BRANCHES.map(async (b) => [b.id, await executer(b.id)])
      );
      if (alive) setKpis(Object.fromEntries(entrees));
    }

    load();
    const timer = refreshMs ? setInterval(load, refreshMs) : null;
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [enabled, refreshMs]);

  return kpis;
}
