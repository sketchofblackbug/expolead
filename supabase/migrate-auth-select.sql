-- Lock down lead reads to authenticated admins only.
-- Run this if you previously used public SELECT for the dashboard.

drop policy if exists "Anyone can select leads" on public.leads;
drop policy if exists "Authenticated users can select leads" on public.leads;

create policy "Authenticated users can select leads"
  on public.leads
  for select
  to authenticated
  using (true);
