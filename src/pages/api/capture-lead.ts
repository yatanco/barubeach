import type { APIRoute } from 'astro';
import { getDb, getRuntimeEnv, nowIso } from '../../lib/db';
import { GUEST_INTENT_VALUES } from '../../lib/crm';

export const prerender = false;

const text = (value: unknown, max = 2000): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

const integer = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};
export const POST: APIRoute = async ({ request, locals }) => {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const source = text(data.source, 50);
  const language = text(data.language, 10);
  const experienceType = text(data.type, 30);
  if (!source || !language || !experienceType) {
    return Response.json({ success: false, error: 'Missing required fields' }, { status: 422 });
  }

  const occasion = text(data.occasion, 30);
  const guestIntent = occasion && (GUEST_INTENT_VALUES as readonly string[]).includes(occasion) ? occasion : null;

  const db = getDb(locals);
  const runtime = getRuntimeEnv(locals);
  const webhookUrl = runtime.LEADS_WEBHOOK_URL ?? import.meta.env.LEADS_WEBHOOK_URL;
  const now = nowIso();
  let id = crypto.randomUUID();
  let storedInD1 = false;
  let storedInWebhook = false;

  if (db) {
    try {
      const incomingPhone = text(data.whatsapp, 100);
      const normalizedPhone = incomingPhone?.replace(/\D/g, '') ?? '';

      // Check for an existing lead with the same phone number (format-insensitive).
      // If found, update rather than insert to avoid duplicates from multi-channel contacts.
      let existingId: string | null = null;
      if (normalizedPhone.length >= 7) {
        const existing = await db.prepare(`
          SELECT id FROM leads
          WHERE REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '+', ''), '-', '') = ?1
          LIMIT 1
        `).bind(normalizedPhone).first<{ id: string }>();
        existingId = existing?.id ?? null;
      }

      if (existingId) {
        id = existingId;
        await db.prepare(`
          UPDATE leads SET
            updated_at       = ?1,
            guest_name       = COALESCE(guest_name, ?2),
            email            = COALESCE(email, ?3),
            date_from        = COALESCE(date_from, ?4),
            date_to          = COALESCE(date_to, ?5),
            adults           = ?6,
            children         = ?7,
            estimated_price  = COALESCE(estimated_price, ?8),
            notes            = COALESCE(notes, ?9),
            page_url         = COALESCE(page_url, ?10),
            guest_intent     = COALESCE(guest_intent, ?11),
            raw_payload      = ?12
          WHERE id = ?13
        `).bind(
          now,
          text(data.name, 200),
          text(data.email, 320),
          text(data.date, 30),
          text(data.checkOut, 30),
          integer(data.adults, 1),
          integer(data.children),
          text(data.estimatedPrice, 200),
          text(data.notes, 2000),
          text(data.pageUrl, 1000),
          guestIntent,
          JSON.stringify(data).slice(0, 20000),
          existingId,
        ).run();
      } else {
        await db.prepare(`
          INSERT INTO leads (
            id, created_at, updated_at, source, language, experience_type,
            guest_name, whatsapp, email, date_from, date_to, adults, children,
            estimated_price, notes, page_url, guest_intent, raw_payload
          ) VALUES (?1, ?2, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
        `).bind(
          id,
          now,
          source,
          language,
          experienceType,
          text(data.name, 200),
          text(data.whatsapp, 100),
          text(data.email, 320),
          text(data.date, 30),
          text(data.checkOut, 30),
          integer(data.adults, 1),
          integer(data.children),
          text(data.estimatedPrice, 200),
          text(data.notes, 2000),
          text(data.pageUrl, 1000),
          guestIntent,
          JSON.stringify(data).slice(0, 20000),
        ).run();
      }
      storedInD1 = true;
    } catch (error) {
      console.error('[capture-lead] D1 insert failed', error);
    }
  }

  // Keep the existing sheet as a migration fallback until it is deliberately removed.
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, crmId: id, timestamp: data.timestamp ?? now }),
        redirect: 'follow',
      });
      const body = await response.text();
      storedInWebhook = response.ok && !/error/i.test(body);
    } catch (error) {
      console.error('[capture-lead] webhook failed', error);
    }
  }

  if (!storedInD1 && !storedInWebhook) {
    const missing = !db && !webhookUrl;
    return Response.json(
      { success: false, error: missing ? 'Lead storage is not configured' : 'Lead storage failed' },
      { status: missing ? 503 : 502 },
    );
  }

  return Response.json({ success: true, id, storedInD1, storedInWebhook }, { status: 200 });
};
