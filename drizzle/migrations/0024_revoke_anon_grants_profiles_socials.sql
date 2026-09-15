-- Defence in depth: no RLS policy on these tables targets the anon role,
-- so these grants are unreachable today. Removing them closes the gap
-- should a future policy ever be written without a role restriction.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.lodge_socials FROM anon;