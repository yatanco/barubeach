export interface BlockedRange {
  start: string;
  end: string;
}

// HostHub's date_to is the checkout date (exclusive) — a booking from
// 2026-07-30 to 2026-08-01 blocks the nights of Jul 30 and Jul 31 only.
export function isDateBlocked(date: Date, blocked: BlockedRange[]): boolean {
  return blocked.some(range => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    return date >= start && date < end;
  });
}

export function isRangeBlocked(checkIn: Date, checkOut: Date, blocked: BlockedRange[]): boolean {
  const current = new Date(checkIn);
  while (current < checkOut) {
    if (isDateBlocked(current, blocked)) return true;
    current.setDate(current.getDate() + 1);
  }
  return false;
}

// House policy: a single-night stay is fine on weeknights, but a stay that
// overlaps a Friday or Saturday night needs a 2-night minimum.
export function violatesWeekendMinStay(checkinISO: string, checkoutISO: string): boolean {
  if (!checkinISO || !checkoutISO) return false;
  const checkIn = new Date(checkinISO);
  const checkOut = new Date(checkoutISO);
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
  if (nights !== 1) return false;
  // ISO date-only strings parse as UTC midnight, so read the weekday in UTC
  // too — getDay() would apply the local offset and can roll onto the wrong day.
  const dow = checkIn.getUTCDay(); // 0 = Sun … 6 = Sat
  return dow === 5 || dow === 6;
}
