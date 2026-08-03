import type { APIRoute } from 'astro';
import { requireDb } from '../../../../lib/db';

export const prerender = false;

const ALLOWED_STATUSES = ['delivered', 'cancelled'] as const;

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  let body: { status?: string };
  try { body = await request.json(); } catch {
    return Response.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
  const status = body.status || '';
  if (!params.id || !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
    return Response.json({ success: false, error: 'Invalid status' }, { status: 422 });
  }
  await requireDb(locals).prepare('UPDATE drinks_orders SET status = ?1 WHERE id = ?2')
    .bind(status, params.id).run();
  return Response.json({ success: true, status });
};
