import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../../../lib/db';

export const prerender = false;

function centsFromPesos(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return Math.round(n * 100);
}

// Section 8 (Variable costs, collapsed by default) — three flat operator-entered
// cost fields, re-added onto bookings by migration 0010 for the simplified UI.
export const PATCH: APIRoute = async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid booking' }, { status: 422 });
  let body: { staff?: number; food?: number; transport?: number };
  try { body = await request.json(); } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const db = requireDb(locals);
  const now = nowIso();
  const updates: string[] = [];
  const values: unknown[] = [];
  try {
    if (body.staff !== undefined) { updates.push('cost_staff_cents = ?'); values.push(centsFromPesos(body.staff)); }
    if (body.food !== undefined) { updates.push('cost_food_cents = ?'); values.push(centsFromPesos(body.food)); }
    if (body.transport !== undefined) { updates.push('cost_transport_cents = ?'); values.push(centsFromPesos(body.transport)); }
  } catch {
    return Response.json({ success: false, error: 'Invalid amount' }, { status: 422 });
  }
  if (updates.length === 0) return Response.json({ success: true });

  updates.push('updated_at = ?');
  values.push(now, params.id);
  await db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  return Response.json({ success: true });
};
