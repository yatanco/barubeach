import type { APIRoute } from 'astro';
import { nowIso, requireDb, withJsonError } from '../../../../../lib/db';

export const prerender = false;

// Partial update for the two inline-editable fields on the unified detail
// page: phone (Section 1, saves on blur) and notes (Section 9, autosaves).
export const PATCH: APIRoute = withJsonError(async ({ request, locals, params }) => {
  let body: { notes?: string; whatsapp?: string };
  try { body = await request.json(); } catch {
    return Response.json({ success:false, error:'Invalid request' }, { status:400 });
  }
  if (!params.id) return Response.json({ success:false, error:'Invalid lead' }, { status:422 });

  const db = requireDb(locals);
  const now = nowIso();
  if (typeof body.notes === 'string') {
    await db.prepare('UPDATE leads SET notes = ?1, updated_at = ?2 WHERE id = ?3').bind(body.notes, now, params.id).run();
  }
  if (typeof body.whatsapp === 'string') {
    await db.prepare('UPDATE leads SET whatsapp = ?1, updated_at = ?2 WHERE id = ?3').bind(body.whatsapp.trim() || null, now, params.id).run();
  }
  return Response.json({ success:true });
});
