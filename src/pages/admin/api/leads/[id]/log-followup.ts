import type { APIRoute } from 'astro';
import { nowIso, requireDb, withJsonError } from '../../../../../lib/db';
import { computeFollowupCadence } from '../../../../../lib/followup';

export const prerender = false;

// Logs a manual follow-up touch on a 'replied' or 'quoted' lead — advances
// the Day 3 / Day 7 cadence (first log after 'replied' suggests +7 days;
// every log after that keeps suggesting +7, so a lead never silently falls
// off the radar). 'quoted' is included because a lead awaiting a price
// decision is still "waiting to hear back" the same way a replied lead is.
export const POST: APIRoute = withJsonError(async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid lead' }, { status: 422 });
  let body: { message_text?: string } = {};
  try { body = await request.json(); } catch { /* no body sent is fine — message_text is optional */ }
  const db = requireDb(locals);
  const lead = await db.prepare('SELECT status, followup_count FROM leads WHERE id = ?1')
    .bind(params.id).first<{ status: string; followup_count: number }>();
  if (!lead || (lead.status !== 'replied' && lead.status !== 'quoted')) {
    return Response.json({ success: false, error: 'Lead is not in the replied or quoted stage' }, { status: 422 });
  }
  const now = nowIso();
  const cadence = computeFollowupCadence(false, lead.followup_count ?? 0, now.slice(0, 10));
  await db.prepare(
    `UPDATE leads SET last_contact_date = ?1, next_followup_date = ?2, followup_count = ?3, updated_at = ?4 WHERE id = ?5`,
  ).bind(cadence.lastContactDate, cadence.nextFollowupDate, cadence.followupCount, now, params.id).run();

  const messageText = typeof body.message_text === 'string' && body.message_text.trim()
    ? body.message_text.trim()
    : 'Follow-up logged';
  await db.prepare(
    'INSERT INTO interactions (id, lead_id, direction, message_text, created_at) VALUES (?1, ?2, ?3, ?4, ?5)',
  ).bind(crypto.randomUUID(), params.id, 'note', messageText, now).run();

  return Response.json({ success: true, lastContactDate: cadence.lastContactDate, nextFollowupDate: cadence.nextFollowupDate, followupCount: cadence.followupCount });
});
