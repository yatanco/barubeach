import type { APIRoute } from 'astro';
import { getDb, nowIso } from '../../lib/db';

export const prerender = false;

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

function text(value: unknown, max = 2000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function parseItems(value: unknown): OrderItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items: OrderItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null;
    const name = text((raw as Record<string, unknown>).name, 200);
    const qty = Number((raw as Record<string, unknown>).qty);
    const price = Number((raw as Record<string, unknown>).price);
    if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) return null;
    items.push({ name, qty, price });
  }
  return items;
}

export const POST: APIRoute = async ({ request, locals }) => {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const guestName = text(data.guestName, 200);
  const items = parseItems(data.items);
  const total = Number(data.total);
  const bookingId = text(data.bookingId, 100);
  const notes = text(data.notes, 2000);

  if (!guestName || !items || !Number.isFinite(total) || total <= 0) {
    return Response.json({ success: false, error: 'Missing required fields' }, { status: 422 });
  }

  const db = getDb(locals);
  if (!db) {
    // No DB binding configured — don't block the WhatsApp handoff on it.
    return Response.json({ success: true, offline: true });
  }

  try {
    const result = await db.prepare(`
      INSERT INTO drinks_orders (booking_id, guest_name, items, total, notes, created_at, source)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    `).bind(bookingId, guestName, JSON.stringify(items), Math.round(total), notes, nowIso(), 'drinks_page').run();

    const orderId = (result.meta as { last_row_id?: number } | undefined)?.last_row_id ?? null;
    return Response.json({ success: true, orderId });
  } catch (error) {
    console.error('[drinks-order] D1 insert failed', error);
    return Response.json({ success: true, offline: true });
  }
};
