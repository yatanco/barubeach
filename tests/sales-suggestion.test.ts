import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatGptSalesPrompt, buildSalesSuggestionContext, buildSalesState, buildLeanSalesPrompt } from '../src/lib/sales-suggestion.ts';

const baseLead = {
  id: 'lead-1', created_at: '2026-08-08T10:00:00Z', status: 'quoted', source: 'whatsapp_history',
  language: 'es', experience_type: 'stay', guest_name: 'Ana', whatsapp: '+573001234567',
  date_from: '2026-08-10', date_to: '2026-08-12', nights: 2, adults: 7, children: 0,
  guest_intent: 'birthday', notes: 'Llegamos en carro desde Barranquilla.',
  raw_payload: JSON.stringify({ message: '¿Cuánto cuesta para siete adultos?', internal_secret: 'do-not-copy' }),
  accommodation_amount: 300_000_000, food_amount: 0, food_confirmed: 0,
  transport_amount: 30_000_000, transport_confirmed: 1, quote_currency: 'COP', quote_total: 3_300_000,
};

function context(overrides: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return buildSalesSuggestionContext({
    lead: { ...baseLead, ...overrides }, paymentsReceivedCents: Number(extra.paymentsReceivedCents ?? 0),
    linkedBooking: (extra.linkedBooking as { id: string; status: string } | null) ?? null,
    priceLabsQuote: (extra.priceLabsQuote as any) ?? null,
    availability: (extra.availability as any) ?? { hardConflicts: [], softConflicts: [] },
    now: new Date('2026-08-08T12:00:00Z'),
  });
}

test('complete lead prompt includes dates, guests, verified pricing, and existing quote', () => {
  const prompt = buildChatGptSalesPrompt(context());
  assert.match(prompt, /2026-08-10 to 2026-08-12 \(2 nights\)/);
  assert.match(prompt, /7 adults \/ 0 children/);
  assert.match(prompt, /Recorded accommodation amount: COP 3\.000\.000/);
  assert.match(prompt, /Existing quote: COP 3,300,000/);
});

test('incomplete fields remain unknown instead of being invented', () => {
  const prompt = buildChatGptSalesPrompt(context({ date_from: null, date_to: null, nights: 0, guest_intent: null }));
  assert.match(prompt, /Dates: unknown to unknown/);
  assert.match(prompt, /CUSTOMER INTENT\nunknown/);
  assert.match(prompt, /Availability: unknown/);
  assert.match(prompt, /Missing information: arrival date, departure date, trip intent/);
});

test('food option is calculated from guests and service days', () => {
  const prompt = buildChatGptSalesPrompt(context());
  assert.match(prompt, /COP 2\.100\.000 for 7 guests \/ 2 service day\(s\)/);
  assert.match(prompt, /COP 150,000 per person\/day, not yet confirmed/);
});

test('transport calculations and confirmation caveat are included', () => {
  const prompt = buildChatGptSalesPrompt(context());
  assert.match(prompt, /Barú village boat COP 300\.000 round trip\/group/);
  assert.match(prompt, /Cartagena direct boat COP 700\.000 each way\/group \(COP 1\.400\.000 round trip\)/);
  assert.match(prompt, /Rates do not confirm transport availability/);
});

test('payment and reservation state come from deterministic context', () => {
  const prompt = buildChatGptSalesPrompt(context({}, {
    paymentsReceivedCents: 165_000_000,
    linkedBooking: { id: 'booking-1', status: 'confirmed' },
  }));
  assert.match(prompt, /Payment status: partial; received COP 1\.650\.000; balance COP 1\.650\.000/);
  assert.match(prompt, /Reservation status: confirmed/);
  assert.doesNotMatch(prompt, /booking-1/);
});

