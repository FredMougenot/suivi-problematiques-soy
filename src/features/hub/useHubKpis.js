import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { nombre } from '../inventaire-netrack/logic';
import { HUB_BRANCHES } from './hubConfig';

/**
 * useHubKpis — alimente le chiffre affiché sur chaque panneau.
 *
 * ══ CONCEPTION DÉFENSIVE ═══════════════════════════════════
 * Chaque KPI est calculé indépendamment et enveloppé dans un try/catch.
 * Une requête qui échoue (table absente, RLS, réseau) affiche « — » et
 * laisse le hub parfaitement fonctionnel. Aucun KPI ne peut faire tomber
 * l'écran d'accueil — c'est la première chose que voit l'équipe le matin.
 *
 * ══ COÛT ══════════════════════════════════════════════════
 * Trois des quatre requêtes sont des COUNT côté serveur (head: true) :
 * aucune ligne ne transite. Seul le total de palettes doit lire une
 * colonne, faute d'agrégat SUM dans le client JS — d'où la pagination
 * bornée ci-dessous. Si l'inventaire dépasse un jour ce plafond, la bonne
 * réponse est une vue SQL qui renvoie le total déjà calculé, pas plus de
 * pages.
 */

/** Date du jour au format AAAA-MM-JJ, en heure locale (pas UTC). */
function aujourdhui() {
  const d = new Date();
  return d.getFullYear()
    + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

async function compter(table, appliquer) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (appliquer) q = appliquer(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

const PAGE = 1000;
const PAGES_MAX = 8; // plafond de sécurité : 8000 lignes

/**
 * Total des palettes NetRack.
 * `unite2_qte_inv` arrive en texte du portail (« 1,418. ») : la virgule est
 * un séparateur de milliers et le point final un artefact d'affichage.
 * On réutilise donc `nombre()` du module NetRack plutôt que parseFloat,
 * sinon « 1,418 » serait lu 1.
 */
async function totalPalettes() {
  let total = 0;
  for (let page = 0; page < PAGES_MAX; page += 1) {
    const debut = page * PAGE;
    const { data, error } = await supabase
      .from('n8n_gh_inventaire')
      .select('unite2_qte_inv')
      .range(debut, debut + PAGE - 1);
    if (error) throw error;
    (data || []).forEach((l) => { total += nombre(l.unite2_qte_inv); });
    if (!data || data.length < PAGE) break;
  }
  return Math.round(total);
}

const FETCHERS = {
  // Registre complet, toutes périodes et tous statuts confondus.
  problematiques: () => compter('problematiques'),

  // Camions planifiés pour la journée en cours. Une ligne = un créneau
  // occupé ; les créneaux vides ne sont pas écrits en base.
  camions: () => compter('planning_camions', (q) => q.eq('date_jour', aujourdhui())),

  netrack: () => totalPalettes(),

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
