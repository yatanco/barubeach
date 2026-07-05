# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Marketing site for **Casa Gaviota Baru** at casagaviota.com — a private beach house in Barú, Colombia. Built with Astro 5 + React + Tailwind CSS, deployed on Cloudflare Pages. Phase 1: static marketing pages + inquiry forms via Web3Forms.

## Commands

```bash
npm install      # first time setup
npm run dev      # dev server at http://localhost:4321
npm run build    # production build → dist/
npm run preview  # preview production build locally
```

No test suite or linter is configured.

## Environment

Copy `.env.example` to `.env` and fill in:

```
PUBLIC_WEB3FORMS_KEY=your_key_here
```

The `PUBLIC_` prefix makes this available to client-side React via `import.meta.env.PUBLIC_WEB3FORMS_KEY`. Get a free key at web3forms.com. Forms submit to me@yatan.co.

## Architecture

**Pages** (`src/pages/`) are pure Astro — no server-side logic in Phase 1. Each page passes the Web3Forms key from `import.meta.env` down to interactive form components as a prop. Forms submit to Web3Forms and redirect to `/booking/confirm` on success.

**Forms** (`InquiryForm.tsx`, `DayTripForm.tsx`) are React islands (`client:load`). Both support EN/ES via a `lang` prop with translations co-located in a `T = { en: {…}, es: {…} }` object at the top of each file.

- `InquiryForm.tsx` — combined form with a Day Trip / Overnight Stay toggle (used on `/` and `/es`)
- `DayTripForm.tsx` — simpler day-trip-only form (used on `/daytrip` and `/es/pasadia`)
- `BookingForm.tsx` — old form from previous brand, now dead code; do not use

**Layout** (`src/layouts/Layout.astro`) wraps every page with `<html lang>`, SEO meta tags (OG + Twitter), Google Analytics (G-YCRQRM6R43), and the Google Fonts async-load pattern.

**Header** (`src/components/Header.astro`) takes `lang` and `altHref` props. `altHref` is the language-toggle destination — caller must set it explicitly (e.g. `/es` on `/`, `/daytrip` on `/es/pasadia`). Contains inline JS for hamburger menu and scroll shadow.

**WhatsApp prefill texts** — use exactly as specified (these feed analytics):
- Stay pages: `gaviotastay`
- Day trip pages: `gaviotadaytrip`
- Footer: `gaviotafooter`
- Confirm page: `gaviotaconfirm`
- Menu page: full sentence, not a tracking tag (it's an ordering flow, not a lead) — EN `Hola! Me gustaría pedir algo del menú.`, ES `Hola! Quisiera hacer un pedido del menú.`

**Menu page** (`/menu`, `/es/menu`) — food & drinks menu meant to be reached via a printed QR code at the property, not site navigation. Content lives in `src/data/menu.ts` (never hardcode menu items in components); rendered by `src/components/Menu.astro`, taking a `lang` prop like `Header`/`Footer`. Prices are stored in COP as plain numbers and formatted with `toLocaleString('es-CO')` for the period thousands-separator. Both page files pass `hideBookingWidgets` to `Layout.astro`, which suppresses the inquiry popup, exit-intent timer, and marketing sticky bar — the menu page has its own sticky WhatsApp-order bar instead and shouldn't compete with the booking funnel.

**Design tokens** in `tailwind.config.mjs`:
- Colors: `background`, `ink`, `muted`, `ocean` (+ `ocean-dark`, `ocean-light`), `sand` (+ variants), `whatsapp`
- Fonts: `font-serif` → Playfair Display, `font-sans` → Inter

**FAQ accordion** uses native `<details>/<summary>` HTML — no JS needed. The `group-open:rotate-45` Tailwind class animates the `+` icon.

## Routes

| Route | File | Language toggle destination |
|---|---|---|
| `/` | `src/pages/index.astro` | `/es` |
| `/daytrip` | `src/pages/daytrip.astro` | `/es/pasadia` |
| `/gallery` | `src/pages/gallery.astro` | `/gallery` |
| `/es` | `src/pages/es/index.astro` | `/` |
| `/es/pasadia` | `src/pages/es/pasadia.astro` | `/daytrip` |
| `/booking/confirm` | `src/pages/booking/confirm.astro` | `/booking/confirm` |
| `/menu` | `src/pages/menu.astro` | `/es/menu` |
| `/es/menu` | `src/pages/es/menu.astro` | `/menu` |

## Images

All images served from `/public/images/`. Reference them with regular `<img>` tags (not Astro's `<Image>` component — that requires images in `src/assets/`, not `public/`). Hero images: `loading="eager" fetchpriority="high"`. All others: `loading="lazy"`.

Expected filenames: `hero-1.jpg`, `hero-2.jpg`, `hero-3.jpg`, `house-1.jpg` through `house-4.jpg`, `beach-1.jpg` through `beach-3.jpg`, `food-1.jpg`, `food-2.jpg`, `daytrip-1.jpg`, `daytrip-2.jpg`, `logo.png`, `og-image.jpg`.

## Deployment

Pushes to `main` auto-deploy via Cloudflare Pages CI. The adapter is `@astrojs/cloudflare`. No `wrangler.toml` yet (Phase 2 will add D1, KV, Scheduled Workers).

## Phase 2 (planned)

See `TODO.md`. Key additions: HostHub availability sync, Cloudflare D1 database, Stripe/MercadoPago payments, Resend transactional emails, Supabase/Notion CRM, and a `/admin` panel.
