import type { APIRoute } from 'astro';
import { formString, nowIso, redirectBack, requireDb } from '../../../../../lib/db';
import { BOOKING_CHANNELS, DEFAULT_COMMISSION_RATE, isOneOf } from '../../../../../lib/crm';
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
  const db = requireDb(locals);
  const booking = await db.prepare('SELECT source FROM bookings WHERE id = ?1').bind(params.id).first<{ source: string }>();
  if (!booking) return new Response('Booking not found', { status: 404 });

  const form = await request.formData();
  const channel = formString(form, 'channel');
  if (!isOneOf(channel, BOOKING_CHANNELS)) return new Response('Invalid channel', { status: 422 });

  const rateRaw = formString(form, 'commission_rate');
  const commissionRate = rateRaw ? Number(rateRaw) : DEFAULT_COMMISSION_RATE;
  if (!Number.isFinite(commissionRate) || commissionRate < 0) return new Response('Invalid commission rate', { status: 422 });

  let airbnbPayoutCents: number;
  try {
    airbnbPayoutCents = centsOrZero(formString(form, 'airbnb_payout'));
  } catch {
    return new Response('Invalid amount', { status: 422 });
  }

  // HostHub owns dates for synced bookings — re-syncing would silently overwrite a manual
  // edit here, so only manually-created bookings can have their dates changed on this form.
  const dateFrom = formString(form, 'date_from');
  const dateTo = formString(form, 'date_to');
  const canEditDates = booking.source === 'manual' && dateFrom && dateTo;
  if (booking.source === 'manual' && dateFrom && dateTo && dateTo <= dateFrom) {
    return new Response('Check-out must be after check-in', { status: 422 });
  }

  const accommodationRow = await db.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS total FROM charges WHERE booking_id = ?1 AND category = 'accommodation'`)
    .bind(params.id).first<{ total: number }>();
  const accommodationCents = accommodationRow?.total ?? 0;
  const otaCommissionCents = channel === 'booking.com' ? Math.round(accommodationCents * (commissionRate / 100) * 1.19) : 0;

  const now = nowIso();
  if (canEditDates) {
    const nights = Math.max(0, Math.round((Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000));
    await db.prepare(`UPDATE bookings SET channel=?1, commission_rate=?2, airbnb_payout_cents=?3, ota_commission_cents=?4, date_from=?5, date_to=?6, nights=?7, updated_at=?8 WHERE id=?9`)
      .bind(channel, commissionRate, airbnbPayoutCents, otaCommissionCents, dateFrom, dateTo, nights, now, params.id)
      .run();
  } else {
    await db.prepare(`UPDATE bookings SET channel=?1, commission_rate=?2, airbnb_payout_cents=?3, ota_commission_cents=?4, updated_at=?5 WHERE id=?6`)
      .bind(channel, commissionRate, airbnbPayoutCents, otaCommissionCents, now, params.id)
      .run();
  }

  return redirectBack(request, `/admin/bookings/${params.id}`, { saved: '1' });
};
