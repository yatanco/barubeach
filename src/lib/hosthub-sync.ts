import type { D1Database } from './db';
import { nowIso } from './db';

export interface SyncResult {
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  error?: string;
}

export interface HostHubSyncEnv {
  DB: D1Database;
  HOSTHUB_ICAL_URL?: string;
  HOSTHUB_API_KEY?: string;
  HOSTHUB_RENTAL_ID?: string;
  HOSTHUB_BASE_URL?: string;
}

interface CalendarEventGuestData {
  adults: number;
  children: number;
  channel: string | null;
}

// HostHub's channel_type_code values seen/expected: 'booking.com', 'airbnb', plus
// direct/offline/manual for non-OTA reservations — mapped onto our own enum.
function mapChannelTypeCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const lower = code.toLowerCase();
  if (lower.includes('airbnb')) return 'airbnb';
  if (lower.includes('booking')) return 'booking.com';
  if (lower.includes('direct') || lower.includes('offline') || lower.includes('manual')) return 'direct';
  return 'other';
}

// The iCal feed (parsed below) has no guest-count or reliable channel field, but
// HostHub's JSON calendar-events endpoint does — fetched once per sync and matched
// back onto iCal events by date range (the only key both sources share). Best-effort:
// on any failure this just returns an empty map and the sync falls back to the
// pre-existing iCal-only behavior (default 1 adult / 0 children, guessed channel).
async function fetchCalendarEventGuestData(env: HostHubSyncEnv): Promise<Map<string, CalendarEventGuestData>> {
  const map = new Map<string, CalendarEventGuestData>();
  if (!env.HOSTHUB_API_KEY || !env.HOSTHUB_RENTAL_ID) return map;
  const baseUrl = env.HOSTHUB_BASE_URL || 'https://app.hosthub.com/api/2019-03-01';

  try {
    const res = await fetch(`${baseUrl}/rentals/${env.HOSTHUB_RENTAL_ID}/calendar-events?is_visible=true`, {
      headers: {
        Authorization: env.HOSTHUB_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return map;
    const payload = (await res.json()) as { data?: any[] };
    for (const event of payload.data ?? []) {
      if (!event.date_from || !event.date_to) continue;
      map.set(`${event.date_from}|${event.date_to}`, {
        adults: Number.isFinite(event.guest_adults) ? event.guest_adults : 1,
        children: Number.isFinite(event.guest_children) ? event.guest_children : 0,
        channel: mapChannelTypeCode(event.source?.channel_type_code),
      });
    }
  } catch (cause) {
    console.error('[hosthub-sync] calendar-events guest-data fetch failed', cause);
  }
  return map;
}

const BLOCKED_SUMMARY = /^(blocked|not available)/i;
const BOOKING_REF_CODE = /^(.*?)\s*\(([A-Za-z0-9]{5,})\)\s*$/;

export function extractField(block: string, field: string): string {
  const match = block.match(new RegExp(`^${field}(?:;[^:\\r\\n]*)?:(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

// Any custom X- property HostHub (or an upstream channel manager) attaches to the VEVENT —
// logged during sync so we can see whether channel info travels through one of these
// instead of (or in addition to) SUMMARY/DESCRIPTION.
export function extractXFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const regex = /^(X-[A-Z0-9-]+)(?:;[^:\r\n]*)?:(.*)$/gim;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(block))) {
    fields[match[1].toUpperCase()] = match[2].trim();
  }
  return fields;
}

// Explicit platform keyword anywhere in a text field — the most reliable signal
// whenever HostHub actually includes it (SUMMARY, DESCRIPTION, or an X- field).
function detectChannelFromText(text: string): string | null {
  if (!text) return null;
  if (/airbnb/i.test(text)) return 'airbnb';
  if (/booking\s*\.?\s*com/i.test(text)) return 'booking.com';
  if (/\bvrbo\b|\bexpedia\b|\bhomeaway\b/i.test(text)) return 'other';
  if (/\bdirect\b|\boffline\b/i.test(text)) return 'direct';
  return null;
}

function icalDateToIso(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8);
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function unescapeIcalText(value: string): string {
  return value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
}

export function parseReservationSummary(
  summary: string,
  description = '',
  xFields: Record<string, string> = {},
): { guestName: string; channel: string } {
  const trimmed = summary.trim();
  if (!trimmed || /^offline booking$/i.test(trimmed)) {
    return { guestName: 'Direct Guest', channel: 'direct' };
  }

  // Strip a trailing booking-ref code like "(HME55WFNHR)" from the display name regardless
  // of channel — used for display either way.
  const codeMatch = trimmed.match(BOOKING_REF_CODE);
  const displayName = codeMatch && codeMatch[1].trim() ? codeMatch[1].trim() : trimmed;

  // 1. An explicit X- custom field naming the channel is the most trustworthy signal,
  // if HostHub sends one — try known-ish names first, then any X- field's value.
  const xChannelField = xFields['X-CHANNEL'] || xFields['X-SOURCE'] || xFields['X-BOOKING-CHANNEL']
    || xFields['X-HOSTHUB-CHANNEL'] || xFields['X-RESERVATION-CHANNEL'];
  const fromNamedXField = xChannelField ? detectChannelFromText(xChannelField) : null;
  if (fromNamedXField) return { guestName: displayName, channel: fromNamedXField };
  for (const value of Object.values(xFields)) {
    const detected = detectChannelFromText(value);
    if (detected) return { guestName: displayName, channel: detected };
  }

  // 2. Explicit keyword in SUMMARY or DESCRIPTION.
  const fromSummary = detectChannelFromText(trimmed);
  if (fromSummary) return { guestName: displayName, channel: fromSummary };
  const fromDescription = detectChannelFromText(description);
  if (fromDescription) return { guestName: displayName, channel: fromDescription };

  // 3. No keyword anywhere — fall back to the shape of the reservation code in parens.
  // Booking.com confirmation numbers are purely numeric (commonly 9-10 digits); Airbnb's
  // are alphanumeric. This is a best-effort guess pending real sample data (see the
  // 'iCal event' diagnostic log emitted during sync) and may need retuning.
  if (codeMatch) {
    const code = codeMatch[2];
    if (/^[0-9]+$/.test(code)) return { guestName: displayName, channel: 'booking.com' };
    if (/[A-Za-z]/.test(code)) return { guestName: displayName, channel: 'airbnb' };
  }

  return { guestName: displayName, channel: 'direct' };
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const inMs = Date.parse(`${checkIn}T00:00:00Z`);
  const outMs = Date.parse(`${checkOut}T00:00:00Z`);
  return Math.max(0, Math.round((outMs - inMs) / 86_400_000));
}

function deriveStatus(checkIn: string, checkOut: string, today: string): 'completed' | 'checked_in' | 'confirmed' {
  if (checkOut < today) return 'completed';
  if (checkIn <= today && today <= checkOut) return 'checked_in';
  return 'confirmed';
}

async function logSync(db: D1Database, result: SyncResult, durationMs: number): Promise<void> {
  await db.prepare(`INSERT INTO sync_log (synced_at, source, processed, inserted, updated, skipped, error, duration_ms)
    VALUES (?1, 'hosthub_ical', ?2, ?3, ?4, ?5, ?6, ?7)`)
    .bind(nowIso(), result.processed, result.inserted, result.updated, result.skipped, result.error ?? null, durationMs)
    .run();
}

export async function syncHostHub(env: HostHubSyncEnv): Promise<SyncResult> {
  const startedAt = Date.now();
  const result: SyncResult = { processed: 0, inserted: 0, updated: 0, skipped: 0 };

  if (!env.HOSTHUB_ICAL_URL) {
    result.error = 'HOSTHUB_ICAL_URL is not configured';
    await logSync(env.DB, result, Date.now() - startedAt);
    return result;
  }

  try {
    const response = await fetch(env.HOSTHUB_ICAL_URL);
    if (!response.ok) throw new Error(`iCal fetch failed: HTTP ${response.status}`);
    const raw = await response.text();
    // Unfold RFC 5545 continuation lines (a leading space/tab on the next line) before splitting.
    const unfolded = raw.replace(/\r?\n[ \t]/g, '');
    const blocks = unfolded.split('BEGIN:VEVENT').slice(1);

    const today = nowIso().slice(0, 10);
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    let loggedEvents = 0;
    const guestDataByDateRange = await fetchCalendarEventGuestData(env);

    for (const rawBlock of blocks) {
      const block = rawBlock.split('END:VEVENT')[0];
      try {
        const uid = extractField(block, 'UID');
        const dtStart = extractField(block, 'DTSTART');
        const dtEnd = extractField(block, 'DTEND');
        const summary = extractField(block, 'SUMMARY');
        const description = extractField(block, 'DESCRIPTION');
        const xFields = extractXFields(block);

        // Temporary diagnostic: HostHub's calendar UI shows the correct channel per
        // reservation, but that info isn't reliably present in SUMMARY alone — log the
        // first few raw events so we can see exactly which field actually carries it.
        if (loggedEvents < 3) {
          console.log('iCal event:', { uid, summary, description, xFields, raw: block.substring(0, 500) });
          loggedEvents++;
        }

        if (!uid || !dtStart || !dtEnd) {
          result.skipped++;
          continue;
        }

        result.processed++;
        const checkIn = icalDateToIso(dtStart);
        const checkOut = icalDateToIso(dtEnd);
        const hosthubNotes = description ? unescapeIcalText(description) : null;
        const isBlocked = BLOCKED_SUMMARY.test(summary.trim());

        const existing = await env.DB.prepare('SELECT id FROM bookings WHERE reservation_id = ?1')
          .bind(uid).first<{ id: string }>();

        // Scope: skip reservations that ended more than 30 days ago unless already tracked.
        if (checkOut < cutoff && !existing) {
          result.skipped++;
          continue;
        }

        if (isBlocked) {
          if (existing) {
            await env.DB.prepare("UPDATE bookings SET status = 'cancelled', updated_at = ?1 WHERE id = ?2")
              .bind(nowIso(), existing.id).run();
            result.updated++;
          } else {
            result.skipped++;
          }
          continue;
        }

        const { guestName, channel: parsedChannel } = parseReservationSummary(summary, description, xFields);
        const guestData = guestDataByDateRange.get(`${checkIn}|${checkOut}`);
        // JSON calendar-events' source.channel_type_code is a direct field from HostHub,
        // more reliable than guessing from iCal SUMMARY text — prefer it when present.
        const channel = guestData?.channel || parsedChannel;
        const nights = nightsBetween(checkIn, checkOut);
        const status = deriveStatus(checkIn, checkOut, today);
        const now = nowIso();

        if (existing) {
          // Only HostHub-owned fields are touched — charges, payments and manually entered
          // booking fields (guest_intent, notes, etc.) are left untouched on re-sync. Guest
          // counts are the exception: only overwritten when the JSON lookup actually found a
          // match, so a manual correction isn't clobbered back to a stale value on a sync
          // where the match happens to fail (e.g. the JSON fetch itself failed).
          if (guestData) {
            await env.DB.prepare(`UPDATE bookings SET guest_name = ?1, date_from = ?2, date_to = ?3, nights = ?4,
              hosthub_notes = ?5, status = ?6, channel = ?7, adults = ?8, children = ?9, updated_at = ?10 WHERE id = ?11`)
              .bind(guestName, checkIn, checkOut, nights, hosthubNotes, status, channel, guestData.adults, guestData.children, now, existing.id)
              .run();
          } else {
            await env.DB.prepare(`UPDATE bookings SET guest_name = ?1, date_from = ?2, date_to = ?3, nights = ?4,
              hosthub_notes = ?5, status = ?6, channel = ?7, updated_at = ?8 WHERE id = ?9`)
              .bind(guestName, checkIn, checkOut, nights, hosthubNotes, status, channel, now, existing.id)
              .run();
          }
          result.updated++;
        } else {
          const adults = guestData?.adults ?? 1;
          const children = guestData?.children ?? 0;
          await env.DB.prepare(`INSERT INTO bookings (
              id, created_at, updated_at, reservation_id, guest_name, date_from, date_to, nights,
              adults, children, status, channel, source, hosthub_notes
            ) VALUES (?1, ?2, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'hosthub_ical', ?12)`)
            .bind(crypto.randomUUID(), now, uid, guestName, checkIn, checkOut, nights, adults, children, status, channel, hosthubNotes)
            .run();
          result.inserted++;
        }
      } catch (eventError) {
        console.error('[hosthub-sync] failed to process VEVENT', eventError);
        result.skipped++;
      }
    }
  } catch (cause) {
    console.error('[hosthub-sync] sync failed', cause);
    result.error = cause instanceof Error ? cause.message : 'Unknown sync error';
  }

  await logSync(env.DB, result, Date.now() - startedAt);
  return result;
}
