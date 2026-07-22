import type { APIRoute } from 'astro';
import { formString, redirectBack, requireDb } from '../../../../../lib/db';
import { isOneOf, OPERATIONAL_STATUSES } from '../../../../../lib/crm';
export const prerender = false;
export const POST: APIRoute = async ({ request, locals, params }) => {
  const form = await request.formData();
  const status = formString(form,'operational_status');
  if (!params.id || !isOneOf(status, OPERATIONAL_STATUSES)) return new Response('Invalid status', { status: 422 });
  await requireDb(locals).prepare('UPDATE charges SET operational_status = ?1 WHERE id = ?2').bind(status, params.id).run();
  return redirectBack(request, '/admin', { saved:'1' });
};
