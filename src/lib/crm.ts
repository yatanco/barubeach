// Unified status pipeline — leads and bookings share one status set (migration 0010).
// 'checked_in' is a legacy value still written directly by hosthub-sync.ts (not touched
// by this task); it is treated everywhere as a display/pipeline synonym for 'in_house'.
export const UNIFIED_STATUSES = [
  'new', 'replied', 'quoted', 'deposit_requested', 'deposit_paid',
  'confirmed', 'upsell_pending', 'upsell_confirmed',
  'in_house', 'balance_requested', 'completed',
  'lost', 'cancelled',
] as const;
export type UnifiedStatus = typeof UNIFIED_STATUSES[number];
export type StoredStatus = UnifiedStatus | 'checked_in';

export const STATUS_LABELS: Record<StoredStatus, string> = {
  new: 'New',
  replied: 'Replied',
  quoted: 'Quoted',
  deposit_requested: 'Deposit Requested',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  upsell_pending: 'Upsell Pending',
  upsell_confirmed: 'Upsell Confirmed',
  in_house: 'In House',
  checked_in: 'In House',
  balance_requested: 'Balance Requested',
  completed: 'Completed',
  lost: 'Lost',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<StoredStatus, string> = {
  new: '#6B7280',
  replied: '#06B6D4',
  quoted: '#3B82F6',
  deposit_requested: '#F59E0B',
  deposit_paid: '#8B5CF6',
  confirmed: '#22C55E',
  upsell_pending: '#6B7280',
  upsell_confirmed: '#0D9488',
  in_house: '#3B82F6',
  checked_in: '#3B82F6',
  balance_requested: '#F97316',
  completed: '#0D9488',
  lost: '#EF4444',
  cancelled: '#EF4444',
};

// Tap-through pill sequence shown on the detail page. Bookings are chosen by
// channel; leads always use LEAD_PIPELINE regardless of channel (a lead has
// none yet). Direct/Booking.com bookings start at 'new'; Airbnb bookings
// arrive pre-confirmed via HostHub sync and skip straight to 'confirmed'.
// 'confirmed' is included on DIRECT_PIPELINE too (not just AIRBNB_PIPELINE)
// because hosthub-sync.ts's deriveStatus() is channel-agnostic — a direct or
// booking.com reservation synced from HostHub can land in 'confirmed' just
// from its dates, same as an Airbnb one.
export const DIRECT_PIPELINE = [
  'new', 'quoted', 'deposit_requested', 'deposit_paid', 'confirmed',
  'in_house', 'balance_requested', 'completed',
  'lost', 'cancelled',
] as const;
export const AIRBNB_PIPELINE = [
  'confirmed', 'upsell_pending', 'upsell_confirmed',
  'in_house', 'balance_requested', 'completed',
  'cancelled',
] as const;
// Lead-only pipeline — deliberately decoupled from DIRECT_PIPELINE (used by
// direct/booking.com bookings) so adding 'replied' here doesn't also surface
// it as a selectable status on bookings. 'confirmed' is intentionally
// omitted: a lead converts into a real booking row before that stage applies
// (see the "Confirm booking" flow), so leads jump straight from
// deposit_paid to in_house.
export const LEAD_PIPELINE = [
  'new', 'replied', 'quoted', 'deposit_requested', 'deposit_paid',
  'in_house', 'balance_requested', 'completed',
  'lost', 'cancelled',
] as const;

export function pipelineFor(kind: 'lead' | 'booking', channel: string | null | undefined): readonly UnifiedStatus[] {
  if (kind === 'lead') return LEAD_PIPELINE;
  return channel === 'airbnb' ? AIRBNB_PIPELINE : DIRECT_PIPELINE;
}

// Normalizes the legacy 'checked_in' value hosthub-sync.ts still writes onto the
// unified 'in_house' status, so pill-matching logic never needs a special case for it.
export function normalizeStatus(status: string): UnifiedStatus {
  return status === 'checked_in' ? 'in_house' : (status as UnifiedStatus);
}

// Statuses shown on the dashboard's active-pipeline view (i.e. not yet arrived/departed
// and not a dead end) — used to distinguish "in progress" records from completed/lost/cancelled.
export const OPEN_STATUSES = [
  'new', 'replied', 'quoted', 'deposit_requested', 'deposit_paid',
  'confirmed', 'upsell_pending', 'upsell_confirmed',
  'in_house', 'checked_in', 'balance_requested',
] as const;

export const GUEST_INTENTS = [
  { value: 'family_vacation', label: 'Family Vacation' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'work_retreat', label: 'Work Retreat' },
  { value: 'friends', label: 'Friends' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'day_trip', label: 'Day Trip' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'other', label: 'Other' },
] as const;
export const GUEST_INTENT_VALUES = GUEST_INTENTS.map((i) => i.value);

export const BOOKING_CHANNELS = ['direct', 'airbnb', 'booking.com', 'other'] as const;
export const BOOKING_CHANNEL_LABELS: Record<typeof BOOKING_CHANNELS[number], string> = {
  direct: 'Direct',
  airbnb: 'Airbnb',
  'booking.com': 'Booking.com',
  other: 'Other',
};
// Short uppercase labels for the compact channel pill shown next to the BOOKING/LEAD type pill.
export const CHANNEL_PILL_LABELS: Record<typeof BOOKING_CHANNELS[number], string> = {
  direct: 'DIRECT',
  airbnb: 'AIRBNB',
  'booking.com': 'BK.COM',
  other: 'OTHER',
};
export const BOOKING_SOURCES = ['manual', 'hosthub_ical'] as const;
export const DEFAULT_COMMISSION_RATE = 18;
export const DEFAULT_DEPOSIT_PERCENT = 50;

// Payments Received method dropdown (Section 7 of the unified detail page).
export const PAYMENT_METHODS = ['Transferencia', 'Nequi', 'Bold', 'Efectivo', 'Airbnb', 'BK.COM'] as const;

export function isOneOf<T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.includes(value as T[number]);
}

export function channelBadgeClass(channel: string): string {
  return channel.replace(/[^a-z0-9]/gi, '');
}

export function money(cents: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return 'never';
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function waLinkTo(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '');
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}

export function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(dateFrom: string | null | undefined, dateTo: string | null | undefined): number {
  if (!dateFrom || !dateTo) return 0;
  const inMs = Date.parse(`${dateFrom.slice(0, 10)}T00:00:00Z`);
  const outMs = Date.parse(`${dateTo.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(inMs) || !Number.isFinite(outMs)) return 0;
  return Math.max(0, Math.round((outMs - inMs) / 86_400_000));
}

