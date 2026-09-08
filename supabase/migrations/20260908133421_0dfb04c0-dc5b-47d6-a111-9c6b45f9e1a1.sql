create table public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type text not null check (account_type in ('asset','liability','equity','income','expense')),
  description text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.chart_of_accounts to authenticated;
grant insert, update, delete on public.chart_of_accounts to authenticated;
grant all on public.chart_of_accounts to service_role;

alter table public.chart_of_accounts enable row level security;

create policy "Authenticated can view accounts" on public.chart_of_accounts
  for select to authenticated using (true);
create policy "Admins can insert accounts" on public.chart_of_accounts
  for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "Admins can update accounts" on public.chart_of_accounts
  for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins can delete accounts" on public.chart_of_accounts
  for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create trigger chart_of_accounts_set_updated_at
  before update on public.chart_of_accounts
  for each row execute function public.tg_set_updated_at();

insert into public.chart_of_accounts (code, name, account_type, description, notes) values
('1000','Bank — Current Account','asset','The lodge''s actual Lloyds current account balance.','Source of truth for reconciliation.'),
('1010','Stripe Suspense','asset','Clearing account for card takings between the charge landing and the payout clearing to Bank.','Dr on receipt (3-leg posting), Cr on payout drawdown. Should net to zero between meetings.'),
('1100','Debtors — Subscriptions Outstanding','asset','Subscriptions billed/due but not yet collected from members.','Confirmed in FY24/25 audit as a real used balance.'),
('1110','Debtors — Dining','asset','Dining charges outstanding prior to collection or write-off (to 5600).','Treasurer''s FY24/25 narrative flags a missed dining payment during the year.'),
('1120','Debtors — Officer/Member Recharges','asset','Costs an officer or member has agreed to cover personally where the cost was added to a supplier invoice the lodge pays in full (e.g. WM providing port at his own expense).','On invoice recognition Dr 1120 / Cr 4900 for the recharge amount alongside the full GMC posting. Clears Dr Bank / Cr 1120 when the individual pays.'),
('1200','Lodge Property at Cost','asset','Jewels regalia and lodge-owned furnishings.','Kept at a nominal £1 token value — no real valuation or stock costing.'),
('2000','Creditors','liability','Amounts owed by the lodge but not yet paid — GMC UGLE PGL etc.','ONE control account; the payee/type is recorded on the transaction description not as a separate nominal code.'),
('2100','Deferred Income — Subscriptions in Advance','liability','Members who have paid ahead for next year''s subscription.','Not yet handled by the dues module (cash-basis only currently).'),
('2200','Relief Chest Payable','liability','Amounts collected for or earmarked to the Relief Chest not yet remitted.','Distinct from 5220. Relief Chest can ONLY be used for donations to registered charities — unused funds pass to the MCF.'),
('2300','Funds Held on Behalf of Others','liability','Ladies Festival and charity/raffle money held in trust — agency money never lodge income.','ONE account. If the lodge ever retains a genuine surplus, that portion is reclassified to 4900 Other Income.'),
('3000','General Fund','equity','Accumulated surplus/deficit brought forward plus the current year''s movement.','One fund only unless a ring-fenced reserve is later agreed.'),
('4000','Subscriptions','income','Net of proration under-21 discount and Treasurer/Secretary exemption.',null),
('4100','Dining Income','income','What members and visitors actually pay for the Festive Board.','Maps to bookings.subtotal_pence.'),
('4120','Fee Cover Income','income','Voluntary top-up some diners add to cover the card processing fee at checkout.','Maps to bookings.fee_pence. Check against 5420 only for opted-in transactions not as a blanket annual total.'),
('4200','Charity Column / Collections','income','On-the-night collections.',null),
('4300','Raffle Income','income',null,null),
('4400','Bank Interest Received','income',null,null),
('4500','Registration Fees Received (Pass-through)','income','UGLE/PGL registration fees collected from new members matched against 5000/5100.','Kept gross not netted.'),
('4900','Other Income','income',null,'Where a lodge-retained Ladies Festival surplus or officer recharge income lands. NOT a routine counterpart to 2300 — most 2300 activity never touches the P&L.'),
('5000','UGLE Fees','expense','Annual per-capita fees plus new-member registration.',null),
('5100','Provincial Grand Lodge Fees','expense',null,null),
('5200','GMC Levy / Accommodation','expense','The annual venue levy.',null),
('5210','GMC Dining Invoice','expense','The GMC''s invoice for Festive Board catering.','Posts Dr here / Cr 2000 Creditors.'),
('5220','Relief Chest Donations Given','expense','The lodge''s own contribution to the Relief Chest.','Distinct from 2200.'),
('5300','Donations Given','expense','General external donations e.g. named charity gifts.',null),
('5310','Raffle Prizes','expense',null,null),
('5320','Insurance','expense','Lodge property and regalia cover once in place.',null),
('5330','Almoner / Welfare Costs','expense','Funeral flowers gifts to widows and other member welfare support.','Funded from general lodge funds NOT the Relief Chest. Deliberately distinct from 5300.'),
('5400','Tyler''s Fees','expense','Recurring payment to the Tyler.',null),
('5410','Bank Charges','expense','Lloyds'' fees.',null),
('5420','Card Processing Fees','expense','Stripe''s per-transaction fee on card income.','Dr leg of the 3-leg Stripe posting (Dr 1010 / Cr 4100 / Dr 5420).'),
('5500','Stationery & Printing','expense',null,null),
('5510','New Member Purchases','expense','Book of Constitutions Bible gloves apron.','Expensed in year of purchase.'),
('5600','Bad Debts Written Off','expense','Dining or subscription amounts formally written off as uncollectable.',null),
('5900','Sundry / Other Expenses','expense',null,null);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  description text not null,
  source_type text,
  source_id uuid,
  period_id uuid references public.treasurer_periods(id),
  reconciled boolean not null default false,
  attachment_name text,
  attachment_path text,
  attachment_size integer,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts(id),
  debit_pence integer not null default 0 check (debit_pence >= 0),
  credit_pence integer not null default 0 check (credit_pence >= 0),
  description text,
  created_at timestamptz not null default now(),
  constraint journal_lines_one_side check (not (debit_pence > 0 and credit_pence > 0)),
  constraint journal_lines_not_both_zero check (debit_pence > 0 or credit_pence > 0)
);

