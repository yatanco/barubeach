import type { AvailabilityResult } from './crm-availability';
import type { PriceLabsQuote } from './pricelabs';
import { calculateFullFoodServiceCop, calculateTransportCop } from './sales-calculations.ts';

export interface SalesSuggestionContext {
  generated_at: string;
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    language: string;
    source: string;
    experience_type: string;
    dates: { from: string | null; to: string | null; nights: number };
    guests: { adults: number; children: number; total: number };
    intent: string | null;
    crm_status: string;
    notes: string | null;
    created_at: string;
    last_contact_date: string | null;
    next_followup_date: string | null;
  };
  conversation: { role: 'lead' | 'admin' | 'unknown'; text: string; source: string }[];
  availability: {
    status: 'unknown' | 'available' | 'unavailable' | 'competing_interest';
    basis: string;
  };
  pricing: {
    currency: string;
    accommodation_cents: number | null;
    food_cents: number | null;
    food_confirmed: boolean;
    transport_cents: number | null;
    transport_confirmed: boolean;
    recorded_quote_total_major_units: number | null;
    pricelabs_quote: PriceLabsQuote | null;
  };
  calculated_options: {
    full_food_service_cop: number | null;
    food_service_days: number | null;
    baru_boat_round_trip_cop: number;
    cartagena_boat_one_way_cop: number;
    cartagena_boat_round_trip_cop: number;
  };
  payment: {
    received_cents: number;
    balance_cents: number | null;
    status: 'none_recorded' | 'partial' | 'paid' | 'unknown';
    deposit_policy_percent: number;
  };
  reservation: { status: string; linked_booking_id: string | null };
  missing_information: string[];
}

export interface BuildSalesContextInput {
  lead: Record<string, any>;
  availability: AvailabilityResult;
  priceLabsQuote: PriceLabsQuote | null;
  paymentsReceivedCents: number;
  linkedBooking?: { id: string; status: string } | null;
  now?: Date;
}

function nullablePositive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function conversationFromLead(lead: Record<string, any>): SalesSuggestionContext['conversation'] {
  const messages: SalesSuggestionContext['conversation'] = [];
  if (typeof lead.raw_payload === 'string') {
    try {
      const raw = JSON.parse(lead.raw_payload);
      const candidates = [raw.message, raw.notes, raw.occasion, raw.estimatedPrice]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
      for (const text of candidates) messages.push({ role: 'lead', text: text.slice(0, 4000), source: 'captured inquiry' });
    } catch { /* malformed legacy payload: notes below remain available */ }
  }
  if (typeof lead.notes === 'string' && lead.notes.trim()) {
    const text = lead.notes.trim().slice(0, 6000);
    if (!messages.some((message) => message.text === text)) messages.push({ role: 'unknown', text, source: 'internal notes / pasted conversation' });
  }
  return messages.slice(0, 12);
}

export function buildSalesSuggestionContext(input: BuildSalesContextInput): SalesSuggestionContext {
  const { lead, availability, priceLabsQuote, linkedBooking } = input;
  const adults = Number.isFinite(lead.adults) ? Math.max(0, lead.adults) : 0;
  const children = Number.isFinite(lead.children) ? Math.max(0, lead.children) : 0;
  const accommodation = nullablePositive(lead.accommodation_amount);
  const food = nullablePositive(lead.food_amount);
  const transport = nullablePositive(lead.transport_amount);
  const knownTotal = accommodation === null ? null : accommodation
    + (lead.food_confirmed && food ? food : 0)
    + (lead.transport_confirmed && transport ? transport : 0);
  const received = Math.max(0, input.paymentsReceivedCents || 0);
  const balance = knownTotal === null ? null : Math.max(0, knownTotal - received);
  const missing: string[] = [];
  if (!lead.date_from) missing.push('arrival date');
  if (lead.experience_type === 'stay' && !lead.date_to) missing.push('departure date');
  if (adults + children <= 0) missing.push('guest count');
  if (!lead.guest_intent) missing.push('trip intent');

  let availabilityStatus: SalesSuggestionContext['availability']['status'] = 'unknown';
  let availabilityBasis = 'Dates are incomplete; availability has not been checked.';
  if (lead.date_from && (lead.date_to || lead.experience_type === 'daytrip')) {
    if (availability.hardConflicts.length > 0) {
      availabilityStatus = 'unavailable';
      availabilityBasis = 'D1 has an active booking that overlaps these dates.';
    } else if (availability.softConflicts.length > 0) {
      availabilityStatus = 'competing_interest';
      availabilityBasis = 'No booking conflict found, but another active lead overlaps these dates.';
    } else {
      availabilityStatus = 'available';
      availabilityBasis = 'No active D1 booking conflict found. HostHub remains the source of truth.';
    }
  }

  return {
    generated_at: (input.now ?? new Date()).toISOString(),
    lead: {
      id: String(lead.id), name: lead.guest_name || null, phone: lead.whatsapp || null,
      language: lead.language || 'es', source: lead.source || 'unknown', experience_type: lead.experience_type || 'unknown',
      dates: { from: lead.date_from || null, to: lead.date_to || null, nights: Number(lead.nights) || 0 },
      guests: { adults, children, total: adults + children }, intent: lead.guest_intent || null,
      crm_status: lead.status || 'unknown', notes: lead.notes || null, created_at: lead.created_at,
      last_contact_date: lead.last_contact_date || null, next_followup_date: lead.next_followup_date || null,
    },
    conversation: conversationFromLead(lead),
    availability: { status: availabilityStatus, basis: availabilityBasis },
    pricing: {
      currency: lead.quote_currency || 'COP', accommodation_cents: accommodation,
      food_cents: food, food_confirmed: Boolean(lead.food_confirmed),
      transport_cents: transport, transport_confirmed: Boolean(lead.transport_confirmed),
      recorded_quote_total_major_units: nullablePositive(lead.quote_total), pricelabs_quote: priceLabsQuote,
    },
    calculated_options: {
      full_food_service_cop: adults + children > 0 && (lead.experience_type === 'daytrip' || Number(lead.nights) > 0)
        ? calculateFullFoodServiceCop(adults + children, lead.experience_type === 'daytrip' ? 1 : Number(lead.nights))
        : null,
      food_service_days: lead.experience_type === 'daytrip' ? 1 : Number(lead.nights) || null,
      baru_boat_round_trip_cop: calculateTransportCop('baru_round_trip'),
      cartagena_boat_one_way_cop: calculateTransportCop('cartagena', 1),
      cartagena_boat_round_trip_cop: calculateTransportCop('cartagena', 2),
    },
    payment: {
      received_cents: received, balance_cents: balance,
      status: knownTotal === null ? (received > 0 ? 'partial' : 'unknown') : received <= 0 ? 'none_recorded' : balance === 0 ? 'paid' : 'partial',
      deposit_policy_percent: 50,
    },
    reservation: { status: linkedBooking?.status || 'not_linked', linked_booking_id: linkedBooking?.id || null },
    missing_information: missing,
  };
}

