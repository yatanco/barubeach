import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../lib/db';
import { computeFollowupCadence } from '../../../../../lib/followup';

export const prerender = false;

// Logs a manual follow-up touch on a 'replied' or 'quoted' lead — advances
// the Day 3 / Day 7 cadence (first log after 'replied' suggests +7 days;
// every log after that keeps suggesting +7, so a lead never silently falls
// off the radar). 'quoted' is included because a lead awaiting a price
// decision is still "waiting to hear back" the same way a replied lead is.
export const POST: APIRoute = async ({ locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid lead' }, { status: 422 });
  const db = requireDb(locals);
  const lead = await db.prepare('SELECT status, followup_count FROM leads WHERE id = ?1')
    .bind(params.id).first<{ status: string; followup_count: number }>();
  if (!lead || (lead.status !== 'replied' && lead.status !== 'quoted')) {
    return Response.json({ success: false, error: 'Lead is not in the replied or quoted stage' }, { status: 422 });
  }
  const cadence = computeFollowupCadence(false, lead.followup_count ?? 0, nowIso().slice(0, 10));
  await db.prepare(
    `UPDATE leads SET last_contact_date = ?1, next_followup_date = ?2, followup_count = ?3, updated_at = ?4 WHERE id = ?5`,
  ).bind(cadence.lastContactDate, cadence.nextFollowupDate, cadence.followupCount, nowIso(), params.id).run();
  return Response.json({ success: true, lastContactDate: cadence.lastContactDate, nextFollowupDate: cadence.nextFollowupDate, followupCount: cadence.followupCount });
};
