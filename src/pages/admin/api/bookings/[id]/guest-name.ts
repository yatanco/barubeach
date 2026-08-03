import type { APIRoute } from 'astro';
import { requireDb } from '../../../../../lib/db';

export const prerender = false;

// Public-facing /drinks?booking=… reads this to prefill the guest name field.
// Note: this lives under /admin/api, which the README/Cloudflare Access setup
// locks down to authenticated staff — if that policy is applied to the whole
// /admin/* path, guests hitting /drinks will not be able to reach this
// endpoint and prefill will silently no-op (drinks ordering still works,
// guests just type their name manually). Carve out an Access exception for
// this one route, or move it outside /admin, if prefill needs to work for guests.
export const GET: APIRoute = async ({ locals, params }) => {
  if (!params.id) {
    return Response.json({ guestName: null }, { status: 400 });
  }
  const db = requireDb(locals);
  const row = await db.prepare('SELECT guest_name FROM bookings WHERE id = ?1')
    .bind(params.id).first<{ guest_name: string | null }>();
  return Response.json({ guestName: row?.guest_name ?? null });
};
