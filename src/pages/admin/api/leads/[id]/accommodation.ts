import type { APIRoute } from 'astro';
import { nowIso, requireDb, withJsonError } from '../../../../../lib/db';

export const prerender = false;

function centsFromPesos(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return Math.round(n * 100);
}

// Section 3 (Accommodation) for leads — a flat editable amount, no charge
// row involved (leads have no reservation to attach a charge to yet).
export const PATCH: APIRoute = withJsonError(async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid lead' }, { status: 422 });
  let body: { amount?: number };
  try { body = await request.json(); } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  let cents: number;
  try {
    cents = centsFromPesos(body.amount ?? 0);
  } catch {
    return Response.json({ success: false, error: 'Invalid amount' }, { status: 422 });
  }
  await requireDb(locals).prepare('UPDATE leads SET accommodation_amount = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(cents, nowIso(), params.id).run();
  return Response.json({ success: true });
});
