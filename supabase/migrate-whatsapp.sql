-- ExpoLead: WhatsApp follow-up + booth settings
-- Run in Supabase SQL Editor after schema.sql

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
-- Leads: consent + WhatsApp tracking
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists consent boolean not null default false;

alter table public.leads
  add column if not exists consent_at timestamptz;

alter table public.leads
  add column if not exists phone_digits text;

alter table public.leads
  add column if not exists whatsapp_status text;

alter table public.leads
  add column if not exists whatsapp_message_id text;

alter table public.leads
  add column if not exists whatsapp_error text;

alter table public.leads
  add column if not exists whatsapp_sent_at timestamptz;

create index if not exists leads_phone_digits_booth_idx
  on public.leads (booth_id, phone_digits, whatsapp_sent_at desc);

create index if not exists leads_whatsapp_message_id_idx
  on public.leads (whatsapp_message_id);

create index if not exists leads_whatsapp_status_idx
  on public.leads (whatsapp_status);
