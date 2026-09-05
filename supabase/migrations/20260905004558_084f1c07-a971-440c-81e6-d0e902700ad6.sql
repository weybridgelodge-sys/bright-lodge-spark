-- Restrict SELECT on guest_emails so active members cannot read the column directly.
-- Guest emails remain accessible only through the lodge_social_guest_emails()
-- SECURITY DEFINER RPC, which is gated on can_manage_socials().
REVOKE SELECT (guest_emails) ON public.lodge_socials FROM authenticated;