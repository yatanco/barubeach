import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../lib/db';

export const prerender = false;

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  let body: { notes?: string };
  try { body = await request.json(); } catch {
    return Response.json({ success:false, error:'Invalid request' }, { status:400 });
  }
  if (!params.id) return Response.json({ success:false, error:'Invalid booking' }, { status:422 });
  await requireDb(locals).prepare('UPDATE bookings SET notes = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(typeof body.notes === 'string' ? body.notes : '', nowIso(), params.id).run();
  return Response.json({ success:true });
};
