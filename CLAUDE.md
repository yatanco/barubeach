# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Marketing site for **Casa Gaviota Baru** at casagaviota.com — a private beach house in Barú, Colombia. Built with Astro 5 + React + Tailwind CSS, deployed on Cloudflare Pages. Lead capture is WhatsApp-first: pages drive visitors to a WhatsApp deep link (popup, inline form, or planner), and every submission is also saved to D1 for follow-up in the `/admin` CRM.

## Commands

```bash
npm install      # first time setup
npm run dev      # dev server at http://localhost:4321
npm run build    # production build → dist/
npm run preview  # preview production build locally
npm test         # Node test runner: sales context and commercial calculations
```

No linter is configured.

## Environment

Copy `.env.example` to `.env`. Nothing is required for local dev of the marketing pages — all env vars are optional:

- `PUBLIC_META_PIXEL_ID` — Meta Pixel ID (has a working hardcoded fallback in `Layout.astro`, so this is rarely needed).
- `HOSTHUB_API_KEY`, `HOSTHUB_RENTAL_ID`, `HOSTHUB_BASE_URL` — HostHub PMS credentials for `/api/availability`. Without these the endpoint returns `stale: true` and the calendar shows nothing blocked.
- `HOSTHUB_ICAL_URL` — HostHub iCal feed URL used by the `/admin` booking sync (see **Admin CRM** below). Without it, `syncHostHub()` returns an error result and logs it to `sync_log` instead of throwing.
- `LEADS_WEBHOOK_URL` — legacy Google Sheets mirror for `/api/capture-lead`. D1 is the primary store; this is a fallback that can be retired once it's no longer needed.
- `BOLD_PAYMENT_LINK` — evergreen checkout URL inserted into copied deposit/balance messages. The application has a fallback, but production should configure the intended link explicitly.
- `DB` — the D1 binding used by `/admin` (see **Admin CRM** below). Bound via `wrangler.toml`, not `.env`.

There is no Web3Forms (or any other) key to configure — that integration was removed; forms capture straight to D1/WhatsApp.

## Architecture

**Pages** (`src/pages/`) are pure Astro — no server-side rendering logic on the marketing pages themselves (the `/admin` CRM pages are the exception; see below). `Layout.astro` mounts a global `WhatsAppPopup` (see **Lead capture** below) unless the page passes `hideBookingWidgets`.

**Lead capture** — three surfaces, all writing through `captureLead()` (`src/lib/leads.ts`) to `/api/capture-lead`, which stores to D1 and optionally mirrors to `LEADS_WEBHOOK_URL`:
- `WhatsAppPopup.tsx` — the global floating popup mounted by `Layout.astro` on every page (unless `hideBookingWidgets`). Opens on a floating button, an exit-intent, a 40-second timer, or a `window.dispatchEvent(new CustomEvent('open-wa-popup'))` call from any page.
- `WAInlineForm.tsx` — embedded day-trip/stay inquiry form, used inline on `/daytrip` and `/es/pasadia`.
- `EscapePlanner.tsx` — the multi-step price-estimate flow on `/plan` and `/es/plan`. Its final step also offers to leave an email for follow-up (captured as a lead — there's no automated email sender wired up, so don't imply one in the copy).

All three build a `wa.me` link via `waLink()` (`src/lib/whatsapp.ts`, which also exports `WHATSAPP_NUMBER`) and render the WhatsApp glyph via the shared `WhatsAppIcon` component (`src/components/icons/WhatsAppIcon.astro` for `.astro` files, `WhatsAppIcon.tsx` for React) — reuse these rather than re-inlining the SVG path or the phone number.

`InquiryForm.tsx`, `DayTripForm.tsx`, `BookingForm.tsx`, and `WhatsAppButton.astro` have all been removed — they were superseded by the three components above and were unused.

