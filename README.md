# Baru Beach House — barubeach.com

Marketing site for Baru Beach House, a private beach house in Barú, Colombia.

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
PUBLIC_WEB3FORMS_ACCESS_KEY=your_actual_key_here
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

1. Push this repo to GitHub (or GitLab).
2. In [Cloudflare Pages dashboard](https://pages.cloudflare.com):
   - **Create a project** → Connect to Git → Select this repo
   - **Build settings**:
     - Framework preset: `Astro`
     - Build command: `npm run build`
     - Build output directory: `dist`
   - **Environment variables** → Add:
     - `PUBLIC_WEB3FORMS_ACCESS_KEY` = your Web3Forms key

3. Click **Save and Deploy**.

### Custom domain (barubeach.com)

1. In Cloudflare Pages → your project → **Custom domains**
2. Add `barubeach.com` and `www.barubeach.com`
3. In your DNS settings (Cloudflare DNS recommended):
   - Add a `CNAME` record: `barubeach.com` → `<your-project>.pages.dev`
   - Add a `CNAME` record: `www` → `<your-project>.pages.dev`
4. Cloudflare will issue an SSL certificate automatically.

### Subsequent deploys

Every push to the `main` branch triggers an automatic deployment via Cloudflare Pages CI.

---

## Site structure

| Route | Description |
|---|---|
| `/` | English stay page |
| `/daytrip` | English day trip page |
| `/gallery` | Photo gallery |
| `/es` | Spanish stay page |
| `/es/pasadia` | Spanish day trip page |
| `/booking/confirm` | Thank-you page after form submission |

---

## Adding real photos

Replace placeholder images in `public/images/`. Photos are already in `public/images/` — filenames are referenced directly in the page files.

---

## Phase 2

See [TODO.md](./TODO.md) for the Phase 2 roadmap.
