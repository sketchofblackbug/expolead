-- ExpoLead: run this entire script in the Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  booth_id text not null,
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  source text not null default 'voice'
);

create index if not exists leads_booth_id_idx on public.leads (booth_id);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_source_idx on public.leads (source);

alter table public.leads enable row level security;

-- Public capture: anyone can insert
create policy "Anyone can insert leads"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

-- Admin dashboard: only signed-in users can read
create policy "Authenticated users can select leads"
  on public.leads
  for select
  to authenticated
  using (true);

create policy "Authenticated users can update leads"
  on public.leads
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete leads"
  on public.leads
  for delete
  to authenticated
  using (true);
