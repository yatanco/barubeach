import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../lib/db';

export const prerender = false;

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

// Corrects a lead's dates (typo fixes, "actually it's the following week",
// etc.) — not a booking-conversion or quote workflow. Availability and
// PriceLabs are recomputed by the page's own server-render on next load, so
// this endpoint only needs to persist the new dates and log the change; no
// separate "refresh" step is needed here.
export const PATCH: APIRoute = async ({ request, locals, params }) => {
  let body: { date_from?: string; date_to?: string };
  try { body = await request.json(); } catch {
    return Response.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
  if (!params.id || !isIsoDate(body.date_from) || !isIsoDate(body.date_to)) {
    return Response.json({ success: false, error: 'Both dates are required (YYYY-MM-DD)' }, { status: 422 });
  }
  if (body.date_to <= body.date_from) {
    return Response.json({ success: false, error: 'Check-out must be after check-in' }, { status: 422 });
  }

  const db = requireDb(locals);
  const lead = await db.prepare(
    'SELECT date_from, date_to, accommodation_amount, food_confirmed, transport_confirmed, quote_total FROM leads WHERE id = ?1',
  ).bind(params.id).first<{
    date_from: string | null; date_to: string | null;
    accommodation_amount: number; food_confirmed: number; transport_confirmed: number; quote_total: number | null;
  }>();
  if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

  const hadExistingQuote = Boolean(
    (lead.accommodation_amount ?? 0) > 0 || lead.food_confirmed || lead.transport_confirmed || lead.quote_total,
  );

  await db.prepare('UPDATE leads SET date_from = ?1, date_to = ?2, updated_at = ?3 WHERE id = ?4')
    .bind(body.date_from, body.date_to, nowIso(), params.id).run();

  const oldRange = lead.date_from && lead.date_to ? `${lead.date_from.slice(0, 10)}→${lead.date_to.slice(0, 10)}` : 'no dates';
  const newRange = `${body.date_from}→${body.date_to}`;
  await db.prepare(
    'INSERT INTO interactions (id, lead_id, direction, message_text, created_at) VALUES (?1, ?2, ?3, ?4, ?5)',
  ).bind(crypto.randomUUID(), params.id, 'note', `Dates changed from ${oldRange} to ${newRange}`, nowIso()).run();

  return Response.json({ success: true, hadExistingQuote });
};
