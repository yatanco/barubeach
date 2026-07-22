export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'booked', 'lost', 'spam'] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export const CHARGE_CATEGORIES = ['accommodation', 'transport', 'food', 'extra'] as const;
export const OPERATIONAL_STATUSES = ['not_required', 'pending', 'confirmed', 'completed'] as const;

export function isOneOf<T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.includes(value as T[number]);
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

