export interface BlockedRange {
  start: string;
  end: string;
}

export function isDateBlocked(date: Date, blocked: BlockedRange[]): boolean {
  return blocked.some(range => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    return date >= start && date <= end;
  });
}

export function isRangeBlocked(checkIn: Date, checkOut: Date, blocked: BlockedRange[]): boolean {
  const current = new Date(checkIn);
  while (current <= checkOut) {
    if (isDateBlocked(current, blocked)) return true;
    current.setDate(current.getDate() + 1);
  }
  return false;
}
