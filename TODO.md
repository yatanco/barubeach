# Phase 2 — Future Architecture

Phase 1 (marketing site + inquiry forms via Web3Forms → me@yatan.co) is complete and live at casagaviota.com.

---

## Availability & Calendar

- [ ] **HostHub integration** — pull blocked dates from HostHub API on a schedule
- [ ] **Push new direct bookings** to HostHub to block dates across platforms
- [ ] **iCal feed** (`/api/calendar.ics`) for Airbnb / Booking.com / HostHub sync
- [ ] **Conflict detection** before confirming a new booking
- [ ] **Live availability calendar** widget on stay and day trip pages

### Implementation
- Cloudflare Scheduled Worker: runs every 15 minutes, polls HostHub, updates D1
- Webhook from HostHub on new external bookings (if supported)

---

## Database

- [ ] **Cloudflare D1** — SQLite-compatible, edge-native
  - Tables: `bookings`, `blocked_dates`, `pricing_rules`, `sync_log`
  - Migrations tracked in `migrations/`

---

## Payments

- [ ] **Stripe** — primary for international guests (credit/debit card)
- [ ] **MercadoPago** — for Colombian guests (PSE, Nequi, etc.)
- [ ] **PayPal** — optional secondary

### Flow
1. Guest selects dates → availability check (real-time Cloudflare Worker)
2. Guest fills in details → payment intent created server-side
3. On payment success → booking saved to D1, HostHub updated, confirmation emails sent
4. Deposit + balance split: deposit at booking, balance at house or before arrival

---

## Transactional emails — Resend

- [ ] **Guest confirmation email** — booking details, what to bring, transport tips
- [ ] **Admin notification email** — new booking alert with full guest details
- [ ] **Reminder emails** — 7 days and 1 day before arrival
- [ ] **Post-stay review request** — 2 days after checkout

---

## CRM / Lead management — Supabase or Notion

- [ ] Log every Web3Forms submission to a Supabase table (webhook → Worker)
- [ ] Or push to Notion database as a fallback CRM
- [ ] Dashboard view of all leads, their status, and follow-up notes

---

## Admin panel

- [ ] Simple password-protected admin at `/admin`
- [ ] View all bookings (upcoming, past, cancelled)
- [ ] Manually block date ranges
- [ ] Set pricing rules (per night, seasonal, weekend premium)
- [ ] View HostHub sync log (last sync time, any errors)
- [ ] Trigger manual sync
- [ ] Mark bookings as paid / confirmed / cancelled

### Auth
- Cloudflare Access (zero-trust, no code needed) or single admin password in env var

---

## Cloudflare infrastructure

- [ ] **Scheduled Worker** — HostHub sync (every 15 min)
- [ ] **API Worker** — booking creation, availability check, payment webhooks
- [ ] **D1 bindings** in `wrangler.toml`
- [ ] **KV** — rate limiting, session tokens

---

## SEO & discoverability

- [ ] Structured data (JSON-LD) for `LodgingBusiness` schema
- [ ] `sitemap.xml` via `@astrojs/sitemap`
- [ ] `robots.txt`
- [ ] hreflang tags for EN/ES language alternates
- [ ] WhatsApp Business API integration for automated reply / CRM logging
