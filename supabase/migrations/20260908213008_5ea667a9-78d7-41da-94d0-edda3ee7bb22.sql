create table public.stripe_payouts (
  id uuid primary key default gen_random_uuid(),
  stripe_payout_id text not null unique,
  amount_pence integer not null,
  currency text not null default 'gbp',
  arrival_date date not null,
  status text not null,
  env text not null check (env in ('sandbox','live')),
  journal_entry_id uuid references public.journal_entries(id),
  created_at timestamptz not null default now()
);

grant select on public.stripe_payouts to authenticated;
grant all on public.stripe_payouts to service_role;

alter table public.stripe_payouts enable row level security;

create policy "Admins and current Treasurer can view stripe payouts"
  on public.stripe_payouts
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.is_current_officer(auth.uid(), 'treasurer'));

create policy "Service role can manage stripe payouts"
  on public.stripe_payouts
  for all to service_role
  using (true) with check (true);