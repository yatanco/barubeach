import type { AvailabilityResult } from './crm-availability';
import type { PriceLabsQuote } from './pricelabs';
import { calculateFullFoodServiceCop, calculateTransportCop, COMMERCIAL_RATES_COP } from './sales-calculations.ts';
import { GUEST_INTENTS, DEFAULT_DEPOSIT_PERCENT } from './crm.ts';

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
      deposit_policy_percent: DEFAULT_DEPOSIT_PERCENT,
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
  const priceLabsLine = context.pricing.pricelabs_quote
    ? `${context.pricing.pricelabs_quote.currency} ${context.pricing.pricelabs_quote.totalPrice.toLocaleString('en-US')} total (${context.pricing.pricelabs_quote.avgPricePerNight.toLocaleString('en-US')}/night); informational, not a saved quote`
    : null;
  const recordedQuote = context.pricing.recorded_quote_total_major_units
    ? `${context.pricing.currency} ${context.pricing.recorded_quote_total_major_units.toLocaleString('en-US')}`
    : 'unknown';
  // context.lead.intent is the raw guest_intent value (e.g. 'family_vacation') —
  // map it through the same label table the lean prompt uses instead of printing
  // the snake_case code straight to the model.
  const intentLabel = context.lead.intent ? (GUEST_INTENT_LABELS[context.lead.intent] || context.lead.intent) : 'unknown';

  // One line, not two: the old "Recorded food: not confirmed" line said nothing
  // the calculated line's own "not yet confirmed" hadn't already said, and when
  // food *was* confirmed the calculated line still claimed "not yet confirmed"
  // right next to "Recorded food: ... confirmed" — a direct contradiction.
  const foodLine = context.pricing.food_confirmed
    ? `${cents(context.pricing.food_cents)} confirmed`
    : context.calculated_options.full_food_service_cop === null
      ? 'unknown'
      : `${cop(context.calculated_options.full_food_service_cop)} for ${context.lead.guests.total} guests / ${context.calculated_options.food_service_days} service day(s); calculated at COP ${COMMERCIAL_RATES_COP.foodPerPersonPerServiceDay.toLocaleString('en-US')} per person/day, not yet confirmed`;

  // Nothing has happened financially yet on a fresh lead — spelling out
  // "unknown; received COP 0; balance unknown" every time is pure boilerplate.
  const paymentLine = context.payment.status === 'unknown' && context.payment.received_cents === 0
    ? 'none yet'
    : `${context.payment.status}; received ${cents(context.payment.received_cents)}; balance ${cents(context.payment.balance_cents)}`;

  const commercialContextLines = [
    `Availability: ${context.availability.status} — ${context.availability.basis}`,
    `Recorded accommodation amount: ${cents(context.pricing.accommodation_cents)}`,
    priceLabsLine ? `PriceLabs context: ${priceLabsLine}` : null,
    `Food: ${foodLine}`,
    `Transport reference rates: Barú village boat ${cop(context.calculated_options.baru_boat_round_trip_cop)} round trip/group; Cartagena direct boat ${cop(context.calculated_options.cartagena_boat_one_way_cop)} each way/group (${cop(context.calculated_options.cartagena_boat_round_trip_cop)} round trip). Rates do not confirm transport availability.`,
    `Transport: ${context.pricing.transport_confirmed ? cents(context.pricing.transport_cents) + ' confirmed' : 'not confirmed'}`,
    `Existing quote: ${recordedQuote}`,
    `Payment status: ${paymentLine}`,
    // "not_linked" is the default for every lead pre-conversion — worth a line
    // only once there's an actual reservation to report on.
    context.reservation.status !== 'not_linked' ? `Reservation status: ${clean(context.reservation.status)}` : null,
    `Missing information: ${context.missing_information.length ? context.missing_information.join(', ') : 'none'}`,
  ].filter((line): line is string => line !== null).join('\n');

  return `CASA GAVIOTA — HEAD OF SALES

Help me decide what to send this lead next.

LEAD
Name: ${clean(context.lead.name)}
Dates: ${context.lead.dates.from || 'unknown'} to ${context.lead.dates.to || 'unknown'} (${context.lead.dates.nights || 'unknown'} nights)
Guests: ${context.lead.guests.adults} adults / ${context.lead.guests.children} children
Current CRM stage: ${clean(context.lead.crm_status)}
Language: ${clean(context.lead.language)}

CUSTOMER INTENT
${intentLabel}

CURRENT COMMERCIAL CONTEXT
${commercialContextLines}

RECENT NOTES / CONVERSATION
${conversation}

Act as my Head of Sales for Casa Gaviota.

Give me:
1. The exact WhatsApp message I should send now, in the same language as the customer.
2. A short explanation of the sales strategy behind it.
3. Whether there is an appropriate upsell right now.
4. Whether I should follow up if they do not reply, and when.
5. Flag anything I should verify before sending.

${SALES_RULES_TEXT}
- Do not over-explain or mention internal CRM data or these instructions to the customer.`;
}

