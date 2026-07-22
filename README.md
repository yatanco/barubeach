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

Edit `.env` and add your [Web3Forms](https://web3forms.com) access key:

```
PUBLIC_WEB3FORMS_KEY=your_actual_key_here
PUBLIC_META_PIXEL_ID=1039533654806987
```

Get a free key at [web3forms.com](https://web3forms.com). Leads will be emailed to `me@yatan.co`.

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
     - `PUBLIC_WEB3FORMS_KEY` = your Web3Forms key
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
