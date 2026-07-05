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
