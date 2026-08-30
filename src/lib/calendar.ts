import { rangeCoversNight, type ConflictInfo } from './crm-availability.ts';

export interface CalendarDay {
  dateISO: string;
  inMonth: boolean;
  isToday: boolean;
  bookings: ConflictInfo[];
  leads: ConflictInfo[];
  continuesLeft: boolean; // the dominant booking (if any) also occupies the day before
  continuesRight: boolean; // the dominant booking (if any) also occupies the day after
}

// All date math below is done in UTC via Date.UTC()/getUTC*() — never
// `new Date(isoString)` local-timezone arithmetic and never getDay()/getDate()
// — so a stay never silently shifts into the previous or following day
// depending on the server's local timezone (see src/lib/availability.ts's
// violatesWeekendMinStay for the same established convention).
function isoFromUTC(year: number, monthIndex0: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex0, day)).toISOString().slice(0, 10);
}

// Monday-first 6-row grid covering the requested month plus enough padding
// days from the adjacent months to complete whole weeks.
export function buildMonthGridDates(year: number, monthIndex0: number): { dateISO: string; inMonth: boolean }[] {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex0, 1));
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const days: { dateISO: string; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - firstWeekday + 1;
    const inMonth = dayOffset >= 1 && dayOffset <= daysInMonth;
    // Date.UTC normalizes an out-of-range day (0 or > daysInMonth) into the
    // adjacent month automatically — that's exactly the padding day we want.
    days.push({ dateISO: isoFromUTC(year, monthIndex0, dayOffset), inMonth });
  }
  return days;
}

export function addMonths(year: number, monthIndex0: number, delta: number): { year: number; monthIndex0: number } {
  const total = monthIndex0 + delta;
  return { year: year + Math.floor(total / 12), monthIndex0: ((total % 12) + 12) % 12 };
}

export function parseMonthParam(param: string | null, now: Date = new Date()): { year: number; monthIndex0: number } {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split('-').map(Number);
    if (m >= 1 && m <= 12) return { year: y, monthIndex0: m - 1 };
  }
  return { year: now.getUTCFullYear(), monthIndex0: now.getUTCMonth() };
}

export function monthParam(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`;
}

// Buckets already-fetched booking/lead candidates (see the calendar page's
// queries, which reuse the same active-status + unlinked-lead filters as
// HARD_CONFLICT_CANDIDATES_SQL / SOFT_CONFLICT_CANDIDATES_SQL) onto each
// night of the grid using the shared half-open rangeCoversNight() test —
// the same overlap rule findConflicts() and checkAvailability() use, just
// applied per-night instead of range-vs-range.
export function buildCalendarMonth(
  year: number,
  monthIndex0: number,
  bookingCandidates: ConflictInfo[],
  leadCandidates: ConflictInfo[],
  todayISO: string,
): CalendarDay[] {
  const gridDates = buildMonthGridDates(year, monthIndex0);

  const days: CalendarDay[] = gridDates.map(({ dateISO, inMonth }) => ({
    dateISO,
    inMonth,
    isToday: dateISO === todayISO,
    bookings: bookingCandidates.filter((b) => rangeCoversNight(b.dateFrom, b.dateTo, dateISO)),
    leads: leadCandidates.filter((l) => rangeCoversNight(l.dateFrom, l.dateTo, dateISO)),
    continuesLeft: false,
    continuesRight: false,
  }));

  // Visual continuity: a day's dominant booking (the one shown as the solid
  // bar) is continuous with a neighbor only if that same booking id also
  // occupies the neighboring day — this is what lets the bar run flush
  // across a calendar row without implying a booking exists that doesn't.
  for (let i = 0; i < days.length; i++) {
    const dominant = days[i].bookings[0];
    if (!dominant) continue;
    const col = i % 7;
    const prev = col > 0 ? days[i - 1] : undefined; // no left neighbor at the start of a row —
    const next = col < 6 ? days[i + 1] : undefined; // a range that wraps starts a fresh flush run on the next row
    days[i].continuesLeft = Boolean(prev && prev.bookings.some((b) => b.id === dominant.id));
    days[i].continuesRight = Boolean(next && next.bookings.some((b) => b.id === dominant.id));
  }

  return days;
}
