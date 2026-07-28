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

export const PAYMENT_LINK_PROVIDERS = ['bold', 'wompi'] as const;
export const PROVIDER_PAYMENT_METHODS = ['nequi', 'transferencia', 'efectivo'] as const;
export const PROVIDER_PAYMENT_METHOD_LABELS: Record<typeof PROVIDER_PAYMENT_METHODS[number], string> = {
  nequi: 'Nequi',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
};

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

export const QUOTE_RATES = {
  accommodationPerNight: 350,
  transportDefault: 250,
  foodPerAdultPerNight: 50,
} as const;

export const QUOTE_CURRENCIES = ['USD', 'COP'] as const;
export type QuoteCurrency = typeof QUOTE_CURRENCIES[number];

export function nightsBetween(dateFrom: string | null | undefined, dateTo: string | null | undefined): number {
  if (!dateFrom || !dateTo) return 0;
  const inMs = Date.parse(`${dateFrom.slice(0, 10)}T00:00:00Z`);
  const outMs = Date.parse(`${dateTo.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(inMs) || !Number.isFinite(outMs)) return 0;
  return Math.max(0, Math.round((outMs - inMs) / 86_400_000));
}

export function formatUsd(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatMoneyAmount(amount: number, currency: string): string {
  const locale = currency === 'COP' ? 'es-CO' : 'en-US';
  return `$${Math.round(amount).toLocaleString(locale)}`;
}

interface EstimateLead {
  quote_total?: number | string | null;
  quote_currency?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  adults?: number | null;
}

export function estimateLeadValue(lead: EstimateLead): string {
  if (lead.quote_total !== null && lead.quote_total !== undefined && lead.quote_total !== ('' as unknown)) {
    const total = Number(lead.quote_total);
    if (Number.isFinite(total) && total > 0) {
      const currency = lead.quote_currency || 'USD';
      return `${formatMoneyAmount(total, currency)} ${currency}`;
    }
  }
  const nights = nightsBetween(lead.date_from, lead.date_to);
  if (nights > 0 && lead.adults) {
    return `~${formatUsd(nights * QUOTE_RATES.accommodationPerNight)} USD`;
  }
  return '—';
}

interface QuoteLead {
  guest_name: string | null;
  date_from: string | null;
  date_to: string | null;
  adults: number;
  children: number;
  transport_included: number | null;
  food_included: number | null;
  quote_accommodation: number | null;
  quote_transport: number | null;
  quote_food: number | null;
  quote_total: number | null;
  quote_deposit: number | null;
  quote_currency: string | null;
}

function spanishDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function buildQuoteWhatsAppMessage(lead: QuoteLead): string {
  const nights = nightsBetween(lead.date_from, lead.date_to);
  const currency = lead.quote_currency || 'USD';
  const fmt = (amount: number | null) => `${formatMoneyAmount(amount || 0, currency)} ${currency}`;
  const guestLine = `👥 ${lead.adults} adultos${lead.children > 0 ? ` + ${lead.children} niños` : ''}`;
  const lines = [
    `Hola ${lead.guest_name || ''}! 🌴`,
    '',
    'Aquí está tu cotización para Casa Gaviota:',
    '',
    `📅 ${spanishDate(lead.date_from)} → ${spanishDate(lead.date_to)} (${nights} noches)`,
    guestLine,
    '',
    '💰 Desglose:',
    `🏠 Alojamiento: ${fmt(lead.quote_accommodation)}`,
  ];
  if (lead.transport_included) lines.push(`🚤 Transporte: ${fmt(lead.quote_transport)}`);
  if (lead.food_included) lines.push(`🍽️ Alimentación: ${fmt(lead.quote_food)}`);
  lines.push(
    '',
    `Total: ${fmt(lead.quote_total)}`,
    `Depósito (50%): ${fmt(lead.quote_deposit)}`,
    '',
    '¿Te parece bien? 🙏',
  );
  return lines.join('\n');
}

