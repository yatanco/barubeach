import type { APIRoute } from 'astro';
import { requireDb, withJsonError } from '../../../../../lib/db';

export const prerender = false;

interface InteractionRow { id: string; direction: string; message_text: string; created_at: string; }

export const GET: APIRoute = withJsonError(async ({ locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid lead' }, { status: 422 });
  const db = requireDb(locals);
  const result = await db.prepare(
    'SELECT id, direction, message_text, created_at FROM interactions WHERE lead_id = ?1 ORDER BY created_at DESC',
  ).bind(params.id).all<InteractionRow>();
  return Response.json({ success: true, interactions: result.results });
});