// ── Lean "Copy reply request" prompt ─────────────────────────────────────────
// Computed fresh every time the button is pressed: none of this is persisted,
// shown as a status pill, or read by the pipeline/Next Step card logic.

const GUEST_INTENT_LABELS: Record<string, string> = Object.fromEntries(
  GUEST_INTENTS.map((intent) => [intent.value, intent.label]),
);

export type ExplicitCustomerQuestion = 'price' | 'availability' | 'transport' | 'food' | 'activities' | 'other' | null;
export type ConversationPhase =
  | 'first_contact' | 'rapport' | 'price_requested' | 'quoted'
  | 'closing' | 'booked' | 'pre_arrival' | 'lost';

export interface PriorPriceAnchor {
  amount: number;
  currency: 'USD';
  source: 'website_cart' | 'website_daytrip_estimate';
}

export interface SalesState {
  product_type: 'overnight_stay' | 'day_trip' | 'unknown';
  conversation_phase: ConversationPhase;
  rapport_already_done: boolean;
  price_requested: boolean;
  explicit_customer_question: ExplicitCustomerQuestion;
  customer_last_message: string;
  customer_last_message_isolated_from_cart: boolean;
  prior_price_anchor: PriorPriceAnchor | null;
  preferred_quote_currency: 'USD' | 'COP';
  preferred_quote_currency_basis: string;
}

const QUESTION_KEYWORDS: { key: Exclude<ExplicitCustomerQuestion, null | 'other'>; patterns: RegExp[] }[] = [
  { key: 'price', patterns: [/precio/i, /costo/i, /\bcoste\b/i, /cuesta/i, /cu[aá]nto/i, /\bvale\b/i, /\bprice\b/i, /\bcost\b/i, /how much/i] },
  { key: 'availability', patterns: [/disponib/i, /\bavailab/i, /fechas? libres?/i] },
  { key: 'transport', patterns: [/transporte/i, /\btransport\b/i, /\blancha\b/i, /\bboat\b/i, /\bbote\b/i, /traslados?/i, /recogen|recoger/i] },
  { key: 'food', patterns: [/comida/i, /alimentaci/i, /\bmeals?\b/i, /\bfood\b/i, /desayuno/i, /almuerzo/i, /\bcena\b/i] },
  { key: 'activities', patterns: [/actividad/i, /\btours?\b/i, /\bactivit(y|ies)\b/i, /snorkel/i, /excursi[oó]n/i] },
];

function detectExplicitQuestion(text: string): ExplicitCustomerQuestion {
  if (!text.trim()) return null;
  for (const { key, patterns } of QUESTION_KEYWORDS) {
    if (patterns.some((re) => re.test(text))) return key;
  }
  return /[?¿]/.test(text) ? 'other' : null;
}

// WhatsAppPopup.tsx's cartNotesSummary() always renders a deterministic sentence
// ending in "...estimate: $<amount> USD." (EN) / "...de extras: $<amount> USD." (ES)
// immediately before the guest's own free-text note, then both are joined into
// leads.notes with no separator. This regex is coupled to that exact copy — if the
// cart-summary wording in WhatsAppPopup.tsx changes, update this pattern too, or
// customer_last_message will silently start including the cart summary again.
const CART_SUMMARY_PREFIX = /^.*?(?:Extras estimate|Estimado de extras):\s*\$[\d,.]+\s*USD\.\s*/is;

