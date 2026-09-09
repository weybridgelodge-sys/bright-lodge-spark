create or replace function public.get_annual_return_members()
returns table(
  id uuid,
  full_name text,
  first_name text,
  last_name text,
  status public.member_status,
  status_changed_at date,
  date_of_birth date
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.first_name, p.last_name, p.status, p.status_changed_at, p.date_of_birth
  from public.profiles p
  where coalesce(p.is_honorary_member, false) = false
    and p.status <> 'pending'
    and (
      public.has_role(auth.uid(), 'admin')
      or public.is_current_officer(auth.uid(), 'treasurer')
    )
$$;

revoke all on function public.get_annual_return_members() from public, anon;
grant execute on function public.get_annual_return_members() to authenticated;
grant execute on function public.get_annual_return_members() to service_role;