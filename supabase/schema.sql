-- ExpoLead leads table
create extension if not exists "pgcrypto";

create type public.lead_status as enum ('new', 'contacted', 'qualified', 'archived');

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  booth_id text not null,
  name text not null,
  phone text not null,
  notes text,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_booth_id_idx on public.leads (booth_id);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;

-- Open insert/select for demo; tighten with auth later
create policy "Allow public insert leads"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow public select leads"
  on public.leads
  for select
  to anon, authenticated
  using (true);
