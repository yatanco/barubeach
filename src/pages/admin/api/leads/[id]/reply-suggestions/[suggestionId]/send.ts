import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../../../lib/db';
import { computeFollowupCadence } from '../../../../../../../lib/followup';

export const prerender = false;

// "Mark as sent" — records that the operator sent this draft (via WhatsApp,
// manually) after reviewing/editing it. Never sends anything itself.
export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!params.id || !params.suggestionId) {
    return Response.json({ success: false, error: 'Invalid request' }, { status: 422 });
  }
  let body: { edited_reply?: string };
  try { body = await request.json(); } catch {
    return Response.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
  if (typeof body.edited_reply !== 'string' || !body.edited_reply.trim()) {
    return Response.json({ success: false, error: 'A reply message is required' }, { status: 422 });
  }

  const db = requireDb(locals);
  const suggestion = await db.prepare(
    'SELECT id, lead_id, generated_reply, sent FROM reply_suggestions WHERE id = ?1 AND lead_id = ?2',
  ).bind(params.suggestionId, params.id).first<{ id: string; lead_id: string; generated_reply: string; sent: number }>();
  if (!suggestion) return Response.json({ success: false, error: 'Suggestion not found' }, { status: 404 });
  if (suggestion.sent) return Response.json({ success: false, error: 'This suggestion was already marked as sent' }, { status: 422 });

  const finalReply = body.edited_reply.trim();
  const editedReply = finalReply !== suggestion.generated_reply ? finalReply : null;
  const now = nowIso();

  await db.prepare('UPDATE reply_suggestions SET edited_reply = ?1, sent = 1 WHERE id = ?2')
    .bind(editedReply, suggestion.id).run();

  await db.prepare(
    'INSERT INTO interactions (id, lead_id, direction, message_text, created_at) VALUES (?1, ?2, ?3, ?4, ?5)',
  ).bind(crypto.randomUUID(), suggestion.lead_id, 'outgoing', finalReply, now).run();

  // Advance status/follow-up cadence — same rule as the manual "Mark as
  // replied" button (status.ts) and "Log follow-up" button (log-followup.ts),
  // reused here via the shared helper rather than duplicated.
  const lead = await db.prepare('SELECT status, followup_count FROM leads WHERE id = ?1')
    .bind(suggestion.lead_id).first<{ status: string; followup_count: number }>();
  if (lead?.status === 'new') {
    const cadence = computeFollowupCadence(true, 0, now.slice(0, 10));
    await db.prepare(
      'UPDATE leads SET status = ?1, updated_at = ?2, last_contact_date = ?3, next_followup_date = ?4, followup_count = ?5 WHERE id = ?6',
    ).bind('replied', now, cadence.lastContactDate, cadence.nextFollowupDate, cadence.followupCount, suggestion.lead_id).run();
  } else if (lead?.status === 'replied' || lead?.status === 'quoted') {
    const cadence = computeFollowupCadence(false, lead.followup_count ?? 0, now.slice(0, 10));
    await db.prepare(
      'UPDATE leads SET updated_at = ?1, last_contact_date = ?2, next_followup_date = ?3, followup_count = ?4 WHERE id = ?5',
    ).bind(now, cadence.lastContactDate, cadence.nextFollowupDate, cadence.followupCount, suggestion.lead_id).run();
  } else if (lead) {
    await db.prepare('UPDATE leads SET updated_at = ?1, last_contact_date = ?2 WHERE id = ?3')
      .bind(now, now.slice(0, 10), suggestion.lead_id).run();
  }

  return Response.json({ success: true });
};
