import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../../lib/db';

export const prerender = false;

function centsFromPesos(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return Math.round(n * 100);
}

// Creates one new freeform "extra" revenue/cost line (the "+ Add line" row).
export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid booking' }, { status: 422 });

  let body: { description?: string; revenue?: number; cost?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!description) return Response.json({ success: false, error: 'Description is required' }, { status: 422 });

  let revenueCents: number, costCents: number;
  try {
    revenueCents = centsFromPesos(body.revenue ?? 0);
    costCents = centsFromPesos(body.cost ?? 0);
  } catch {
    return Response.json({ success: false, error: 'Invalid amount' }, { status: 422 });
  }

  const id = crypto.randomUUID();
  await requireDb(locals).prepare(`INSERT INTO charges (id,booking_id,created_at,category,description,amount_cents,cost_cents,currency,operational_status)
    VALUES (?1,?2,?3,'extra',?4,?5,?6,'COP','not_required')`)
    .bind(id, params.id, nowIso(), description, revenueCents, costCents)
    .run();
  return Response.json({ success: true, chargeId: id });
};
