-- Server-only table: no client grants at all (pattern from 0032/0109). service_role untouched.
REVOKE ALL ON public.pending_account_units FROM PUBLIC, anon, authenticated;