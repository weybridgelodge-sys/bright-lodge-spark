create or replace function public.link_booking_journal_entry(_booking_id uuid, _entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (has_role(auth.uid(), 'admin'::app_role) or is_current_officer(auth.uid(), 'treasurer')) then
    raise exception 'Not authorised';
  end if;
  update bookings set journal_entry_id = _entry_id where id = _booking_id;
end;
$$;

revoke all on function public.link_booking_journal_entry(uuid, uuid) from public;
grant execute on function public.link_booking_journal_entry(uuid, uuid) to authenticated;