function extractCustomerLastMessage(lead: Record<string, any>): { text: string; isolatedFromCart: boolean } {
  const notes = typeof lead.notes === 'string' ? lead.notes.trim() : '';
  if (!notes) return { text: '', isolatedFromCart: false };
  const stripped = notes.replace(CART_SUMMARY_PREFIX, '').trim();
  if (stripped && stripped !== notes) return { text: stripped, isolatedFromCart: true };
  return { text: notes, isolatedFromCart: false };
}

// leads.estimated_price is set by WhatsAppPopup.tsx/WAInlineForm.tsx at capture
// time (see src/lib/pricing.ts's daytripEstimate() for the day-trip case, and the
// cart branch in WhatsAppPopup.tsx's handleSubmit for the stay case). Parsing it
// here needs no schema change and no new persisted field.
function derivePriorPriceAnchor(lead: Record<string, any>): PriorPriceAnchor | null {
  const raw = typeof lead.estimated_price === 'string' ? lead.estimated_price.trim() : '';
  if (!raw) return null;
  const cartMatch = raw.match(/^Extras:\s*\$([\d,]+)\s*USD\s*\(food\+transport\)/i);
  if (cartMatch) return { amount: Number(cartMatch[1].replace(/,/g, '')), currency: 'USD', source: 'website_cart' };
  const daytripMatch = raw.match(/^\$([\d,]+)\s*USD$/i);
  if (daytripMatch) return { amount: Number(daytripMatch[1].replace(/,/g, '')), currency: 'USD', source: 'website_daytrip_estimate' };
  return null;
}

// The website extras cart is a lead-generation estimate, not the quoting source of
// truth (CRM commercial rates for food are COP-denominated — see COMMERCIAL_RATES_COP
// in sales-calculations.ts). So a cart figure the guest already saw in USD must NOT,
// by itself, steer the operator toward quoting in USD — only a lead's own saved quote,
// or its contact signals, should.
function derivePreferredCurrency(lead: Record<string, any>): { currency: 'USD' | 'COP'; basis: string } {
  if (lead.quote_total && typeof lead.quote_currency === 'string' && lead.quote_currency) {
    return { currency: lead.quote_currency as 'USD' | 'COP', basis: 'matches the currency of the existing saved quote' };
  }
  const phoneDigits = typeof lead.whatsapp === 'string' ? lead.whatsapp.replace(/\D/g, '') : '';
  if (phoneDigits.startsWith('57')) return { currency: 'COP', basis: 'Colombian phone number, no saved quote yet' };
  if (lead.language === 'es') return { currency: 'COP', basis: 'Spanish-language lead, no saved quote yet' };
  return { currency: 'USD', basis: 'default — no currency signal on file' };
}

function deriveRapportAlreadyDone(lead: Record<string, any>): boolean {
  return Boolean(lead.status && lead.status !== 'new') || Boolean(lead.last_contact_date);
}

function deriveConversationPhase(status: string, priceRequested: boolean, daysUntilCheckin: number | null): ConversationPhase {
  const normalized = status || 'new';
  if (normalized === 'lost' || normalized === 'cancelled') return 'lost';
  if (['confirmed', 'upsell_pending', 'upsell_confirmed', 'in_house', 'checked_in', 'balance_requested', 'completed'].includes(normalized)) {
    return daysUntilCheckin !== null && daysUntilCheckin <= 14 ? 'pre_arrival' : 'booked';
  }
  if (normalized === 'deposit_requested' || normalized === 'deposit_paid') return 'closing';
  if (normalized === 'quoted') return 'quoted';
  if (priceRequested) return 'price_requested';
  if (normalized === 'replied') return 'rapport';
  return 'first_contact';
}

