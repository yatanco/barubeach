import type { D1Database } from './db';

// Overlap/conflict checking for lead & booking date ranges against the CRM's
// own bookings/leads tables — unrelated to src/lib/availability.ts, which
// answers a different question (which calendar days does HostHub block for
// the guest-facing booking widget).

export interface ConflictInfo {
  id: string;
  guestName: string | null;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export interface AvailabilityResult {
  hardConflicts: ConflictInfo[];
  softConflicts: ConflictInfo[];
}

function mapConflictRow(row: any): ConflictInfo {
  return { id: row.id, guestName: row.guest_name, status: row.status, dateFrom: row.date_from, dateTo: row.date_to };
}

// Bulk candidate sets for the dashboard list view, where checking every row
// individually would mean 2N queries — fetch each table's active rows once,
// then overlap-check in JS per item via findConflicts().
export const HARD_CONFLICT_CANDIDATES_SQL = `SELECT id, guest_name, status, date_from, date_to FROM bookings WHERE status NOT IN ('cancelled','lost')`;
export const SOFT_CONFLICT_CANDIDATES_SQL = `SELECT id, guest_name, status, date_from, date_to FROM leads
  WHERE status NOT IN ('lost','cancelled') AND date_from IS NOT NULL AND date_to IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM bookings WHERE bookings.lead_id = leads.id)`;

export { mapConflictRow };

export function findConflicts(
  candidates: ConflictInfo[],
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
  excludeId: string,
): ConflictInfo[] {
  if (!dateFrom || !dateTo) return [];
  const from = dateFrom.slice(0, 10);
  const to = dateTo.slice(0, 10);
  return candidates.filter((c) => {
    if (c.id === excludeId) return false;
    const cFrom = c.dateFrom.slice(0, 10);
    const cTo = c.dateTo.slice(0, 10);
    return !(cTo <= from || cFrom >= to);
  });
}

// Single-record lookup used by the lead/booking detail page — recomputed on
// every page load (never stored) so it always reflects current HostHub sync
// state rather than a stale snapshot.
export async function checkAvailability(
  db: D1Database,
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
  excludeKind: 'lead' | 'booking',
  excludeId: string,
): Promise<AvailabilityResult> {
  if (!dateFrom || !dateTo) return { hardConflicts: [], softConflicts: [] };
  const from = dateFrom.slice(0, 10);
  const to = dateTo.slice(0, 10);
  const excludeBookingId = excludeKind === 'booking' ? excludeId : '';
  const excludeLeadId = excludeKind === 'lead' ? excludeId : '';

  const [hardResult, softResult] = await Promise.all([
    db.prepare(
      `SELECT id, guest_name, status, date_from, date_to FROM bookings
       WHERE status NOT IN ('cancelled','lost') AND id != ?3
         AND NOT (substr(date_to,1,10) <= ?1 OR substr(date_from,1,10) >= ?2)`,
    ).bind(from, to, excludeBookingId).all<any>(),
    db.prepare(
      `SELECT id, guest_name, status, date_from, date_to FROM leads
       WHERE status NOT IN ('lost','cancelled') AND id != ?3
         AND date_from IS NOT NULL AND date_to IS NOT NULL
         AND NOT (substr(date_to,1,10) <= ?1 OR substr(date_from,1,10) >= ?2)`,
    ).bind(from, to, excludeLeadId).all<any>(),
  ]);

  return {
    hardConflicts: hardResult.results.map(mapConflictRow),
    softConflicts: softResult.results.map(mapConflictRow),
  };
}
