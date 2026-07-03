import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

const EDGE_FN_URL = 'https://xppzmdmnuztozgukrcta.supabase.co/functions/v1/gh-login';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcHptZG1udXp0b3pndWtyY3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDM3MTIsImV4cCI6MjA4NzU3OTcxMn0.9-wMrvuz08TaI8-y2x3JLbLOKDnHpTUqJc66ET-8Kug';

export function useGhSessionQuery() {
  return useQuery({
    queryKey: ['gh_session'],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('gh_session').select('*').order('updated_at', { ascending: false }).limit(1).single();
        return data || null;
      } catch (e) { return null; }
    },
  });
}

export function useConnectGhMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const resp = await fetch(EDGE_FN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ANON_KEY } });
      const data = await resp.json();
      if (!data.id1) throw new Error(data.error || 'réponse inattendue');

      let existing = null;
      try { const r = await supabase.from('gh_session').select('id').limit(1).single(); existing = r.data; } catch (e) { /* none yet */ }
      const now = new Date().toISOString();
      if (existing?.id) await supabase.from('gh_session').update({ id1: data.id1, updated_at: now }).eq('id', existing.id);
      else await supabase.from('gh_session').insert({ id1: data.id1, updated_at: now });

      return { id1: data.id1, updated_at: now };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gh_session'] }),
  });
}

export function useLoadGhInventoryMutation() {
  return useMutation({
    mutationFn: async (id1) => {
      const resp = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ANON_KEY },
        body: JSON.stringify({ action: 'inventory', id1 }),
      });
      const data = await resp.json();
      if (!data.html) throw new Error(data.error || 'Pas de données');
      return data.html;
    },
  });
}

export function useGhCategoriesQuery() {
  return useQuery({
    queryKey: ['gh_categories'],
    queryFn: async () => {
      const { data } = await supabase.from('gh_categories').select('*').order('created_at');
      return (data || []).map((c) => ({ ...c, rules: c.cat_rules || c.rules || [] }));
    },
  });
}

export function useGhPoidsQuery() {
  return useQuery({
    queryKey: ['gh_poids'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gh_poids').select('*');
      if (error) throw error;
      return (data || []).map((p) => ({ ...p, matchType: p.match_type || 'exact' }));
    },
  });
}

export function useTraxCodesQuery() {
  return useQuery({
    queryKey: ['correspondance_trax'],
    queryFn: async () => {
      const { data } = await supabase.from('correspondance_trax').select('code_trax,code_interne');
      const codes = new Set();
      (data || []).forEach((r) => {
        if (r.code_trax) codes.add(r.code_trax.trim().toUpperCase());
        if (r.code_interne) codes.add(r.code_interne.trim().toUpperCase());
      });
      return codes;
    },
  });
}

export function useAddTraxMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ codeTrax, codeInt, desig }) => {
      const { error } = await supabase.from('correspondance_trax').insert({ code_trax: codeTrax || null, code_interne: codeInt || null, designation: desig || null });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['correspondance_trax'] }),
  });
}
