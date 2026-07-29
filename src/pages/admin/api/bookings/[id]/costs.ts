import type { APIRoute } from 'astro';
import { formString, redirectBack, requireDb } from '../../../../../lib/db';
export const prerender = false;

function centsOrZero(value: string): number {
  if (!value) return 0;
  const normalized = value.replace(/[^0-9]/g, '');
  const pesos = Number.parseInt(normalized, 10);
  if (!Number.isFinite(pesos) || pesos < 0) throw new Error('Invalid amount');
  return pesos * 100;
}

export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!params.id) return new Response('Invalid booking', { status: 422 });
  const form = await request.formData();
  let costStaff: number, costFood: number, costTransport: number;
  try {
    costStaff = centsOrZero(formString(form, 'cost_staff'));
    costFood = centsOrZero(formString(form, 'cost_food'));
    costTransport = centsOrZero(formString(form, 'cost_transport'));
  } catch {
    return new Response('Invalid amount', { status: 422 });
  }
  await requireDb(locals).prepare(`UPDATE bookings SET cost_staff_cents = ?1, cost_food_cents = ?2, cost_transport_cents = ?3 WHERE id = ?4`)
    .bind(costStaff, costFood, costTransport, params.id).run();
  return redirectBack(request, `/admin/bookings/${params.id}`, { saved: '1' });
};
