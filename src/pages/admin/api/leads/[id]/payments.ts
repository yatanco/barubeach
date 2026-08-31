import type { APIRoute } from 'astro';
import { nowIso, requireDb, withJsonError } from '../../../../../lib/db';

export const prerender = false;

function centsFromPesos(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return Math.round(n * 100);
}

// Section 7 (Payments received) for leads. Payments always reference a charge
// row (schema constraint), so this finds-or-creates a single zero-amount
// 'extra' charge per lead to anchor every payment against — the charge's own
// amount_cents is never read; Totals/Balance are computed from the lead's
// flat accommodation/food/transport amounts instead (see the component).
export const POST: APIRoute = withJsonError(async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid lead' }, { status: 422 });
  let body: { amount?: number; method?: string; date?: string };
  try { body = await request.json(); } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  let cents: number;
  try { cents = centsFromPesos(body.amount); } catch {
    return Response.json({ success: false, error: 'Invalid amount' }, { status: 422 });
  }
  if (cents <= 0) return Response.json({ success: false, error: 'Invalid amount' }, { status: 422 });

  const db = requireDb(locals);
  const now = nowIso();
  let charge = await db.prepare(`SELECT id FROM charges WHERE lead_id = ?1 AND category = 'extra' AND description = 'Payments received' LIMIT 1`)
    .bind(params.id).first<{ id: string }>();
  let chargeId: string;
  if (charge) {
    chargeId = charge.id;
  } else {
    chargeId = crypto.randomUUID();
    await db.prepare(`INSERT INTO charges (id,lead_id,created_at,category,description,amount_cents,currency,operational_status)
      VALUES (?1,?2,?3,'extra','Payments received',0,'COP','not_required')`).bind(chargeId, params.id, now).run();
  }

  const paidAt = body.date ? `${body.date}T00:00:00Z` : now;
  await db.prepare(`INSERT INTO payments (id,charge_id,created_at,paid_at,amount_cents,method)
    VALUES (?1,?2,?3,?4,?5,?6)`).bind(crypto.randomUUID(), chargeId, now, paidAt, cents, body.method || null).run();

  return Response.json({ success: true });
});
