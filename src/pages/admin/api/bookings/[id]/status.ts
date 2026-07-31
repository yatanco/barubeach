import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../lib/db';
import { isOneOf, UNIFIED_STATUSES } from '../../../../../lib/crm';

export const prerender = false;

// 'checked_in' is intentionally not accepted here — it's a legacy value only
// ever written directly by hosthub-sync.ts. The UI always PATCHes 'in_house'.
export const PATCH: APIRoute = async ({ request, locals, params }) => {
  let body: { status?: string };
  try { body = await request.json(); } catch {
    return Response.json({ success:false, error:'Invalid request' }, { status:400 });
  }
  const status = body.status || '';
  if (!params.id || !isOneOf(status, UNIFIED_STATUSES)) {
    return Response.json({ success:false, error:'Invalid status' }, { status:422 });
  }
  await requireDb(locals).prepare('UPDATE bookings SET status = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(status, nowIso(), params.id).run();
  return Response.json({ success:true, status });
};
