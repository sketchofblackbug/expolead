# ExpoLead

Mobile-first exhibition lead capture built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

Visitors scan a booth QR code → open `/lead/[boothId]` → speak (or type) their name and phone → the lead is saved. Organizers review everything on `/admin`.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- `@supabase/supabase-js`
- `lucide-react`

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Product home |
| `/lead/[boothId]` | QR landing + voice/typed capture |
| `/admin` | Lead dashboard (auth later) |

## Local setup

```bash
cd expolead
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase env vars, leads are stored in `localStorage` and the admin page shows demo + local data.

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Paste and run `supabase/schema.sql` in the SQL Editor
3. Copy Project URL + anon key into `.env.local`
4. Public capture can `INSERT`; only authenticated users can `SELECT` / `UPDATE` / `DELETE`

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```
