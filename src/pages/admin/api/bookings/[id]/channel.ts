import type { APIRoute } from 'astro';
import { nowIso, requireDb, withJsonError } from '../../../../../lib/db';
import { BOOKING_CHANNELS, DEFAULT_COMMISSION_RATE, isOneOf } from '../../../../../lib/crm';

export const prerender = false;

// Section 10 (HostHub card, bookings) — channel dropdown, saves immediately.
// Airbnb payout and accommodation amount live on the accommodation.ts
// endpoint instead (Section 3), not here.
export const PATCH: APIRoute = withJsonError(async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid booking' }, { status: 422 });
  let body: { channel?: string };
  try { body = await request.json(); } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  if (!body.channel || !isOneOf(body.channel, BOOKING_CHANNELS)) {
    return Response.json({ success: false, error: 'Invalid channel' }, { status: 422 });
  }

  const db = requireDb(locals);
  const booking = await db.prepare('SELECT commission_rate FROM bookings WHERE id = ?1').bind(params.id).first<{ commission_rate: number }>();
  if (!booking) return Response.json({ success: false, error: 'Booking not found' }, { status: 404 });

  const accommodationRow = await db.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS total FROM charges WHERE booking_id = ?1 AND category = 'accommodation'`)
    .bind(params.id).first<{ total: number }>();
  const accommodationCents = accommodationRow?.total ?? 0;
  const rate = booking.commission_rate ?? DEFAULT_COMMISSION_RATE;
  const otaCommissionCents = body.channel === 'booking.com' ? Math.round(accommodationCents * (rate / 100) * 1.19) : 0;

  await db.prepare('UPDATE bookings SET channel = ?1, ota_commission_cents = ?2, updated_at = ?3 WHERE id = ?4')
    .bind(body.channel, otaCommissionCents, nowIso(), params.id).run();

  return Response.json({ success: true });
});
