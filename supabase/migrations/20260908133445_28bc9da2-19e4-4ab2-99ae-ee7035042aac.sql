revoke all on function public.check_journal_entry_balanced() from public, anon, authenticated;
revoke all on function public.is_period_locked(uuid) from public, anon;
grant execute on function public.is_period_locked(uuid) to authenticated, service_role;