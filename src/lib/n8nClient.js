/**
 * Client léger pour appeler les webhooks n8n depuis le front React.
 * Remplace les fetch() dispersés dans chaque page .html legacy.
 */

const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'https://n8ninstance.n8ntools.cfd';

/**
 * Appelle un webhook n8n.
 * @param {string} path - ex: '/webhook/forcer-depart'
 * @param {object} options - { method, body }
 */
export async function callN8nWebhook(path, { method = 'POST', body } = {}) {
  const res = await fetch(`${N8N_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`n8n webhook ${path} a échoué (${res.status}): ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json') ? res.json() : res.text();
}
