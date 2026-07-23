import type { APIRoute } from 'astro';
import { formString, nowIso, redirectBack, requireDb } from '../../../../../lib/db';
import { isOneOf, GUEST_INTENT_VALUES } from '../../../../../lib/crm';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!params.id) return new Response('Missing lead id', { status: 422 });

  const form = await request.formData();
  const guestName = formString(form, 'guest_name');
  if (!guestName) return redirectBack(request, `/admin/leads/${params.id}`, { leadError: 'Name is required.' });

  const whatsapp = formString(form, 'whatsapp') || null;
  const email = formString(form, 'email') || null;
  const dateFrom = formString(form, 'date_from') || null;
  const dateTo = formString(form, 'date_to') || null;
  const adults = Number(formString(form, 'adults')) || 1;
  const children = Number(formString(form, 'children')) || 0;
  const notes = formString(form, 'notes') || null;
  const guestIntentRaw = formString(form, 'guest_intent');
  const guestIntent = isOneOf(guestIntentRaw, GUEST_INTENT_VALUES as unknown as readonly string[]) ? guestIntentRaw : null;

  await requireDb(locals).prepare(`UPDATE leads SET
      guest_name = ?1, whatsapp = ?2, email = ?3, date_from = ?4, date_to = ?5,
      adults = ?6, children = ?7, notes = ?8, guest_intent = ?9, updated_at = ?10
    WHERE id = ?11`)
    .bind(guestName, whatsapp, email, dateFrom, dateTo, adults, children, notes, guestIntent, nowIso(), params.id)
    .run();

  return redirectBack(request, `/admin/leads/${params.id}`, { saved: '1' });
};
