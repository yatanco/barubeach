import type { APIRoute } from 'astro';
import { formString, nowIso, parseCopToCents, redirectBack, requireDb } from '../../../../../lib/db';
import { CHARGE_CATEGORIES, isOneOf, OPERATIONAL_STATUSES } from '../../../../../lib/crm';
export const prerender = false;
export const POST: APIRoute = async ({ request, locals, params }) => {
  const form = await request.formData();
  const category = formString(form,'category');
  const operations = formString(form,'operational_status');
  const description = formString(form,'description');
  if (!params.id || !description || !isOneOf(category, CHARGE_CATEGORIES) || !isOneOf(operations, OPERATIONAL_STATUSES)) return new Response('Invalid charge', { status: 422 });
  await requireDb(locals).prepare(`INSERT INTO charges (id,booking_id,created_at,category,description,amount_cents,currency,due_date,operational_status,notes)
    VALUES (?1,?2,?3,?4,?5,?6,'COP',?7,?8,?9)`).bind(crypto.randomUUID(), params.id, nowIso(), category, description, parseCopToCents(formString(form,'amount')), formString(form,'due_date') || null, operations, formString(form,'notes') || null).run();
  return redirectBack(request, `/admin/bookings/${params.id}`, { saved:'1' });
};
