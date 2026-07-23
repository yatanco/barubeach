export const LEAD_STATUSES = ['new', 'quoted', 'deposit', 'booked', 'completed', 'lost', 'spam'] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export const PIPELINE_STATUSES = ['new', 'quoted', 'deposit', 'booked', 'completed'] as const;
export const PIPELINE_LABELS: Record<typeof PIPELINE_STATUSES[number], string> = {
  new: 'New',
  quoted: 'Quoted',
  deposit: 'Deposit',
  booked: 'Booked',
  completed: 'Completed',
};

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

export const CHARGE_CATEGORIES = ['accommodation', 'transport', 'food', 'boat', 'extra'] as const;
export const OPERATIONAL_STATUSES = ['not_required', 'pending', 'confirmed', 'completed'] as const;

export const BOOKING_STATUSES = ['confirmed', 'checked_in', 'completed', 'cancelled'] as const;
export const BOOKING_CHANNELS = ['direct', 'airbnb', 'booking.com'] as const;
export const BOOKING_SOURCES = ['manual', 'hosthub_ical'] as const;

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

