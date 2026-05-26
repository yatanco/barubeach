# Phase 2 — Future Architecture

This document tracks planned features for Phase 2 of barubeach.com.
Phase 1 (marketing site + inquiry forms via Web3Forms) is complete.

---

## Database

- [ ] **Cloudflare D1** — SQLite-compatible, edge-native
  - Tables: `bookings`, `blocked_dates`, `pricing_rules`, `sync_log`
  - Migrations tracked in `migrations/`

---

## Availability sync — HostHub

- [ ] Pull blocked dates from HostHub API on a schedule
- [ ] Push new direct bookings to HostHub to block dates
- [ ] Expose an iCal feed (`/api/calendar.ics`) for Airbnb / Booking.com / HostHub
- [ ] Bidirectional sync: respect existing bookings on all platforms
- [ ] Conflict detection before confirming a new booking

### Implementation
- Cloudflare Scheduled Worker: runs every 15 minutes, polls HostHub, updates D1
- Webhook from HostHub on new external bookings (if supported)

---

## Payments

- [ ] **Stripe** — primary for international guests (credit/debit card)
- [ ] **PayPal** — optional secondary
- [ ] **MercadoPago** — for Colombian guests (PSE, Nequi, etc.)

### Flow
1. Guest selects dates → availability check against D1 (real-time Cloudflare Worker)
2. Guest fills in details → payment intent created server-side
3. On payment success → booking saved to D1, HostHub updated, emails sent
4. Deposit + balance split: deposit at booking, balance at house or before arrival

---

## Transactional emails — Resend

- [ ] **Guest confirmation email** — booking details, what to bring, transport tips
- [ ] **Admin notification email** — new booking alert with full guest details
- [ ] **Reminder emails** — 7 days and 1 day before arrival
- [ ] **Post-stay review request** — 2 days after checkout

---

## Admin panel

- [ ] Simple password-protected admin at `/admin`
- [ ] View all bookings (upcoming, past, cancelled)
- [ ] Manually block date ranges
- [ ] Set pricing rules (per night, seasonal, weekend premium)
- [ ] View HostHub sync log (last sync time, any errors)
- [ ] Trigger manual sync
- [ ] Mark bookings as paid / confirmed / cancelled

### Tech
- Cloudflare Pages with server-side rendering for admin routes
- Session-based auth with a single admin password (stored as env var)
- Or integrate with Cloudflare Access for zero-trust auth

---

## Cloudflare infrastructure

- [ ] **Scheduled Worker** — HostHub sync (every 15 min)
- [ ] **API Worker** — booking creation, availability check, payment webhooks
- [ ] **D1 bindings** in `wrangler.toml`
- [ ] **KV** — rate limiting, session tokens
- [ ] **R2** — if storing uploaded photos or documents

---

## Other

- [ ] Structured data (JSON-LD) for `LodgingBusiness` schema
- [ ] `sitemap.xml` via `@astrojs/sitemap`
- [ ] `robots.txt`
- [ ] Google Analytics or Cloudflare Web Analytics
- [ ] WhatsApp Business API integration for automated reply / CRM logging
- [ ] Multi-language SEO hreflang tags
