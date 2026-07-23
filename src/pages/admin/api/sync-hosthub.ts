import type { APIRoute } from 'astro';
import { getRuntimeEnv, nowIso, requireDb } from '../../../lib/db';
import { syncHostHub } from '../../../lib/hosthub-sync';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const db = requireDb(locals);
  const env = getRuntimeEnv(locals);
  const result = await syncHostHub({ DB: db, HOSTHUB_ICAL_URL: env.HOSTHUB_ICAL_URL });
  return Response.json({ success: !result.error, result, syncedAt: nowIso() }, { status: result.error ? 502 : 200 });
};
