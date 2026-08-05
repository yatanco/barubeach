// PriceLabs Customer API — informational rate lookup shown on lead/booking detail
// pages. See https://developers.pricelabs.co/customer-api/api-reference/customer-api/prices/for-listings
// This is a nice-to-have overlay: any missing config or API failure returns null
// rather than throwing, so the page renders normally either way.

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface PriceLabsEnv {
  PRICELABS_API_KEY?: string;
  PRICELABS_LISTING_ID?: string;
  PRICELABS_PMS?: string;
  CACHE?: KVNamespace;
}

interface PriceLabsDay {
  date: string;
  price: number;
  min_stay: number;
}

interface PriceLabsListingResponse {
  id: string;
  currency?: string;
  data?: PriceLabsDay[];
  error?: string;
}

export interface PriceLabsQuote {
  avgPricePerNight: number;
  totalPrice: number;
  minStay: number;
  currency: string;
}

const API_URL = 'https://api.pricelabs.co/v1/listing_prices';
const CACHE_TTL_SECONDS = 6 * 60 * 60; // rates don't move minute-to-minute; usage is billed per active listing, not per call

function addDaysISO(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// checkoutISO follows this codebase's HostHub convention of an exclusive checkout
// date (see availability.ts) — the last night actually stayed is checkoutISO - 1 day.
export async function getPriceLabsQuote(env: PriceLabsEnv, checkinISO: string, checkoutISO: string): Promise<PriceLabsQuote | null> {
  const apiKey = env.PRICELABS_API_KEY;
  const listingId = env.PRICELABS_LISTING_ID;
  const pms = env.PRICELABS_PMS;
  if (!apiKey || !listingId || !pms) {
    console.error('[pricelabs] not configured — missing:', [
      !apiKey && 'PRICELABS_API_KEY',
      !listingId && 'PRICELABS_LISTING_ID',
      !pms && 'PRICELABS_PMS',
    ].filter(Boolean).join(', '));
    return null;
  }

  const lastNightISO = addDaysISO(checkoutISO, -1);
  if (lastNightISO < checkinISO) return null;

  const kv = env.CACHE;
  const cacheKey = `pricelabs:${listingId}:${checkinISO}:${lastNightISO}`;
  if (kv) {
    const cached = await kv.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached) as PriceLabsQuote; } catch { /* fall through and refetch */ }
    }
  }

  let quote: PriceLabsQuote | null = null;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ listings: [{ id: listingId, pms, dateFrom: checkinISO, dateTo: lastNightISO }] }),
    });
    if (res.ok) {
      const bodyText = await res.text();
      // The API returns a plain array of listing results, not { data: [...] }.
      const body = JSON.parse(bodyText) as PriceLabsListingResponse[];
      const listing = body[0];
      const days = listing?.data;
      if (listing && !listing.error && days && days.length > 0) {
        const totalPrice = days.reduce((sum, d) => sum + (d.price || 0), 0);
        quote = {
          avgPricePerNight: Math.round(totalPrice / days.length),
          totalPrice: Math.round(totalPrice),
          minStay: days[0].min_stay || 1,
          currency: listing.currency || 'USD',
        };
      } else {
        console.error('[pricelabs] listing_prices returned no usable data:', bodyText);
      }
    } else {
      const errorBody = await res.text();
      console.error(`[pricelabs] listing_prices HTTP ${res.status}:`, errorBody);
    }
  } catch (err) {
    console.error('[pricelabs] listing_prices request threw:', err instanceof Error ? err.message : err);
    quote = null;
  }

  if (quote && kv) {
    await kv.put(cacheKey, JSON.stringify(quote), { expirationTtl: CACHE_TTL_SECONDS });
  }
  return quote;
}
