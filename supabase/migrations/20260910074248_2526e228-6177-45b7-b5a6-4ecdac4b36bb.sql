create or replace function public.get_directory_contact_info(_ids uuid[])
returns table(id uuid, phone text, address_line1 text, address_line2 text, address_line3 text, town text, county text, postcode text)
language sql stable security definer set search_path = 'public'
as $$
  select p.id, p.phone, p.address_line1, p.address_line2, p.address_line3, p.town, p.county, p.postcode
  from public.profiles p
  where p.id = any(_ids) and p.status = 'active'
$$;

revoke all on function public.get_directory_contact_info(uuid[]) from public;
grant execute on function public.get_directory_contact_info(uuid[]) to authenticated;