import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../lib/db';
import { addDaysIso } from '../../../../../lib/crm';

export const prerender = false;

// Logs a manual follow-up touch on a 'replied' lead — advances the Day 3 /
// Day 7 cadence (first log after 'replied' suggests +7 days; every log after
// that keeps suggesting +7, so a lead never silently falls off the radar).
export const POST: APIRoute = async ({ locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid lead' }, { status: 422 });
  const db = requireDb(locals);
  const lead = await db.prepare('SELECT status, followup_count FROM leads WHERE id = ?1')
    .bind(params.id).first<{ status: string; followup_count: number }>();
  if (!lead || lead.status !== 'replied') {
    return Response.json({ success: false, error: 'Lead is not in the replied stage' }, { status: 422 });
  }
  const today = nowIso().slice(0, 10);
  const nextFollowupDate = addDaysIso(today, 7);
  const followupCount = (lead.followup_count ?? 0) + 1;
  await db.prepare(
    `UPDATE leads SET last_contact_date = ?1, next_followup_date = ?2, followup_count = ?3, updated_at = ?4 WHERE id = ?5`,
  ).bind(today, nextFollowupDate, followupCount, nowIso(), params.id).run();
  return Response.json({ success: true, lastContactDate: today, nextFollowupDate, followupCount });
};
