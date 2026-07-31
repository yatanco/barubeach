import type { APIRoute } from 'astro';
import { getRuntimeEnv } from '../../../lib/db';

export const prerender = false;

// Diagnostic only — probes candidate HostHub endpoints to see which ones exist and
// what shape they return (specifically: does any of them carry guest count).
// Does not touch sync logic and writes nothing to D1.

interface ProbeResult {
  url: string;
  status: number | string;
  response: string;
}

async function probe(url: string, apiKey: string): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const text = await res.text();
    return { url, status: res.status, response: text.slice(0, 500) };
  } catch (cause) {
    return { url, status: 'error', response: cause instanceof Error ? cause.message : String(cause) };
  }
}

export const GET: APIRoute = async ({ locals }) => {
  const env = getRuntimeEnv(locals);
  const apiKey = env.HOSTHUB_API_KEY;
  const rentalId = env.HOSTHUB_RENTAL_ID;
  const baseUrl = env.HOSTHUB_BASE_URL || 'https://app.hosthub.com/api/2019-03-01';

  if (!apiKey || !rentalId) {
    return Response.json({ error: 'HOSTHUB_API_KEY or HOSTHUB_RENTAL_ID is not configured' }, { status: 503 });
  }

  const urls = [
    `${baseUrl}/rentals/${rentalId}/reservations`,
    `${baseUrl}/rentals/${rentalId}/bookings`,
    `${baseUrl}/reservations?rental_id=${rentalId}`,
    `${baseUrl}/rentals/${rentalId}/calendar-events?is_visible=true`,
  ];

  const results = await Promise.all(urls.map((url) => probe(url, apiKey)));

  return Response.json({ results });
};