test('prompt generation needs no API key, makes no network call, and excludes internal fields', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error('network request attempted'); }) as typeof fetch;
  try {
    const prompt = buildChatGptSalesPrompt(context({ database_debug: 'private', raw_payload: JSON.stringify({ message: 'Hola', internal_secret: 'do-not-copy' }) }));
    assert.match(prompt, /RECENT NOTES \/ CONVERSATION/);
    assert.doesNotMatch(prompt, /OPENAI_API_KEY|do-not-copy|database_debug|\+573001234567/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── Lean "Copy reply request" prompt ─────────────────────────────────────────

const cartLead = {
  id: 'lead-cart', created_at: '2026-08-28T14:00:00Z', status: 'new', source: 'popup',
  language: 'en', experience_type: 'stay', guest_name: 'Ana Sofia Patiño', whatsapp: '+573000000123',
  date_from: '2026-09-06', date_to: '2026-09-08', nights: 2, adults: 6, children: 0,
  guest_intent: 'family_vacation',
  notes: 'Food service — 6 people × 2 days ($50/person/day). Transport: Private boat ($500 USD). Extras estimate: $1100 USD. quisiera saber mas o menos el coste, y si eso trae la comida incluita las 3 en esos dias de alojamiento',
  estimated_price: 'Extras: $1100 USD (food+transport) — accommodation TBD by dates',
  raw_payload: JSON.stringify({ occasion: 'family_vacation' }),
  accommodation_amount: 0, food_amount: 0, food_confirmed: 0, transport_amount: 0, transport_confirmed: 0,
  quote_currency: 'USD', quote_total: null,
};

function leanContext(overrides: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  const lead = { ...cartLead, ...overrides };
  const ctx = buildSalesSuggestionContext({
    lead, paymentsReceivedCents: Number(extra.paymentsReceivedCents ?? 0),
    linkedBooking: (extra.linkedBooking as { id: string; status: string } | null) ?? null,
    priceLabsQuote: (extra.priceLabsQuote as any) ?? null,
    availability: (extra.availability as any) ?? { hardConflicts: [], softConflicts: [] },
    now: new Date('2026-08-28T15:00:00Z'),
  });
  return { lead, ctx };
}

test('explicit price question overrides phase to price_requested even on a brand-new lead', () => {
  const { lead, ctx } = leanContext();
  const state = buildSalesState(lead, ctx, new Date('2026-08-28T15:00:00Z'));
  assert.equal(state.price_requested, true);
  assert.equal(state.explicit_customer_question, 'price');
  assert.equal(state.conversation_phase, 'price_requested');
  assert.equal(state.rapport_already_done, false);
});

test('customer_last_message strips the deterministic cart-summary prefix', () => {
  const { lead, ctx } = leanContext();
  const state = buildSalesState(lead, ctx);
  assert.equal(state.customer_last_message, 'quisiera saber mas o menos el coste, y si eso trae la comida incluita las 3 en esos dias de alojamiento');
  assert.equal(state.customer_last_message_isolated_from_cart, true);
  assert.doesNotMatch(state.customer_last_message, /Extras estimate/);
});

test('prior_price_anchor is parsed from the website cart estimate with no schema change, but never sets the quote currency', () => {
  const { lead, ctx } = leanContext();
  const state = buildSalesState(lead, ctx);
  assert.deepEqual(state.prior_price_anchor, { amount: 1100, currency: 'USD', source: 'website_cart' });
  // The cart is a lead-gen estimate, not the quoting source of truth (CRM food rates
  // are COP-denominated), so it must not steer preferred_quote_currency toward USD.
  assert.equal(state.preferred_quote_currency, 'COP');
  assert.doesNotMatch(state.preferred_quote_currency_basis, /cart/);
});

test('prior_price_anchor recognizes the day-trip lump-sum estimate format', () => {
  const { lead, ctx } = leanContext({ experience_type: 'daytrip', estimated_price: '$700 USD', notes: '¿tienen disponibilidad este sabado?' });
  const state = buildSalesState(lead, ctx);
  assert.deepEqual(state.prior_price_anchor, { amount: 700, currency: 'USD', source: 'website_daytrip_estimate' });
  assert.equal(state.product_type, 'day_trip');
  assert.equal(state.explicit_customer_question, 'availability');
});

test('rapport_already_done is true once the lead has moved past new or been contacted', () => {
  const { lead, ctx } = leanContext({ status: 'replied' });
  assert.equal(buildSalesState(lead, ctx).rapport_already_done, true);
  const { lead: lead2, ctx: ctx2 } = leanContext({ last_contact_date: '2026-08-27' });
  assert.equal(buildSalesState(lead2, ctx2).rapport_already_done, true);
});

test('lean prompt includes the fixed SALES RULES text, the guest last message, and the package-framing rules', () => {
  const { lead, ctx } = leanContext();
  const prompt = buildLeanSalesPrompt(ctx, buildSalesState(lead, ctx));
  assert.match(prompt, /SALES STATE/);
  assert.match(prompt, /GUEST'S LAST MESSAGE \(verbatim\)/);
  assert.match(prompt, /"quisiera saber mas o menos el coste/);
  assert.match(prompt, /"Stay" \(house \+ private beach \+ Barú transfer\) vs "Full Experience"/);
  assert.match(prompt, /Pre-arrival guests only: never re-sell accommodation/);
  assert.match(prompt, /SEND NOW/);
});

test('lean prompt distinguishes the CRM commercial food rate (authoritative) from the website cart estimate (lead-gen only)', () => {
  const { lead, ctx } = leanContext();
  const prompt = buildLeanSalesPrompt(ctx, buildSalesState(lead, ctx));
  assert.match(prompt, /Guest already saw on the website: \$1,100 USD .*lead-generation estimate only, NOT the quoting rate/);
  assert.match(prompt, /CRM commercial rate \(authoritative for quoting\): COP 1\.800\.000 for 6 guests \/ 2 service day\(s\) at COP 150,000\/person\/day/);
});

test('lean prompt uses the guest_intent column directly, not the raw occasion string', () => {
  const { lead, ctx } = leanContext();
  const prompt = buildLeanSalesPrompt(ctx, buildSalesState(lead, ctx));
  assert.match(prompt, /Family Vacation/);
});

test('lean prompt makes no network call and excludes phone numbers and internal fields', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error('network request attempted'); }) as typeof fetch;
  try {
    const { lead, ctx } = leanContext({ database_debug: 'private' });
    const prompt = buildLeanSalesPrompt(ctx, buildSalesState(lead, ctx));
    assert.doesNotMatch(prompt, /OPENAI_API_KEY|database_debug|\+573000000123/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
