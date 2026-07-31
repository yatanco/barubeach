import type { APIRoute } from 'astro';
import { formString, nowIso, requireDb } from '../../../../lib/db';
export const prerender = false;
export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData();
  const leadId = formString(form, 'lead_id');
  const reservationId = formString(form, 'reservation_id');
  const guestName = formString(form, 'guest_name');
  const dateFrom = formString(form, 'date_from');
  const dateTo = formString(form, 'date_to');
  if (!leadId || !reservationId || !guestName || !dateFrom || !dateTo || dateTo <= dateFrom) return new Response('Invalid booking', { status: 422 });
  const db = requireDb(locals);
  const id = crypto.randomUUID();
  const now = nowIso();
  const nights = Math.max(0, Math.round((Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000));
  await db.batch([
    db.prepare(`INSERT INTO bookings (id,created_at,updated_at,lead_id,reservation_id,guest_name,guest_phone,date_from,date_to,nights,adults,children,status,channel,source,notes)
      VALUES (?1,?2,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,'confirmed','direct','manual',?12)`).bind(id, now, leadId, reservationId, guestName, formString(form,'guest_phone') || null, dateFrom, dateTo, nights, Number(formString(form,'adults')) || 1, Number(formString(form,'children')) || 0, formString(form,'notes') || null),
    db.prepare("UPDATE leads SET status = 'confirmed', updated_at = ?1 WHERE id = ?2").bind(now, leadId),
  ]);
  return Response.redirect(new URL(`/admin/bookings/${id}?saved=1`, request.url), 303);
};
