import type { APIContext } from 'astro';
import type { BlockedRange } from '../../lib/availability';

export const prerender = false;

const CACHE_KEY = 'hosthub_availability';
const CACHE_TTL = 15 * 60; // 15 minutes — same as WP transients
const MEM_CACHE_TTL_MS = 15 * 60 * 1000;

interface AvailabilityPayload {
  blocked: BlockedRange[];
  fetched_at: string;
  stale: boolean;
  error?: string;
}

interface CalendarEvent {
  date_from: string;
  date_to: string;
  cancelled_at: string | null;
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
  const baseUrl = cfEnv.HOSTHUB_BASE_URL ?? import.meta.env.HOSTHUB_BASE_URL ?? 'https://app.hosthub.com/api/2019-03-01';

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
    const res = await fetch(`${baseUrl}/rentals/${rentalId}/calendar-events?is_visible=true`, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HostHub ${res.status}: ${await res.text().catch(() => '')}`);
    }

    const raw = (await res.json()) as { data?: CalendarEvent[] };
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

// ── Parser — HostHub calendar-events response shape ───────────────────────────

function parseBlockedRanges(raw: { data?: CalendarEvent[] }): BlockedRange[] {
  const events = raw.data ?? [];
  return events
    .filter(e => !e.cancelled_at)
    .map(e => ({ start: e.date_from, end: e.date_to }));
}
