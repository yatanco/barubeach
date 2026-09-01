import type { APIRoute } from 'astro';
import { formString, nowIso, redirectBack, requireDb } from '../../../../lib/db';
import { isOneOf, GUEST_INTENT_VALUES, findLeadIdByPhone } from '../../../../lib/crm';

export const prerender = false;

const EXPERIENCE_TYPES = ['daytrip', 'stay'] as const;

export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData();
  const guestName = formString(form, 'guest_name');
  const whatsapp = formString(form, 'whatsapp');
  const experienceType = formString(form, 'experience_type');

  if (!guestName || !whatsapp || !isOneOf(experienceType, EXPERIENCE_TYPES)) {
    return redirectBack(request, '/admin', { leadError: 'Name, WhatsApp and type are required.' });
  }

  const db = requireDb(locals);
  const id = crypto.randomUUID();
  const now = nowIso();
  const email = formString(form, 'email') || null;
  const dateFrom = formString(form, 'date_from') || null;
  const dateTo = experienceType === 'stay' ? formString(form, 'date_to') || null : null;
  const adults = Number(formString(form, 'adults')) || 2;
  const children = Number(formString(form, 'children')) || 0;
  const notes = formString(form, 'notes') || null;
  const guestIntentRaw = formString(form, 'guest_intent');
  const guestIntent = isOneOf(guestIntentRaw, GUEST_INTENT_VALUES as unknown as readonly string[]) ? guestIntentRaw : null;

  // Deduplicate by phone number before inserting. If a lead already exists with
  // the same number (format- and country-code-insensitive), redirect to it
  // instead of creating a duplicate — the operator can update whatever is
  // missing from the detail page.
  const existingId = await findLeadIdByPhone(db, whatsapp);
  if (existingId) {
    return Response.redirect(new URL(`/admin/leads/${existingId}?notice=already_exists`, request.url), 303);
  }

  await db.prepare(`
    INSERT INTO leads (
      id, created_at, updated_at, status, source, language, experience_type,
      guest_name, whatsapp, email, date_from, date_to, adults, children, guest_intent, notes, raw_payload
    ) VALUES (?1, ?2, ?2, 'new', 'whatsapp_history', 'es', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
  `).bind(
    id, now, experienceType, guestName, whatsapp, email, dateFrom, dateTo, adults, children, guestIntent, notes,
    JSON.stringify({ guest_name: guestName, whatsapp, email, experience_type: experienceType, date_from: dateFrom, date_to: dateTo, adults, children, guest_intent: guestIntent, notes }),
  ).run();

  return Response.redirect(new URL(`/admin/leads/${id}?notice=created`, request.url), 303);
};
