import type { APIRoute } from 'astro';
import { nowIso, requireDb, withJsonError } from '../../../../../lib/db';
import { DEFAULT_COMMISSION_RATE } from '../../../../../lib/crm';

export const prerender = false;

function centsFromPesos(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return Math.round(n * 100);
}

// Section 3 (Accommodation) for bookings. Direct/Booking.com: upserts the
// booking's single accommodation charge (source of truth stays charge-based
// for bookings — see migration 0010's comment on why). Airbnb: accommodation
// is paid directly by Airbnb, so this instead records the payout amount.
export const PATCH: APIRoute = withJsonError(async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid booking' }, { status: 422 });
  let body: { amount?: number; airbnbPayout?: number };
  try { body = await request.json(); } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  const db = requireDb(locals);
  const now = nowIso();

  if (typeof body.airbnbPayout === 'number' || typeof body.airbnbPayout === 'string') {
    let cents: number;
    try { cents = centsFromPesos(body.airbnbPayout); } catch {
      return Response.json({ success: false, error: 'Invalid amount' }, { status: 422 });
    }
    await db.prepare('UPDATE bookings SET airbnb_payout_cents = ?1, updated_at = ?2 WHERE id = ?3').bind(cents, now, params.id).run();
    return Response.json({ success: true });
  }

  let cents: number;
  try { cents = centsFromPesos(body.amount ?? 0); } catch {
    return Response.json({ success: false, error: 'Invalid amount' }, { status: 422 });
  }

  const existing = await db.prepare(`SELECT id, (SELECT COALESCE(SUM(p.amount_cents),0) FROM payments p WHERE p.charge_id = charges.id) AS paid_cents
      FROM charges WHERE booking_id = ?1 AND category = 'accommodation' LIMIT 1`)
    .bind(params.id).first<{ id: string; paid_cents: number }>();
  if (existing && cents < existing.paid_cents) {
    return Response.json({ success: false, error: `Amount can't be less than the ${existing.paid_cents / 100} already received` }, { status: 422 });
  }

  if (existing) {
    await db.prepare('UPDATE charges SET amount_cents = ?1 WHERE id = ?2').bind(cents, existing.id).run();
  } else {
    await db.prepare(`INSERT INTO charges (id,booking_id,created_at,category,description,amount_cents,currency,operational_status)
      VALUES (?1,?2,?3,'accommodation','Accommodation',?4,'COP','not_required')`)
      .bind(crypto.randomUUID(), params.id, now, cents).run();
  }

  const booking = await db.prepare('SELECT channel, commission_rate FROM bookings WHERE id = ?1')
    .bind(params.id).first<{ channel: string; commission_rate: number }>();
  if (booking) {
    const rate = booking.commission_rate ?? DEFAULT_COMMISSION_RATE;
    const otaCommissionCents = booking.channel === 'booking.com' ? Math.round(cents * (rate / 100) * 1.19) : 0;
    await db.prepare('UPDATE bookings SET ota_commission_cents = ?1, updated_at = ?2 WHERE id = ?3').bind(otaCommissionCents, now, params.id).run();
  }

  return Response.json({ success: true });
});
