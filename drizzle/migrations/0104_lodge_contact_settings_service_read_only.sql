REVOKE SELECT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.lodge_contact_settings FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.lodge_contact_settings FROM anon;