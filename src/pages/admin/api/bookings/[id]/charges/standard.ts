import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../../lib/db';
import { DEFAULT_COMMISSION_RATE, isOneOf } from '../../../../../../lib/crm';

export const prerender = false;

const STANDARD_CATEGORIES = ['accommodation', 'food', 'transport'] as const;
const STANDARD_LABELS: Record<typeof STANDARD_CATEGORIES[number], string> = {
  accommodation: 'Accommodation', food: 'Food', transport: 'Transport',
};

function centsFromPesos(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return Math.round(n * 100);
}

// Upserts the single canonical charge for one of the three standard revenue
// rows (Accommodation/Food/Transport) on the booking detail table. Every
// later edit to that same row goes through /admin/api/charges/[id]/amounts
// once the client knows the charge id — this endpoint only ever runs once
// per row, the first time it's given a non-empty value.
export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid booking' }, { status: 422 });
  const db = requireDb(locals);

  let body: { category?: string; revenue?: number; cost?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const category = body.category;
  if (!category || !isOneOf(category, STANDARD_CATEGORIES)) {
    return Response.json({ success: false, error: 'Invalid category' }, { status: 422 });
  }

  let revenueCents: number, costCents: number;
  try {
    revenueCents = centsFromPesos(body.revenue ?? 0);
    costCents = centsFromPesos(body.cost ?? 0);
  } catch {
    return Response.json({ success: false, error: 'Invalid amount' }, { status: 422 });
  }

  const existing = await db.prepare(`SELECT id, (SELECT COALESCE(SUM(p.amount_cents),0) FROM payments p WHERE p.charge_id = charges.id) AS paid_cents
      FROM charges WHERE booking_id = ?1 AND category = ?2 LIMIT 1`)
    .bind(params.id, category).first<{ id: string; paid_cents: number }>();

  let chargeId: string;
  if (existing) {
    if (revenueCents < existing.paid_cents) {
      return Response.json({ success: false, error: `Revenue can't be less than the ${existing.paid_cents / 100} already received` }, { status: 422 });
    }
    await db.prepare('UPDATE charges SET amount_cents = ?1, cost_cents = ?2 WHERE id = ?3')
      .bind(revenueCents, costCents, existing.id).run();
    chargeId = existing.id;
  } else {
    chargeId = crypto.randomUUID();
    await db.prepare(`INSERT INTO charges (id,booking_id,created_at,category,description,amount_cents,cost_cents,currency,operational_status)
      VALUES (?1,?2,?3,?4,?5,?6,?7,'COP','not_required')`)
      .bind(chargeId, params.id, nowIso(), category, STANDARD_LABELS[category], revenueCents, costCents)
      .run();
  }

  // Accommodation revenue drives the Booking.com commission — keep the persisted
  // ota_commission_cents in sync so Net Contribution never lags behind this edit.
  if (category === 'accommodation') {
    const booking = await db.prepare('SELECT channel, commission_rate FROM bookings WHERE id = ?1')
      .bind(params.id).first<{ channel: string; commission_rate: number }>();
    if (booking) {
      const rate = booking.commission_rate ?? DEFAULT_COMMISSION_RATE;
      const otaCommissionCents = booking.channel === 'booking.com' ? Math.round(revenueCents * (rate / 100) * 1.19) : 0;
      await db.prepare('UPDATE bookings SET ota_commission_cents = ?1 WHERE id = ?2').bind(otaCommissionCents, params.id).run();
    }
  }

  return Response.json({ success: true, chargeId });
};
