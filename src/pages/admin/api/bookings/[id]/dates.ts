import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../lib/db';
import { nightsBetween } from '../../../../../lib/crm';

export const prerender = false;

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

// Corrects a booking's dates. bookings.nights is a stored column (unlike
// leads, where nights is computed on read), so it must be recomputed here.
// Availability and PriceLabs are recomputed by the page's own server-render
// on next load.
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
  const booking = await db.prepare(
    'SELECT date_from, date_to, food_confirmed, transport_confirmed FROM bookings WHERE id = ?1',
  ).bind(params.id).first<{ date_from: string; date_to: string; food_confirmed: number; transport_confirmed: number }>();
  if (!booking) return Response.json({ success: false, error: 'Booking not found' }, { status: 404 });

  const accommodationCharge = await db.prepare(
    `SELECT id FROM charges WHERE booking_id = ?1 AND category = 'accommodation' LIMIT 1`,
  ).bind(params.id).first<{ id: string }>();
  const hadExistingQuote = Boolean(accommodationCharge || booking.food_confirmed || booking.transport_confirmed);

  const nights = nightsBetween(body.date_from, body.date_to);
  await db.prepare('UPDATE bookings SET date_from = ?1, date_to = ?2, nights = ?3, updated_at = ?4 WHERE id = ?5')
    .bind(body.date_from, body.date_to, nights, nowIso(), params.id).run();

  const oldRange = `${booking.date_from.slice(0, 10)}→${booking.date_to.slice(0, 10)}`;
  const newRange = `${body.date_from}→${body.date_to}`;
  await db.prepare(
    'INSERT INTO interactions (id, booking_id, direction, message_text, created_at) VALUES (?1, ?2, ?3, ?4, ?5)',
  ).bind(crypto.randomUUID(), params.id, 'note', `Dates changed from ${oldRange} to ${newRange}`, nowIso()).run();

  return Response.json({ success: true, hadExistingQuote });
};