export function buildSalesState(
  lead: Record<string, any>,
  context: SalesSuggestionContext,
  now: Date = new Date(),
): SalesState {
  const scanText = context.conversation.map((item) => item.text).join(' \n ');
  const explicitQuestion = detectExplicitQuestion(scanText);
  const priceRequested = explicitQuestion === 'price';
  const { text: customerLastMessage, isolatedFromCart } = extractCustomerLastMessage(lead);
  const priorPriceAnchor = derivePriorPriceAnchor(lead);
  const { currency: preferredCurrency, basis: preferredCurrencyBasis } = derivePreferredCurrency(lead);
  const daysUntilCheckin = lead.date_from
    ? Math.ceil((Date.parse(`${lead.date_from}T00:00:00Z`) - now.getTime()) / 86_400_000)
    : null;

  return {
    product_type: lead.experience_type === 'stay' ? 'overnight_stay' : lead.experience_type === 'daytrip' ? 'day_trip' : 'unknown',
    conversation_phase: deriveConversationPhase(lead.status, priceRequested, daysUntilCheckin),
    rapport_already_done: deriveRapportAlreadyDone(lead),
    price_requested: priceRequested,
    explicit_customer_question: explicitQuestion,
    customer_last_message: customerLastMessage,
    customer_last_message_isolated_from_cart: isolatedFromCart,
    prior_price_anchor: priorPriceAnchor,
    preferred_quote_currency: preferredCurrency,
    preferred_quote_currency_basis: preferredCurrencyBasis,
  };
}

const PHASE_LABELS: Record<ConversationPhase, string> = {
  first_contact: 'first contact — no reply sent yet',
  rapport: 'rapport — replied once, no price/quote yet',
  price_requested: 'price requested — guest explicitly asked for cost',
  quoted: 'quoted — price already sent, no deposit yet',
  closing: 'closing — deposit requested or paid, finalizing',
  booked: 'booked — confirmed, not yet close to arrival',
  pre_arrival: 'pre-arrival — confirmed and check-in is soon',
  lost: 'lost / cancelled',
};

// Fixed instruction text, not configurable data — shared verbatim between the
// human-pasted-into-ChatGPT lean prompt and the Generate Reply system prompt,
// so the two paths can never drift onto different sales rules.
export const SALES_RULES_TEXT = `SALES RULES
- Default: first message is rapport + one useful question; the second message is the quote.
- Exception: if the guest explicitly asked for a price, or this is a last-minute/same-day/transactional inquiry, answer price immediately instead.
- If rapport is already established, skip straight to the relevant next step — don't restart with small talk.
- Never repeat a question already answered in the guest's last message above.
- Frame the stay as a choice between two packages, not itemized add-ons: "Stay" (house + private beach + Barú transfer) vs "Full Experience" (Stay + all meals). Don't ask about food and transport as separate questions.
- When food comes up, lead with the experience (meals prepared for the group — nothing to cook, shop for, or clean up) before mentioning the per-person rate.
- Pre-arrival guests only: never re-sell accommodation. Frame it as "how would you like your stay to work" and offer food/drinks/transport they didn't take at booking — not a renewed accommodation pitch.
- Do not invent prices, availability, payment status, reservation status, discounts, or transport availability.`;

