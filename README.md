# ExpoLead

Mobile-first exhibition lead capture built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**, with optional **WhatsApp Cloud API** follow-up.

Visitors scan a booth QR → open `/lead/[boothId]` → speak (or type) name & phone → consent → the lead is saved. If WhatsApp is configured and the booth has WhatsApp enabled, a template message is sent **server-side** after save.

## Features

- Voice capture (Web Speech API) with continuous “Start Voice Capture” mode
- Indian phone auto-formatting + validation
- Required WhatsApp/phone consent stored with each lead
- Booth settings: brand name, location, brochure URL, WhatsApp toggle
- Automatic WhatsApp template follow-up (Meta Cloud API) with 24h dedupe
- Webhook status updates (`sent` → `delivered` / `read` / `failed`)
- Protected admin dashboard with WhatsApp status, Resend, booth CRUD, and test send
- Booth QR generator (PNG download + copy link)

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Product home |
| `/lead/[boothId]` | Visitor capture page (QR target) |
| `/qr-generator` | Printable booth QR codes |
| `/login` | Admin sign-in (email + password) |
| `/admin` | Leads dashboard (requires login) |
| `/admin/booths` | Create / edit booth settings |
| `/admin/whatsapp-test` | Send a test template to a number |
| `/api/leads` | Server lead create + WhatsApp send |
| `/api/whatsapp/webhook` | Meta verify + delivery callbacks |
| `/api/whatsapp/resend` | Admin resend for failed leads |
| `/api/whatsapp/test` | Admin test template send |

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
3. If you already had ExpoLead tables, run `supabase/migrate-whatsapp.sql` instead (adds `booths` + WhatsApp columns).
4. In **Project Settings → API**, copy:
   - Project URL
   - `anon` `public` key
   - `service_role` key (server-only — needed for WhatsApp status updates & webhook)
5. Put them in `.env.local` / Vercel (see below).

### RLS model

- **Booths**: anyone can SELECT; only authenticated users can INSERT/UPDATE/DELETE
- **Leads**: anyone can INSERT; only authenticated users can SELECT/UPDATE/DELETE
- Server routes use `SUPABASE_SERVICE_ROLE_KEY` when updating WhatsApp fields after send / from the webhook

## WhatsApp Cloud API

### Template body parameters (order)

1. Visitor name  
2. Brand name  
3. Booth location  
4. Brochure URL  

Language code: `en`.

### Behaviour

- Consent is **required**. No consent → lead may still be rejected by API; WhatsApp is never sent without consent.
- After a successful lead insert, the server sends the template if: consent, booth exists, `whatsapp_enabled`, credentials present, and no successful send to the same number + booth in the last 24 hours.
- If WhatsApp fails, the **lead is still saved** with `whatsapp_status=failed` and the error message.
- Statuses: `pending` → `sent` / `failed` / `skipped`, then webhook may set `delivered` / `read` / `failed`.

### Meta webhook

1. Callback URL: `https://YOUR_DOMAIN/api/whatsapp/webhook`
2. Verify token: same value as `WHATSAPP_VERIFY_TOKEN`
3. Subscribe to **messages** field (status callbacks)

## Environment variables (Vercel)

Add these in **Vercel → Project → Settings → Environment Variables** (Production + Preview as needed):

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Yes | Public site URL for QR codes (no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for WhatsApp) | Server-only; webhook + status updates |
| `WHATSAPP_TOKEN` | Yes (for WhatsApp) | Meta access token — **never** `NEXT_PUBLIC_*` |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes (for WhatsApp) | Phone number ID from Meta |
| `WHATSAPP_API_VERSION` | Recommended | e.g. `v21.0` (defaults to `v21.0`) |
| `WHATSAPP_TEMPLATE_NAME` | Yes (for WhatsApp) | Approved template name |
| `WHATSAPP_VERIFY_TOKEN` | Yes (for webhook) | Shared secret you choose for Meta verification |

Redeploy after adding or changing env vars.

## Create the first admin user

1. Supabase Dashboard → **Authentication → Users** → **Add user**.
2. Enter email + password (enable **Auto Confirm User**).
3. Sign in at `/login` → `/admin`.

## Booth setup checklist

1. Run SQL migration.
2. Add WhatsApp + Supabase env vars; redeploy.
3. Sign in → **Admin → Booths** → create a booth (`id` must match the QR booth id).
4. Set brand name, location, brochure URL; leave WhatsApp enabled.
5. Configure Meta webhook to `/api/whatsapp/webhook`.
6. Use **Admin → WA test** to send a template to your phone.
7. Generate a QR for that booth id and test a live capture.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in [vercel.com](https://vercel.com).
3. Add the environment variables listed above.
4. Deploy.
5. Update `NEXT_PUBLIC_APP_URL` to the final domain and redeploy so QR codes use the correct host.

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

## Project structure

```text
src/
  app/                 # App Router pages + API routes
  components/          # UI (capture, admin, QR, header)
  lib/                 # Supabase, WhatsApp, phone/speech helpers
  types/               # Shared TypeScript types
supabase/
  schema.sql                 # Full table + RLS
  migrate-whatsapp.sql       # Booths + WhatsApp columns for existing DBs
  migrate-auth-select.sql
  migrate-public-select.sql
```

## License

Private / internal use unless you add a license file.
