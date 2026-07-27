import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { HUB_BRANCHES } from './hubConfig';

/**
 * useHubKpis — alimente le chiffre affiché sur chaque branche du noyau.
 *
 * Conception défensive : chaque KPI est calculé indépendamment et enveloppé
 * dans un try/catch. Si une requête échoue (table absente, RLS, réseau), la
 * branche affiche « — » et le hub reste parfaitement fonctionnel. Aucun KPI
 * ne peut faire tomber la page.
 *
 * Pour brancher un vrai KPI : compléter le fetcher correspondant ci-dessous.
 * Un fetcher doit retourner un nombre/chaîne, ou null s'il n'est pas encore câblé.
 */

const FETCHERS = {
  // TODO — à câbler sur les vraies tables/vues une fois les schémas confirmés.
  dashboard: async () => null,
  camions: async () => null,
  netrack: async () => null,
  'parametres-prob': async () => null,
};

async function safeRun(id) {
  const fn = FETCHERS[id];
  if (!fn) return null;
  try {
    const value = await fn(supabase);
    return value ?? null;
  } catch (err) {
    console.warn(`[hub] KPI "${id}" indisponible :`, err?.message ?? err);
    return null;
  }
}

export function useHubKpis({ enabled = true, refreshMs = 120000 } = {}) {
  const [kpis, setKpis] = useState({});

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;

    async function load() {
      const entries = await Promise.all(
        HUB_BRANCHES.map(async (b) => [b.id, await safeRun(b.id)])
      );
      if (alive) setKpis(Object.fromEntries(entries));
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
