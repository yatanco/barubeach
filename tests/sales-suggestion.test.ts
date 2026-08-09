import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatGptSalesPrompt, buildSalesSuggestionContext } from '../src/lib/sales-suggestion.ts';

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
