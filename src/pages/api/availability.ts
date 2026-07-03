import type { APIContext } from 'astro';

export const prerender = false;

const CACHE_KEY = 'hosthub_availability';
const CACHE_TTL = 15 * 60; // 15 minutes — same as WP transients
const MEM_CACHE_TTL_MS = 15 * 60 * 1000;

interface BlockedRange {
  start: string;
  end: string;
}

interface AvailabilityPayload {
  blocked: BlockedRange[];
  fetched_at: string;
  stale: boolean;
  error?: string;
}

// Module-level cache — the primary cache path. KV (below) is a secondary
// layer for when the CACHE binding is actually wired up; until then this is
// what actually avoids hitting HostHub on every request within a warm isolate.
let memCache: { payload: AvailabilityPayload; time: number } | null = null;

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface Env {
  CACHE?: KVNamespace;
  HOSTHUB_API_KEY?: string;
  HOSTHUB_RENTAL_ID?: string;
  HOSTHUB_BASE_URL?: string;
}

function getCFEnv(locals: APIContext['locals']): Env {
  return (locals as any).runtime?.env ?? {};
}

function corsHeaders(origin: string) {
  const allowed = ['https://casagaviota.com', 'http://localhost:4321', 'http://localhost:3000'];
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : 'https://casagaviota.com',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };
}

export async function OPTIONS({ request }: APIContext) {
  const origin = request.headers.get('Origin') ?? '';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET({ locals, request }: APIContext) {
  const origin = request.headers.get('Origin') ?? '';
  const headers = corsHeaders(origin);

  // Module-level cache first — fastest path, and the only one guaranteed to
  // work regardless of whether the KV binding is actually provisioned.
  if (memCache && Date.now() - memCache.time < MEM_CACHE_TTL_MS) {
    return new Response(JSON.stringify(memCache.payload), {
      headers: { ...headers, 'Cache-Control': 'public, max-age=300' },
    });
  }

  const cfEnv = getCFEnv(locals);
  const kv = cfEnv.CACHE;
  const apiKey = cfEnv.HOSTHUB_API_KEY ?? import.meta.env.HOSTHUB_API_KEY;
  const rentalId = cfEnv.HOSTHUB_RENTAL_ID ?? import.meta.env.HOSTHUB_RENTAL_ID;
  const baseUrl = cfEnv.HOSTHUB_BASE_URL ?? import.meta.env.HOSTHUB_BASE_URL ?? 'https://app.hosthub.com/api/v1';

  // Serve from KV cache if fresh (secondary layer, for when CACHE is bound)
  if (kv) {
    const cached = await kv.get(CACHE_KEY);
    if (cached) {
      const payload = JSON.parse(cached) as AvailabilityPayload;
      memCache = { payload, time: Date.now() };
      return new Response(cached, {
        headers: { ...headers, 'Cache-Control': 'public, max-age=300' },
      });
    }
  }

  if (!apiKey || !rentalId) {
    const payload: AvailabilityPayload = {
      blocked: [],
      fetched_at: new Date().toISOString(),
      stale: true,
      error: 'unavailable',
    };
    return new Response(JSON.stringify(payload), { headers });
  }

  try {
    const res = await fetch(`${baseUrl}/rentals/${rentalId}/calendar`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HostHub ${res.status}: ${await res.text().catch(() => '')}`);
    }

    const raw = await res.json();
    const blocked = parseBlockedRanges(raw);
    const payload: AvailabilityPayload = { blocked, fetched_at: new Date().toISOString(), stale: false };
    const body = JSON.stringify(payload);

    memCache = { payload, time: Date.now() };
    if (kv) {
      await kv.put(CACHE_KEY, body, { expirationTtl: CACHE_TTL });
    }

    return new Response(body, {
      headers: { ...headers, 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    // Return last known-good result on error rather than failing hard
    if (memCache) {
      return new Response(JSON.stringify({ ...memCache.payload, stale: true }), { headers });
    }
    if (kv) {
      const stale = await kv.get(CACHE_KEY);
      if (stale) {
        const data = JSON.parse(stale) as AvailabilityPayload;
        return new Response(JSON.stringify({ ...data, stale: true }), { headers });
      }
    }

    console.warn('[availability]', err instanceof Error ? err.message : String(err));
    const payload: AvailabilityPayload = {
      blocked: [],
      fetched_at: new Date().toISOString(),
      stale: true,
      error: 'unavailable',
    };
    return new Response(JSON.stringify(payload), { headers });
  }
}

// ── Parser — handles multiple HostHub API response shapes ────────────────────

function parseBlockedRanges(raw: unknown): BlockedRange[] {
  if (!raw || typeof raw !== 'object') return [];

  // Try array of ranges directly: [{ start, end }] or [{ start_date, end_date }]
  if (Array.isArray(raw)) {
    if (raw.length && typeof raw[0] === 'object') {
      const first = raw[0] as Record<string, unknown>;

      // Range-based: each item has a start/end date
      if ('start' in first || 'start_date' in first) {
        return toRanges(raw as Record<string, unknown>[]);
      }

      // Day-by-day: each item is a single date
      if ('date' in first) {
        return groupDaysToDates(raw as Record<string, unknown>[]);
      }
    }
    return [];
  }

  const obj = raw as Record<string, unknown>;

  // Nested under data.calendar, data.blocked, data.periods, etc.
  for (const key of ['calendar', 'data', 'blocked', 'blocked_periods', 'periods', 'reservations', 'bookings']) {
    const nested = obj[key];
    if (Array.isArray(nested) && nested.length > 0) {
      return parseBlockedRanges(nested);
    }
  }

  return [];
}

function toRanges(items: Record<string, unknown>[]): BlockedRange[] {
  return items
    .map(item => ({
      start: String(item.start ?? item.start_date ?? item.check_in ?? item.checkin ?? ''),
      end: String(item.end ?? item.end_date ?? item.check_out ?? item.checkout ?? ''),
    }))
    .filter(r => r.start && r.end);
}

// Convert day-by-day array [{date, available/status}] into merged ranges
function groupDaysToDates(days: Record<string, unknown>[]): BlockedRange[] {
  const blocked = days
    .filter(d => {
      const avail = d.available ?? d.is_available;
      const status = String(d.status ?? '').toLowerCase();
      if (avail !== undefined) return avail === false || avail === 0;
      return status === 'booked' || status === 'blocked' || status === 'unavailable';
    })
    .map(d => String(d.date))
    .filter(Boolean)
    .sort();

  if (!blocked.length) return [];

  const ranges: BlockedRange[] = [];
  let start = blocked[0];
  let prev = blocked[0];

  for (let i = 1; i < blocked.length; i++) {
    const curr = blocked[i];
    const gap = (new Date(curr).getTime() - new Date(prev).getTime()) / 86_400_000;
    if (gap <= 1) {
      prev = curr;
    } else {
      ranges.push({ start, end: prev });
      start = curr;
      prev = curr;
    }
  }
  ranges.push({ start, end: prev });
  return ranges;
}
