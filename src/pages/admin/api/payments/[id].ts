import type { APIRoute } from 'astro';
import { requireDb, withJsonError } from '../../../../lib/db';

export const prerender = false;

// Removes a single payment row (the [✕] on a Payments Received line). Not
// entity-scoped — payments.id is globally unique, so no lead/booking id
// needed on the route.
export const DELETE: APIRoute = withJsonError(async ({ locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid payment' }, { status: 422 });
  await requireDb(locals).prepare('DELETE FROM payments WHERE id = ?1').bind(params.id).run();
  return Response.json({ success: true });
});
