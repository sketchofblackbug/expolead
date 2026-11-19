-- ExpoLead: run this entire script in the Supabase SQL Editor

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Booths
-- ---------------------------------------------------------------------------
create table if not exists public.booths (
  id text primary key,
  brand_name text not null,
  booth_location text not null default '',
  brochure_url text not null default '',
  whatsapp_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booths enable row level security;

drop policy if exists "Anyone can select booths" on public.booths;
create policy "Anyone can select booths"
  on public.booths
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can insert booths" on public.booths;
create policy "Authenticated users can insert booths"
  on public.booths
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update booths" on public.booths;
create policy "Authenticated users can update booths"
  on public.booths
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete booths" on public.booths;
create policy "Authenticated users can delete booths"
  on public.booths
  for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  booth_id text not null,
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  source text not null default 'voice',
  consent boolean not null default false,
  consent_at timestamptz,
  phone_digits text,
  whatsapp_status text,
  whatsapp_message_id text,
  whatsapp_error text,
  whatsapp_sent_at timestamptz
);

create index if not exists leads_booth_id_idx on public.leads (booth_id);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_phone_digits_booth_idx
  on public.leads (booth_id, phone_digits, whatsapp_sent_at desc);
create index if not exists leads_whatsapp_message_id_idx
  on public.leads (whatsapp_message_id);
create index if not exists leads_whatsapp_status_idx
  on public.leads (whatsapp_status);

alter table public.leads enable row level security;

drop policy if exists "Anyone can insert leads" on public.leads;
create policy "Anyone can insert leads"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can select leads" on public.leads;
create policy "Authenticated users can select leads"
  on public.leads
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can update leads" on public.leads;
create policy "Authenticated users can update leads"
  on public.leads
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete leads" on public.leads;
create policy "Authenticated users can delete leads"
  on public.leads
  for delete
  to authenticated
  using (true);
