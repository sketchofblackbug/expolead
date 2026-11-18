-- If you already ran the earlier schema (authenticated-only SELECT),
-- run this in the SQL Editor to open public reads for the admin dashboard.

drop policy if exists "Authenticated users can select leads" on public.leads;
drop policy if exists "Anyone can select leads" on public.leads;

create policy "Anyone can select leads"
  on public.leads
  for select
  to anon, authenticated
  using (true);