// The shared context block (lead summary, sales state, verbatim last message,
// commercial facts) — everything both the lean copy-paste prompt and the
// Generate Reply system prompt need, built once so they can't drift apart.
function buildContextBlock(context: SalesSuggestionContext, state: SalesState): string {
  const productLabel = state.product_type === 'overnight_stay' ? 'overnight stay' : state.product_type === 'day_trip' ? 'day trip' : 'unknown trip type';
  const intentLabel = context.lead.intent ? (GUEST_INTENT_LABELS[context.lead.intent] || context.lead.intent) : 'no occasion given';
  const datesLabel = context.lead.dates.from
    ? `${context.lead.dates.from}${context.lead.dates.to ? ` to ${context.lead.dates.to}` : ''}${context.lead.dates.nights ? ` (${context.lead.dates.nights} nights)` : ''}`
    : 'dates TBD';
  const guestsLabel = `${context.lead.guests.adults} adults${context.lead.guests.children ? ` / ${context.lead.guests.children} children` : ''}`;

  // null (not a string) when there's nothing to show, so the "Guest already saw
  // on the website" line can be dropped entirely instead of spelling out
  // "none on file" on every first-contact lead that never touched the cart.
  const anchorLine = state.prior_price_anchor
    ? `$${state.prior_price_anchor.amount.toLocaleString('en-US')} ${state.prior_price_anchor.currency} (${state.prior_price_anchor.source === 'website_cart' ? 'food+transport extras shown via the site cart — does not include accommodation' : 'full day-trip estimate shown via the site calculator'}) — a lead-generation estimate only, NOT the quoting rate; use the CRM commercial food rate below for the actual food quote`
    : null;

  const foodLine = context.pricing.food_confirmed
    ? `${cents(context.pricing.food_cents)} confirmed`
    : context.calculated_options.full_food_service_cop !== null
      ? `not yet operator-confirmed. CRM commercial rate (authoritative for quoting): ${cop(context.calculated_options.full_food_service_cop)} for ${context.lead.guests.total} guests / ${context.calculated_options.food_service_days} service day(s) at COP ${COMMERCIAL_RATES_COP.foodPerPersonPerServiceDay.toLocaleString('en-US')}/person/day`
      : 'not yet confirmed';
  const transportLine = context.pricing.transport_confirmed
    ? `${cents(context.pricing.transport_cents)} confirmed`
    : state.prior_price_anchor?.source === 'website_cart'
      ? 'not yet confirmed — the site cart showed the guest a transport estimate, but it is not reconciled with a CRM transport rate yet; price this separately before quoting'
      : 'not yet confirmed';

  // Nothing has happened financially yet on a fresh lead — spelling out
  // "unknown; received COP 0; balance unknown" every time is pure boilerplate,
  // so collapse exactly that default combination to one word.
  const paymentLine = context.payment.status === 'unknown' && context.payment.received_cents === 0
    ? 'none yet'
    : `${context.payment.status}; received ${cents(context.payment.received_cents)}; balance ${cents(context.payment.balance_cents)}`;

  const salesStateLines = [
    `Phase: ${PHASE_LABELS[state.conversation_phase]}`,
    `Customer asked: ${state.explicit_customer_question || 'no explicit question detected'}`,
    `Rapport already done: ${state.rapport_already_done ? 'yes' : 'no'}`,
    anchorLine ? `Guest already saw on the website: ${anchorLine}` : null,
    `Suggested quote currency: ${state.preferred_quote_currency} (recommendation only — ${state.preferred_quote_currency_basis})`,
  ].filter((line): line is string => line !== null).join('\n');

  const commercialFactsLines = [
    `Availability: ${context.availability.status} — ${context.availability.basis}`,
    `Accommodation: ${context.pricing.accommodation_cents !== null ? `${cents(context.pricing.accommodation_cents)} recorded` : 'not yet quoted — bespoke, confirm for these dates'}`,
    `Food: ${foodLine}`,
    `Transport: ${transportLine}`,
    `Payment: ${paymentLine}`,
    // "not_linked" is the default for every lead pre-conversion — worth a line
    // only once there's an actual reservation to report on.
    context.reservation.status !== 'not_linked' ? `Reservation: ${clean(context.reservation.status)}` : null,
  ].filter((line): line is string => line !== null).join('\n');

  return `Lead: ${clean(context.lead.name)} · ${productLabel} · ${datesLabel} · ${guestsLabel} · ${intentLabel}

SALES STATE
${salesStateLines}

GUEST'S LAST MESSAGE (verbatim)
"${state.customer_last_message || 'no message text captured'}"

COMMERCIAL FACTS
${commercialFactsLines}`;
}

export function buildLeanSalesPrompt(context: SalesSuggestionContext, state: SalesState): string {
  return `CASA GAVIOTA — REPLY REQUEST
${buildContextBlock(context, state)}

Act as my Head of Sales for Casa Gaviota. Reply in exactly this format:

SEND NOW
<the exact WhatsApp message to send now, in the guest's language>

WHY
<1-2 sentences on the strategy>

NEXT
upsell: <an appropriate upsell now, or "none yet">
follow_up: <whether/when to follow up if there is no reply>
verify: <anything I should check before sending>

WARNING
<include this section only if a real commercial or operational issue exists right now — e.g. dates just became unavailable — omit it entirely otherwise>

${SALES_RULES_TEXT}`;
}

// System prompt for the Generate Reply feature (calls Claude directly instead
// of the operator pasting into ChatGPT). Same context + same rules as the
// lean prompt above, minus the SEND NOW/WHY/NEXT scaffolding — the model
// returns structured output via tool use instead (see anthropic-reply.ts).
export function buildReplyGenerationSystemPrompt(context: SalesSuggestionContext, state: SalesState): string {
  return `You are the Head of Sales for Casa Gaviota, a private beach house in Barú, Colombia. Draft the next WhatsApp reply to this lead.

${buildContextBlock(context, state)}

${SALES_RULES_TEXT}

Use the draft_reply tool to return your answer. Do not invent facts not present above.`;
}