**WhatsApp prefill texts** — use exactly as specified (these feed analytics):
- Stay pages: `gaviotastay`
- Day trip pages: `gaviotadaytrip`
- Footer: `gaviotafooter`
- Confirm page: `gaviotaconfirm`
- Menu page: full sentence, not a tracking tag (it's an ordering flow, not a lead) — EN `Hola! Me gustaría pedir algo del menú.`, ES `Hola! Quisiera hacer un pedido del menú.`

**Layout** (`src/layouts/Layout.astro`) wraps every page with `<html lang>`, SEO meta tags (OG + Twitter), Google Analytics (G-YCRQRM6R43), Meta Pixel, and the Google Fonts async-load pattern.

**Header** (`src/components/Header.astro`) takes `lang` and `altHref` props. `altHref` is the language-toggle destination — caller must set it explicitly (e.g. `/es` on `/`, `/daytrip` on `/es/pasadia`). Contains inline JS for hamburger menu and scroll shadow.

**Menu page** (`/menu`, `/es/menu`) — food & drinks menu meant to be reached via a printed QR code at the property, not site navigation. Content lives in `src/data/menu.ts` (never hardcode menu items in components); rendered by `src/components/Menu.astro`, taking a `lang` prop like `Header`/`Footer`. Prices are stored in COP as plain numbers and formatted with `toLocaleString('es-CO')` for the period thousands-separator. Both page files pass `hideBookingWidgets` to `Layout.astro`, which suppresses the inquiry popup, exit-intent timer, and marketing sticky bar — the menu page has its own sticky WhatsApp-order bar instead and shouldn't compete with the booking funnel.

**Design tokens** in `tailwind.config.mjs`:
- Colors: `background`, `ink`, `muted`, `ocean` (+ `ocean-dark`, `ocean-light`), `sand` (+ variants), `whatsapp`
- Fonts: `font-serif` → Playfair Display, `font-sans` → Inter

**FAQ accordion** uses native `<details>/<summary>` HTML — no JS needed. The `group-open:rotate-45` Tailwind class animates the `+` icon.

## Admin CRM

`/admin` is a real, shipped feature (not just a Phase 2 idea) — a lightweight, mobile-first CRM backed by Cloudflare D1. Leads and bookings are treated as **one entity at different stages** — they share a single status pipeline and a single detail-page component; the only real differences are that bookings have a HostHub reservation, and Airbnb bookings have accommodation already paid by Airbnb.

- **Schema**: `migrations/0001_crm.sql` defines `leads`, `bookings`, `charges`, `payments`; later migrations extend it — `migrations/0010_unified_pipeline.sql` is the most structurally significant (unified statuses, flat food/transport/accommodation fields, dropped `payment_links`/`provider_payments`). Treat this schema as fixed unless explicitly asked to migrate it — the `status`/`category`/`operational_status`/`channel`/`source`/`guest_intent` columns are `CHECK`-constrained, so any new value needs a migration, not just a code change.
  - **Unified status pipeline** (`UNIFIED_STATUSES` in `src/lib/crm.ts`, shared by `leads.status` and `bookings.status`): `new`, `replied`, `quoted`, `deposit_requested`, `deposit_paid`, `confirmed`, `upsell_pending`, `upsell_confirmed`, `in_house`, `balance_requested`, `completed`, `lost`, `cancelled`. `replied` is lead-only in the visible pipeline and starts its manual Day 3 / Day 7 follow-up cadence. `DIRECT_PIPELINE` is used for direct/booking.com bookings; `AIRBNB_PIPELINE` starts at `confirmed`. `bookings.status` also accepts legacy `checked_in`, normalized for display as `in_house`.
  - `leads.guest_intent` (nullable): the trip-occasion dropdown (`GUEST_INTENTS` in `src/lib/crm.ts`) shown on the manual "Add Lead" form.
  - `leads.accommodation_amount`/`food_amount`/`food_confirmed`/`transport_amount`/`transport_confirmed`: flat operator-entered COP amounts (cents) — a lead has no charges relationship until it's converted to a booking, so it needs its own copy of these fields.
  - `bookings.channel`: `direct`, `airbnb`, `booking.com`. `bookings.source`: `manual` or `hosthub_ical`. `bookings.reservation_id` is the shared identifier for both a manually-pasted HostHub booking ID and a synced iCal `UID` (unique, used as the sync's upsert key). `bookings.food_amount`/`food_confirmed`/`transport_amount`/`transport_confirmed` mirror the lead columns; `bookings.cost_staff_cents`/`cost_food_cents`/`cost_transport_cents` are flat operator-entered costs. Accommodation for bookings is **not** a flat column — it stays charge-based (a single `charges` row with `category='accommodation'`), since that infrastructure already existed with real data; Airbnb bookings instead use `bookings.airbnb_payout_cents`.
  - `charges.category` includes `boat` alongside `accommodation`/`transport`/`food`/`extra`. `charges.booking_id` and `charges.lead_id` are both nullable (at least one required) — a `category='extra', description='Payments received'` charge is the anchor every "Payments received" entry attaches to, since `payments.charge_id` is a required FK. Pre-migration-0010 charges (e.g. old per-category food/transport charges with payments already against them) are left in place and still show up in Payments Received via the join — only new revenue tracking moved to the flat columns.
- **DB access**: `src/lib/db.ts` (`getDb`/`requireDb`, form-parsing helpers, `redirectBack`, `boldPaymentLink`). `src/lib/crm.ts` has shared formatting (`money`, `shortDate`, `timeAgo`, `channelBadgeClass`) and the status/pipeline/category/channel enums.
- **Detail page**: `src/components/admin/UnifiedRecordDetail.astro` is the single component rendering both `/admin/leads/[id]` and `/admin/bookings/[id]`. Lead pages include **Copy for ChatGPT**: `src/lib/sales-suggestion.ts` builds a deterministic, server-rendered prompt from current CRM facts; the browser only previews or copies it and makes no AI request. See `docs/head-of-sales.md`. Other sections cover status, follow-up, accommodation, food/transport, totals, payments, costs, notes, and HostHub conversion/linkage.
- **Dashboard** (`src/pages/admin/index.astro`): the Sales Today strip surfaces new leads, replies needed, follow-ups due, unpaid quotes, open lead value, and a short Attention needed list. The unified list adds a deterministic next action per record, urgency ordering, filters, and inline status changes. A converted lead is excluded because its linked booking is its continuation.
- **Export**: `GET /admin/api/export` streams all leads as CSV — linked from the CRM nav bar (`AdminLayout.astro`), not from the dashboard body.
- **Manual entry**: the "Add Lead" modal on the dashboard posts to `POST /admin/api/leads/create` for backfilling leads collected outside the site (e.g. WhatsApp history). These are stored as `status='new'`, `source='whatsapp_history'`.
- **Payments**: no payment-provider API integration — `BOLD_PAYMENT_LINK` is a static evergreen Cloudflare secret (guest enters their own amount at checkout); `boldPaymentLink()` in `src/lib/db.ts` falls back to a known-good link if the secret isn't set, and the admin UI shows a warning (never surfaced to the guest) when it's on the fallback.
- **HostHub iCal sync**: `src/lib/hosthub-sync.ts` (`syncHostHub`) fetches the `HOSTHUB_ICAL_URL` secret, parses `VEVENT` blocks, and upserts into `bookings` keyed on `reservation_id`. It only ever writes HostHub-owned columns (guest name, dates, nights, status, channel, hosthub_notes) — charges, payments, and any manually-entered field are never touched on re-sync. `GET /admin/api/sync-hosthub` triggers it manually (also wired to the "🔄 Sync HostHub" button on the dashboard); each run logs a row to `sync_log`. There is **no automatic schedule wired up** — see README's "HostHub iCal sync" section for why the `wrangler.toml` cron block alone doesn't run it under this project's Cloudflare Pages git-CI deploy path.
- Auth is via Cloudflare Access, not app code — `/admin/*` must be locked down in **Cloudflare Zero Trust → Access** before this is ever deployed publicly. See README.md for setup steps.
- Mobile-first by design (used primarily on a phone): every tap target ≥44px, inputs at 16px font (prevents iOS zoom-on-focus) — both already enforced globally in `AdminLayout.astro`'s CSS, not per-component.
- Admin light/dark mode is implemented in `AdminLayout.astro`, follows the system preference on first use, and persists the operator's explicit choice in local storage. Keep new admin colors on the shared CSS variables so both themes remain legible.

Hosthub remains the source of truth for reservation dates/availability; D1 is the source of truth for inquiry follow-up, charges, payments, and fulfilment.

## Routes

| Route | File | Language toggle destination |
|---|---|---|
| `/` | `src/pages/index.astro` | `/es` |
| `/daytrip` | `src/pages/daytrip.astro` | `/es/pasadia` |
| `/plan` | `src/pages/plan.astro` | `/es/plan` |
| `/gallery` | `src/pages/gallery.astro` | `/gallery` |
| `/blog` | `src/pages/blog/index.astro` | n/a — Spanish-only content, no EN equivalent |
| `/es` | `src/pages/es/index.astro` | `/` |
| `/es/pasadia` | `src/pages/es/pasadia.astro` | `/daytrip` |
| `/es/plan` | `src/pages/es/plan.astro` | `/plan` |
| `/booking/confirm` | `src/pages/booking/confirm.astro` | `/booking/confirm` |
| `/menu` | `src/pages/menu.astro` | `/es/menu` |
| `/es/menu` | `src/pages/es/menu.astro` | `/menu` |
| `/admin` | `src/pages/admin/index.astro` | n/a — internal CRM, not localized |

## Images

All images served from `/public/images/`. Reference them with regular `<img>` tags (not Astro's `<Image>` component — that requires images in `src/assets/`, not `public/`). Hero images: `loading="eager" fetchpriority="high"`. All others: `loading="lazy"`.

Most photos exist in both `.jpg` and a much smaller `.webp` export (e.g. `food-2.jpg` is 2.7MB vs `food-2.webp` at 228KB) — **use the `.webp` version** in any new page. `/`, `/es`, `/daytrip`, `/es/pasadia`, and `/gallery` all reference `.webp`.

Expected basenames: `hero-1`, `hero-2`, `hero-3`, `house-1` through `house-4`, `beach-1` through `beach-3`, `food-1`, `food-2`, `daytrip-1`, `daytrip-2`, plus `logo.png` and `og-image.jpg` (OG image is kept as `.jpg` for social-crawler compatibility).

## Deployment

Pushes to `main` auto-deploy via Cloudflare Pages CI. The adapter is `@astrojs/cloudflare`. `wrangler.toml` has a `CACHE` KV namespace (availability cache) and a commented-out `[[d1_databases]]` block for the CRM `DB` binding — uncomment and fill in once the D1 database is created (see README.md).

## Phase 2 / 3 (remaining)

Basic CRM (D1 schema, `/admin` dashboard, leads/bookings/charges/payments, CSV export, lead status pipeline, HostHub iCal booking sync) is already shipped — see **Admin CRM** above. See `TODO.md` for the fuller roadmap, though it predates the CRM work above and is not fully current. Still outstanding: a truly automatic (cron-driven) HostHub sync — today it's a manual button, see README — plus Stripe/MercadoPago payments, Resend transactional emails, and a Supabase/Notion-backed CRM view beyond `/admin`.
