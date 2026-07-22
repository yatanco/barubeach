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
Databases → D1**, then bind it to this Pages/Workers project with the variable
name `DB`. Add the binding returned by Cloudflare to `wrangler.toml` using the
commented example at the bottom of that file.

Apply the schema from `migrations/0001_crm.sql` in the D1 dashboard console, or
with an authenticated Wrangler installation:

```bash
npx wrangler d1 migrations apply barubeach-crm --remote
```

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
fulfilment. Automatic Hosthub booking synchronization is intentionally deferred
from this minimal version.

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
