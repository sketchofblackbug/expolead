# ExpoLead

Mobile-first exhibition lead capture built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

Visitors scan a booth QR → open `/lead/[boothId]` → speak (or type) name & phone → the lead is saved. Exhibitors review everything on `/admin` and print codes from `/qr-generator`.

## Features

- Voice capture (Web Speech API) with continuous “Start Voice Capture” mode
- Separate Speak Name / Speak Phone buttons (optional)
- Indian phone auto-formatting + validation
- Public admin dashboard with search, booth filter, and CSV export
- Booth QR generator (PNG download + copy link)
- Supabase persistence with local demo fallback

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Product home |
| `/lead/[boothId]` | Visitor capture page (QR target) |
| `/qr-generator` | Printable booth QR codes |
| `/admin` | Leads dashboard |

## Quick start

```bash
cd expolead
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase env vars, leads save to `localStorage` and `/admin` shows demo + local data.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the full script in `supabase/schema.sql`.
3. If you previously applied an auth-only SELECT policy, also run `supabase/migrate-public-select.sql`.
4. In **Project Settings → API**, copy:
   - Project URL
   - `anon` `public` key
5. Put them in `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

6. Restart `npm run dev`.

### RLS model (current)

- Anyone can **INSERT** leads (public capture)
- Anyone can **SELECT** leads (temporary, so `/admin` works without login)
- **UPDATE / DELETE** remain authenticated-only

When you add login later, replace the public SELECT policy with an authenticated-only policy.

Optional server key (never expose to the browser):

```bash
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## Generate QR codes

1. Start the app and open `/qr-generator`.
2. Enter a Booth ID / Name (e.g. `hall-a-12`).
3. The QR encodes `{NEXT_PUBLIC_APP_URL}/lead/{boothId}`.
4. Click **Download PNG**, print it large, and place it at the booth.
5. Use **Copy link** to share the capture URL digitally.

Set your production domain before printing:

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

If unset, the generator uses the current browser origin.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in [vercel.com](https://vercel.com) → **Add New Project**.
3. Framework preset: **Next.js** (auto-detected).
4. Add environment variables:
   - `NEXT_PUBLIC_APP_URL` → your Vercel URL (e.g. `https://expolead.vercel.app`) or custom domain
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (optional) `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy.
6. After the first deploy, update `NEXT_PUBLIC_APP_URL` to the final domain and redeploy so QR codes use the correct host.
7. Re-print booth QRs if the domain changed.

### Custom domain

Vercel → Project → **Settings → Domains** → add `yourdomain.com`, then set:

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

## Visitor tip

Voice capture works best in **Chrome** (Android/desktop) over HTTPS or localhost. Safari support for Web Speech API is limited — typing still works everywhere.

## Project structure

```text
src/
  app/                 # App Router pages + layout
  components/          # UI (capture, admin, QR, header)
  lib/                 # Supabase, phone/speech helpers, CSV
  types/               # Shared TypeScript types
supabase/
  schema.sql           # Table + RLS
  migrate-public-select.sql
```

## License

Private / internal use unless you add a license file.
