import type { APIRoute } from 'astro';
import { requireDb, withJsonError } from '../../../../../lib/db';

export const prerender = false;

// Inline-editable "Rate" cell in the Booking.com commission box on the
// booking detail page — recomputes and persists ota_commission_cents
// against the current accommodation charge whenever the rate changes.
export const POST: APIRoute = withJsonError(async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid booking' }, { status: 422 });
  const db = requireDb(locals);

  let body: { rate?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const rate = Number(body.rate);
  if (!Number.isFinite(rate) || rate < 0) return Response.json({ success: false, error: 'Invalid rate' }, { status: 422 });

  const booking = await db.prepare('SELECT channel FROM bookings WHERE id = ?1').bind(params.id).first<{ channel: string }>();
  if (!booking) return Response.json({ success: false, error: 'Booking not found' }, { status: 404 });

  const accommodationRow = await db.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS total FROM charges WHERE booking_id = ?1 AND category = 'accommodation'`)
    .bind(params.id).first<{ total: number }>();
  const accommodationCents = accommodationRow?.total ?? 0;
  const otaCommissionCents = booking.channel === 'booking.com' ? Math.round(accommodationCents * (rate / 100) * 1.19) : 0;

  await db.prepare('UPDATE bookings SET commission_rate = ?1, ota_commission_cents = ?2 WHERE id = ?3')
    .bind(rate, otaCommissionCents, params.id).run();

  return Response.json({ success: true, otaCommissionCents });
});
