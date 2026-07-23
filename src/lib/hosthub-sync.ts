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
}

const BLOCKED_SUMMARY = /^(blocked|not available)/i;
const BOOKING_REF_CODE = /^(.*?)\s*\(([A-Z0-9]{5,})\)\s*$/;

export function extractField(block: string, field: string): string {
  const match = block.match(new RegExp(`^${field}(?:;[^:\\r\\n]*)?:(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

function icalDateToIso(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8);
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function unescapeIcalText(value: string): string {
  return value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
}

export function parseReservationSummary(summary: string): { guestName: string; channel: string } {
  const trimmed = summary.trim();
  if (!trimmed || /^offline booking$/i.test(trimmed)) {
    return { guestName: 'Direct Guest', channel: 'direct' };
  }

  // Strip a trailing booking-ref code like "(HME55WFNHR)" from the display name regardless
  // of channel, but let an explicit "airbnb"/"booking" keyword decide the channel first —
  // HostHub's own channel prefix is more reliable than the shape of the ref code.
  const codeMatch = trimmed.match(BOOKING_REF_CODE);
  const displayName = codeMatch && codeMatch[1].trim() ? codeMatch[1].trim() : trimmed;

  if (/airbnb/i.test(trimmed)) return { guestName: displayName, channel: 'airbnb' };
  if (/booking/i.test(trimmed)) return { guestName: displayName, channel: 'booking.com' };
  if (codeMatch && codeMatch[1].trim()) return { guestName: displayName, channel: 'booking.com' };
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

    for (const rawBlock of blocks) {
      const block = rawBlock.split('END:VEVENT')[0];
      try {
        const uid = extractField(block, 'UID');
        const dtStart = extractField(block, 'DTSTART');
        const dtEnd = extractField(block, 'DTEND');
        const summary = extractField(block, 'SUMMARY');
        const description = extractField(block, 'DESCRIPTION');

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

        const { guestName, channel } = parseReservationSummary(summary);
        const nights = nightsBetween(checkIn, checkOut);
        const status = deriveStatus(checkIn, checkOut, today);
        const now = nowIso();

        if (existing) {
          // Only HostHub-owned fields are touched — charges, payments and manually entered
          // booking fields (guest_intent, notes, etc.) are left untouched on re-sync.
          await env.DB.prepare(`UPDATE bookings SET guest_name = ?1, date_from = ?2, date_to = ?3, nights = ?4,
            hosthub_notes = ?5, status = ?6, channel = ?7, updated_at = ?8 WHERE id = ?9`)
            .bind(guestName, checkIn, checkOut, nights, hosthubNotes, status, channel, now, existing.id)
            .run();
          result.updated++;
        } else {
          await env.DB.prepare(`INSERT INTO bookings (
              id, created_at, updated_at, reservation_id, guest_name, date_from, date_to, nights,
              adults, children, status, channel, source, hosthub_notes
            ) VALUES (?1, ?2, ?2, ?3, ?4, ?5, ?6, ?7, 1, 0, ?8, ?9, 'hosthub_ical', ?10)`)
            .bind(crypto.randomUUID(), now, uid, guestName, checkIn, checkOut, nights, status, channel, hosthubNotes)
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
