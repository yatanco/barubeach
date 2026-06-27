# Roadmap

Phase 1 (marketing site + inquiry forms via Web3Forms → me@yatan.co) is complete and live at casagaviota.com.

Phase 2 (WhatsApp popup, EscapePlanner /plan, HostHub availability API, iCal stub, Google Sheets lead capture) is complete.

---

## Phase 3 — Booking Engine

### Payments

- [ ] **Stripe** — primary for international guests (credit/debit card)
- [ ] **MercadoPago** — for Colombian guests (PSE, Nequi, etc.)
- [ ] Deposit at booking + balance reminder before arrival
- [ ] Webhook handlers for payment success/failure → save to D1 → push to HostHub

### Database — Cloudflare D1

- [ ] Tables: `bookings`, `pricing_rules`, `sync_log`
- [ ] Migrations tracked in `migrations/`
- [ ] Replace Google Sheets lead capture with D1 insert on `/api/capture-lead`

### Transactional emails — Resend

- [ ] Guest confirmation email — booking details, what to bring, transport tips
- [ ] Admin notification — new booking alert with full guest details
- [ ] Reminder at 7 days and 1 day before arrival
- [ ] Post-stay review request 2 days after checkout

### HostHub push

- [ ] On confirmed (paid) booking → `POST /api/v1/rentals/{id}/reservations` to block the dates
- [ ] Cloudflare Scheduled Worker for periodic re-sync (belt-and-suspenders)

### iCal — complete

- [ ] `/api/ical.ts` currently returns an empty calendar stub
- [ ] Phase 3: read confirmed bookings from D1 and emit VEVENT blocks per booking

### Admin panel — `/admin`

- [ ] View all bookings (upcoming, past, cancelled)
- [ ] Manually block/unblock date ranges
- [ ] Set seasonal pricing rules
- [ ] HostHub sync log (last sync, errors)
- [ ] Mark bookings as paid / confirmed / cancelled
- [ ] Auth: Cloudflare Access (zero-trust) or single admin password in env var

### Dynamic pricing

- [ ] Seasonal rates (high: Dec–Jan, Semana Santa, Puentes; low: rest of year)
- [ ] Weekend premium
- [ ] Minimum nights rules

---

## Phase 4 — Growth & SEO

- [ ] Structured data (JSON-LD `LodgingBusiness`) on homepage
- [ ] `sitemap.xml` via `@astrojs/sitemap`
- [ ] `robots.txt`
- [ ] hreflang tags for EN/ES alternates
- [ ] WhatsApp Business API for automated inquiry reply + CRM logging
- [ ] Supabase or Notion CRM view of all leads + follow-up notes
