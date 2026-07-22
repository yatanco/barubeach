import type { APIRoute } from 'astro';
import { formString, nowIso, redirectBack, requireDb } from '../../../../../lib/db';
import { isOneOf, LEAD_STATUSES } from '../../../../../lib/crm';
export const prerender = false;
export const POST: APIRoute = async ({ request, locals, params }) => {
  const form = await request.formData();
  const status = formString(form, 'status');
  if (!params.id || !isOneOf(status, LEAD_STATUSES)) return new Response('Invalid status', { status: 422 });
  await requireDb(locals).prepare('UPDATE leads SET status = ?1, updated_at = ?2 WHERE id = ?3').bind(status, nowIso(), params.id).run();
  return redirectBack(request, '/admin', { saved: '1' });
};