create index journal_lines_entry_id_idx on public.journal_lines (entry_id);
create index journal_lines_account_id_idx on public.journal_lines (account_id);
create index journal_entries_period_id_idx on public.journal_entries (period_id);

grant select, insert, update, delete on public.journal_entries to authenticated;
grant all on public.journal_entries to service_role;
grant select, insert, update, delete on public.journal_lines to authenticated;
grant all on public.journal_lines to service_role;

create or replace function public.is_period_locked(p_period_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select status = 'locked' from public.treasurer_periods where id = p_period_id), false);
$$;

create or replace function public.check_journal_entry_balanced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_total_debit integer;
  v_total_credit integer;
begin
  v_entry_id := coalesce(new.entry_id, old.entry_id);
  select coalesce(sum(debit_pence),0), coalesce(sum(credit_pence),0)
    into v_total_debit, v_total_credit
    from public.journal_lines
    where entry_id = v_entry_id;
  if v_total_debit != v_total_credit then
    raise exception 'Journal entry % is not balanced: debits £% vs credits £%', v_entry_id, v_total_debit/100.0, v_total_credit/100.0;
  end if;
  return null;
end;
$$;

create constraint trigger journal_lines_balance_check
  after insert or update or delete on public.journal_lines
  deferrable initially deferred
  for each row execute function public.check_journal_entry_balanced();

create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.tg_set_updated_at();

alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;

create policy "Admins can view journal entries" on public.journal_entries
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins can insert journal entries" on public.journal_entries
  for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "Admins can update unlocked journal entries" on public.journal_entries
  for update to authenticated
  using (public.has_role(auth.uid(),'admin') and not public.is_period_locked(period_id))
  with check (public.has_role(auth.uid(),'admin') and not public.is_period_locked(period_id));
create policy "Admins can delete unlocked journal entries" on public.journal_entries
  for delete to authenticated
  using (public.has_role(auth.uid(),'admin') and not public.is_period_locked(period_id));

create policy "Admins can view journal lines" on public.journal_lines
  for select to authenticated using (
    exists (select 1 from public.journal_entries je where je.id = entry_id and public.has_role(auth.uid(),'admin'))
  );
create policy "Admins can insert journal lines" on public.journal_lines
  for insert to authenticated with check (
    exists (select 1 from public.journal_entries je where je.id = entry_id and public.has_role(auth.uid(),'admin'))
  );
create policy "Admins can update unlocked journal lines" on public.journal_lines
  for update to authenticated
  using (exists (select 1 from public.journal_entries je where je.id = entry_id and public.has_role(auth.uid(),'admin') and not public.is_period_locked(je.period_id)))
  with check (exists (select 1 from public.journal_entries je where je.id = entry_id and public.has_role(auth.uid(),'admin') and not public.is_period_locked(je.period_id)));
create policy "Admins can delete unlocked journal lines" on public.journal_lines
  for delete to authenticated
  using (exists (select 1 from public.journal_entries je where je.id = entry_id and public.has_role(auth.uid(),'admin') and not public.is_period_locked(je.period_id)));
