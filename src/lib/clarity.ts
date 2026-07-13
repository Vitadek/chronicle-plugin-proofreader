import { authFetch } from './api';

export interface ClarityIssue {
  quote: string;
  /** Why the passage may read unclear — never a rewrite. */
  message: string;
}

/**
 * The AI clarity pass (server endpoint /api/ai/clarity).
 *
 * Observation-only by construction: the endpoint's response schema has no
 * suggestion field and its prompt forbids rewrites, so nothing here can put
 * words in the author's mouth.
 */
export async function aiClarityPass(text: string): Promise<ClarityIssue[]> {
  const res = await authFetch('/api/ai/clarity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    let msg = 'AI clarity pass failed';
    try {
      const e = await res.json();
      msg = e?.error?.message || msg;
    } catch { /* non-JSON */ }
    throw new Error(msg);
  }
  const data = (await res.json()) as { issues?: ClarityIssue[] };
  return data.issues || [];
}
