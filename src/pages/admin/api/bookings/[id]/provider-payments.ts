import type { APIRoute } from 'astro';
import { formString, nowIso, parseCopToCents, redirectBack, requireDb } from '../../../../../lib/db';
import { isOneOf, PROVIDER_PAYMENT_METHODS } from '../../../../../lib/crm';
export const prerender = false;
export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!params.id) return new Response('Invalid booking', { status: 422 });
  const form = await request.formData();
  const providerName = formString(form, 'provider_name');
  const service = formString(form, 'service');
  const method = formString(form, 'method');
  const paidAt = formString(form, 'paid_at');
  if (!providerName || !service || !paidAt || !isOneOf(method, PROVIDER_PAYMENT_METHODS)) {
    return new Response('Invalid provider payment', { status: 422 });
  }
  let amountCents: number;
  try {
    amountCents = parseCopToCents(formString(form, 'amount'));
  } catch {
    return new Response('Invalid amount', { status: 422 });
  }
  await requireDb(locals).prepare(`INSERT INTO provider_payments (id,booking_id,provider_name,service,amount_cents,method,paid_at,notes,created_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`)
    .bind(crypto.randomUUID(), params.id, providerName, service, amountCents, method, paidAt, formString(form, 'notes') || null, nowIso())
    .run();
  return redirectBack(request, `/admin/bookings/${params.id}`, { saved: '1' });
};
