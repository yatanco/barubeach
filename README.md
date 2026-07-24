# Casa Gaviota Baru — casagaviota.com

Marketing site for Casa Gaviota Baru, a private beach house in Barú, Colombia.

Built with Astro 5 + TypeScript + Tailwind CSS. Deployed on Cloudflare Pages.

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and set:

```
PUBLIC_META_PIXEL_ID=1039533654806987
```

### 3. Start dev server

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

---

## Build

```bash
npm run build
```

Output goes to `dist/`.

---

## Cloudflare Pages deployment

### Initial setup

1. Push this repo to GitHub.
2. In [Cloudflare Pages dashboard](https://pages.cloudflare.com):
   - **Create a project** → Connect to Git → Select this repo
   - **Build settings**:
     - Framework preset: `Astro`
     - Build command: `npm run build`
     - Build output directory: `dist`
   - **Environment variables** → Add:
     - `PUBLIC_META_PIXEL_ID` = `1039533654806987` (optional; this is also the built-in default)

3. Click **Save and Deploy**.

### Custom domain (casagaviota.com)

1. In Cloudflare Pages → your project → **Custom domains**
2. Add `casagaviota.com` and `www.casagaviota.com`
3. In your DNS settings (Cloudflare DNS recommended):
   - Add a `CNAME` record: `casagaviota.com` → `<your-project>.pages.dev`
   - Add a `CNAME` record: `www` → `<your-project>.pages.dev`
4. Cloudflare will issue an SSL certificate automatically.

### Subsequent deploys

Every push to `main` triggers an automatic deployment via Cloudflare Pages CI.

## Minimal CRM

The private CRM is served at `/admin`. It stores inquiries, Hosthub-linked
bookings, charges, payments, and operational statuses in Cloudflare D1.

### 1. Create and bind D1

Create a D1 database named `barubeach-crm` in **Cloudflare Dashboard → Storage &
Databases → D1**, then bind it to the `casagaviota-astro` Pages project with the
variable name `DB` in **Pages project → Settings → Functions → Bindings**.

Note: this project's Pages deployment currently has no `pages_build_output_dir`
set in `wrangler.toml`, so Cloudflare Pages ignores that file entirely for
production — the `[[d1_databases]]`/`[[kv_namespaces]]` blocks in it only
matter for local `wrangler d1 execute --local` / `wrangler pages dev` testing.
Production bindings (`DB`, `CACHE`) and secrets must be set via the dashboard
(or `wrangler pages secret put` for secrets), independently of this file.

Apply each schema file in order with an authenticated Wrangler installation —
run these once each, not via `wrangler d1 migrations apply` (this repo doesn't
use Wrangler's migrations-bookkeeping table, and `migrations/0003...sql` isn't
safe to re-run once real `guest_intent` data exists, since it rebuilds `leads`
from a fixed column list):

```bash
npx wrangler d1 execute barubeach-crm --remote --file=migrations/0001_crm.sql
npx wrangler d1 execute barubeach-crm --remote --file=migrations/0002_sync_log.sql
npx wrangler d1 execute barubeach-crm --remote --file=migrations/0003_lead_pipeline_and_hosthub_columns.sql
npx wrangler d1 execute barubeach-crm --remote --file=migrations/0004_lead_quote.sql
```

(As of this writing, all four have already been applied to the production
`barubeach-crm` database. `0004` is a set of plain `ALTER TABLE ... ADD COLUMN`
statements — safe to run once; re-running it will fail with "duplicate column
name" since SQLite has no `ADD COLUMN IF NOT EXISTS`.)

During migration, `/api/capture-lead` writes to D1 and continues mirroring to
`LEADS_WEBHOOK_URL`. Remove that Cloudflare secret once the Sheet is no longer
needed.

### 2. Protect the admin

Never expose `/admin` publicly. In **Cloudflare Zero Trust → Access →
Applications**, create a self-hosted application for:

```text
casagaviota.com/admin/*
```

Create an Allow policy containing only the email addresses that should manage
the CRM. All CRM mutations live below `/admin/api`, so the same rule protects
the pages and their actions.

### 3. Workflow

1. New website inquiries appear under Leads.
2. Create the confirmed reservation in Hosthub.
3. Open the lead, choose **Convert**, and paste the Hosthub booking ID.
4. Add accommodation, transport, food, or extra charges.
5. Record payments separately and update the operational status (for example,
   transport paid but driver still pending).

Hosthub remains the source of truth for reservation dates and availability.
D1 is the source of truth for inquiry follow-up, charges, payments, and service
fulfilment.

### 4. HostHub iCal sync

Bookings can be pulled automatically from HostHub's iCal export instead of
pasting each reservation in by hand. This only touches the `bookings` table —
leads and lead capture are untouched.

**Setup** (already done for production as of this writing — kept here for any
future environment, e.g. a staging D1 database):

1. Apply `migrations/0002_sync_log.sql` and `migrations/0003_lead_pipeline_and_hosthub_columns.sql`
   (the latter adds `reservation_id`/`channel`/`nights`/`source`/`hosthub_notes` to `bookings`
   — the sync can't upsert against a database that's only run `0001`):
   ```bash
   npx wrangler d1 execute barubeach-crm --remote --file=migrations/0002_sync_log.sql
   npx wrangler d1 execute barubeach-crm --remote --file=migrations/0003_lead_pipeline_and_hosthub_columns.sql
   ```
2. Set the iCal feed URL as a **Pages** secret (not `wrangler secret put`, which targets a
   Workers script, not this Pages project) — never hardcode it in a file:
   ```bash
   npx wrangler pages secret put HOSTHUB_ICAL_URL --project-name casagaviota-astro
   ```
   (paste the `https://app.hosthub.com/rentals/.../icalendar/...` URL from the
   HostHub dashboard when prompted).
3. Deploy (`git push` to `main`).
4. Trigger the first sync by clicking **🔄 Sync HostHub** in `/admin`, or by
   visiting `GET /admin/api/sync-hosthub` directly.

**What it does:** fetches the iCal feed, matches each event's `UID` against
`bookings.reservation_id`, and inserts new bookings / updates HostHub-owned
fields (`guest_name`, `date_from`, `date_to`, `nights`, `status`, `channel`,
`hosthub_notes`) on existing ones. It never touches charges, payments, or any
manually-entered booking field. Reservations that ended more than 30 days ago
and aren't already in D1 are skipped; blocked/unavailable calendar entries are
never inserted (only used to mark an existing booking `cancelled`).

**Automatic scheduling — not wired up yet.** `wrangler.toml` has a
`[triggers] crons` block, but this project deploys via Cloudflare Pages' git
CI, and Astro's Cloudflare adapter doesn't emit a `scheduled()` handler for
Pages Functions — so that block alone won't make the sync run on its own. To
get truly automatic hourly syncs, either point an external scheduler (a GitHub
Actions cron workflow, cron-job.org, etc. — behind a Cloudflare Access service
token) at `GET /admin/api/sync-hosthub`, or move this project's deploy to
`wrangler deploy` with a Worker entrypoint exporting both `fetch` and
`scheduled`. Until then, use the manual **Sync HostHub** button.

---

## Site structure

| Route | Description |
|---|---|
| `/` | English home (choose your experience + stay inquiry) |
| `/daytrip` | English day trip page |
| `/gallery` | Photo gallery |
| `/es` | Spanish home |
| `/es/pasadia` | Spanish day trip page |
| `/booking/confirm` | Thank-you page after form submission |

---

## Adding images

Place images in `public/images/` with these exact filenames:

```
hero-1.jpg, hero-2.jpg, hero-3.jpg
house-1.jpg, house-2.jpg, house-3.jpg, house-4.jpg
beach-1.jpg, beach-2.jpg, beach-3.jpg
food-1.jpg, food-2.jpg
daytrip-1.jpg, daytrip-2.jpg
logo.png
og-image.jpg
```

---

## Phase 2

See [TODO.md](./TODO.md) for the Phase 2 roadmap.
