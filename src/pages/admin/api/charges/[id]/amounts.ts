import type { APIRoute } from 'astro';
import { requireDb } from '../../../../../lib/db';
import { DEFAULT_COMMISSION_RATE } from '../../../../../lib/crm';

export const prerender = false;

function centsFromPesos(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return Math.round(n * 100);
}

// Updates an existing charge's revenue/cost in place — used for every edit
// after a row's first save (both standard rows and freeform extra lines).
export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid charge' }, { status: 422 });
  const db = requireDb(locals);

  let body: { revenue?: number; cost?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  let revenueCents: number, costCents: number;
  try {
    revenueCents = centsFromPesos(body.revenue ?? 0);
    costCents = centsFromPesos(body.cost ?? 0);
  } catch {
    return Response.json({ success: false, error: 'Invalid amount' }, { status: 422 });
  }

  const charge = await db.prepare(`SELECT booking_id, category, (SELECT COALESCE(SUM(p.amount_cents),0) FROM payments p WHERE p.charge_id = charges.id) AS paid_cents
      FROM charges WHERE id = ?1`).bind(params.id).first<{ booking_id: string; category: string; paid_cents: number }>();
  if (!charge) return Response.json({ success: false, error: 'Charge not found' }, { status: 404 });
  if (revenueCents < charge.paid_cents) {
    return Response.json({ success: false, error: `Revenue can't be less than the ${charge.paid_cents / 100} already received` }, { status: 422 });
  }

  await db.prepare('UPDATE charges SET amount_cents = ?1, cost_cents = ?2 WHERE id = ?3')
    .bind(revenueCents, costCents, params.id).run();

  // Accommodation revenue drives the Booking.com commission — keep the persisted
  // ota_commission_cents in sync so Net Contribution never lags behind this edit.
  if (charge.category === 'accommodation') {
    const booking = await db.prepare('SELECT channel, commission_rate FROM bookings WHERE id = ?1')
      .bind(charge.booking_id).first<{ channel: string; commission_rate: number }>();
    if (booking) {
      const rate = booking.commission_rate ?? DEFAULT_COMMISSION_RATE;
      const otaCommissionCents = booking.channel === 'booking.com' ? Math.round(revenueCents * (rate / 100) * 1.19) : 0;
      await db.prepare('UPDATE bookings SET ota_commission_cents = ?1 WHERE id = ?2').bind(otaCommissionCents, charge.booking_id).run();
    }
  }

  return Response.json({ success: true });
};
