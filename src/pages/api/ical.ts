export const prerender = false;

// iCal feed — HostHub pulls from this URL to sync external platforms
// Phase 3: read confirmed bookings from Supabase bookings table
export function GET() {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Casa Gaviota Baru//casagaviota.com//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Casa Gaviota Baru',
    'X-WR-TIMEZONE:America/Bogota',
    `X-WR-CALDESC:Availability calendar for Casa Gaviota Baru — Barú, Colombia`,
    `X-PHASE3-NOTE:Confirmed bookings will be read from Supabase bookings table`,
    `DTSTAMP:${now}`,
    'END:VCALENDAR',
  ];

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="casagaviota.ics"',
      'Cache-Control': 'public, max-age=900',
    },
  });
}