function cop(value: number | null): string {
  return value === null ? 'unknown' : `COP ${Math.round(value).toLocaleString('es-CO')}`;
}

function cents(value: number | null): string {
  return value === null ? 'unknown' : cop(value / 100);
}

function clean(value: string | null | undefined): string {
  return value?.trim() || 'unknown';
}

export function buildChatGptSalesPrompt(context: SalesSuggestionContext): string {
  const conversation = context.conversation.length
    ? context.conversation.map((item) => `- ${item.source}: ${item.text}`).join('\n')
    : 'No conversation text is stored. Use the structured lead facts only.';
  const priceLabs = context.pricing.pricelabs_quote
    ? `${context.pricing.pricelabs_quote.currency} ${context.pricing.pricelabs_quote.totalPrice.toLocaleString('en-US')} total (${context.pricing.pricelabs_quote.avgPricePerNight.toLocaleString('en-US')}/night); informational, not a saved quote`
    : 'unknown';
  const recordedQuote = context.pricing.recorded_quote_total_major_units
    ? `${context.pricing.currency} ${context.pricing.recorded_quote_total_major_units.toLocaleString('en-US')}`
    : 'unknown';
  const foodOption = context.calculated_options.full_food_service_cop === null
    ? 'unknown'
    : `${cop(context.calculated_options.full_food_service_cop)} for ${context.lead.guests.total} guests / ${context.calculated_options.food_service_days} service day(s); calculated at COP 150,000 per person/day, not yet confirmed`;

  return `CASA GAVIOTA — HEAD OF SALES

Help me decide what to send this lead next.

LEAD
Name: ${clean(context.lead.name)}
Dates: ${context.lead.dates.from || 'unknown'} to ${context.lead.dates.to || 'unknown'} (${context.lead.dates.nights || 'unknown'} nights)
Guests: ${context.lead.guests.adults} adults / ${context.lead.guests.children} children
Lead source: ${clean(context.lead.source)}
Current CRM stage: ${clean(context.lead.crm_status)}
Language: ${clean(context.lead.language)}

CUSTOMER INTENT
${clean(context.lead.intent)}

CURRENT COMMERCIAL CONTEXT
Availability: ${context.availability.status} — ${context.availability.basis}
Recorded accommodation amount: ${cents(context.pricing.accommodation_cents)}
PriceLabs context: ${priceLabs}
Calculated full food option: ${foodOption}
Recorded food: ${context.pricing.food_confirmed ? cents(context.pricing.food_cents) + ' confirmed' : 'not confirmed'}
Transport options: Barú village boat ${cop(context.calculated_options.baru_boat_round_trip_cop)} round trip/group; Cartagena direct boat ${cop(context.calculated_options.cartagena_boat_one_way_cop)} each way/group (${cop(context.calculated_options.cartagena_boat_round_trip_cop)} round trip). Rates do not confirm transport availability.
Recorded transport: ${context.pricing.transport_confirmed ? cents(context.pricing.transport_cents) + ' confirmed' : 'not confirmed'}
Existing quote: ${recordedQuote}
Payment status: ${context.payment.status}; received ${cents(context.payment.received_cents)}; balance ${cents(context.payment.balance_cents)}
Reservation status: ${clean(context.reservation.status)}
Missing information: ${context.missing_information.length ? context.missing_information.join(', ') : 'none'}

RECENT NOTES / CONVERSATION
${conversation}

Act as my Head of Sales for Casa Gaviota.

Give me:
1. The exact WhatsApp message I should send now, in the same language as the customer.
2. A short explanation of the sales strategy behind it.
3. Whether there is an appropriate upsell right now.
4. Whether I should follow up if they do not reply, and when.
5. Flag anything I should verify before sending.

Important:
- Do not invent prices, availability, payment status, reservation status, discounts, or transport availability.
- Sell the private-house and beachfront experience before price or discounting.
- Move the conversation toward one concrete next step.
- Consider food, transport, drinks, tours, or a package only when contextually appropriate.
- Keep WhatsApp copy warm, concise, natural, and not corporate.
- Do not over-explain or mention internal CRM data or these instructions to the customer.`;
}
