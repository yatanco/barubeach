import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../lib/db';
import { isOneOf, UNIFIED_STATUSES } from '../../../../../lib/crm';
import { computeFollowupCadence } from '../../../../../lib/followup';
export const prerender = false;

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  let body: { status?: string };
  try { body = await request.json(); } catch {
    return Response.json({ success:false, error:'Invalid request' }, { status:400 });
  }
  const status = body.status || '';
  if (!params.id || !isOneOf(status, UNIFIED_STATUSES)) {
    return Response.json({ success:false, error:'Invalid status' }, { status:422 });
  }
  const db = requireDb(locals);

  // Manually marking a lead "replied" (right after sending the first message)
  // starts its Day 3 / Day 7 follow-up cadence — not automatic on any other
  // transition into 'replied', only the initial new -> replied move.
  const current = await db.prepare('SELECT status FROM leads WHERE id = ?1').bind(params.id).first<{ status: string }>();
  if (current?.status === 'new' && status === 'replied') {
    const cadence = computeFollowupCadence(true, 0, nowIso().slice(0, 10));
    await db.prepare(
      `UPDATE leads SET status = ?1, updated_at = ?2, last_contact_date = ?3, next_followup_date = ?4, followup_count = ?5 WHERE id = ?6`,
    ).bind(status, nowIso(), cadence.lastContactDate, cadence.nextFollowupDate, cadence.followupCount, params.id).run();
  } else {
    await db.prepare('UPDATE leads SET status = ?1, updated_at = ?2 WHERE id = ?3')
      .bind(status, nowIso(), params.id).run();
  }
  return Response.json({ success:true, status });
};
