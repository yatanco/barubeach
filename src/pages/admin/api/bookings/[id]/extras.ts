import type { APIRoute } from 'astro';
import { nowIso, requireDb, withJsonError } from '../../../../../lib/db';
import { isOneOf } from '../../../../../lib/crm';

export const prerender = false;

const FIELDS = ['food', 'transport'] as const;

function centsFromPesos(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return Math.round(n * 100);
}

// Section 4 (Food & Transport) toggle rows — shared shape for both leads and
// bookings, since both got matching flat `${field}_amount`/`${field}_confirmed`
// columns in migration 0010.
export const PATCH: APIRoute = withJsonError(async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid booking' }, { status: 422 });
  let body: { field?: string; amount?: number; confirmed?: boolean };
  try { body = await request.json(); } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  if (!body.field || !isOneOf(body.field, FIELDS)) {
    return Response.json({ success: false, error: 'Invalid field' }, { status: 422 });
  }

  const db = requireDb(locals);
  const now = nowIso();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.confirmed !== undefined) {
    updates.push(`${body.field}_confirmed = ?`);
    values.push(body.confirmed ? 1 : 0);
  }
  if (body.amount !== undefined) {
    let cents: number;
    try { cents = centsFromPesos(body.amount); } catch {
      return Response.json({ success: false, error: 'Invalid amount' }, { status: 422 });
    }
    updates.push(`${body.field}_amount = ?`);
    values.push(cents);
  }
  if (updates.length === 0) return Response.json({ success: true });

  updates.push('updated_at = ?');
  values.push(now, params.id);
  await db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  return Response.json({ success: true });
});
