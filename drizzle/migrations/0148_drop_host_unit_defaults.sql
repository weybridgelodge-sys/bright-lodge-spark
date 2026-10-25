-- Job BX: remove the host-lodge column default; every inserter supplies unit_id explicitly. NOT NULL stays.
ALTER TABLE public.newsletter_subscribers ALTER COLUMN unit_id DROP DEFAULT;
ALTER TABLE public.lodge_fee_settings ALTER COLUMN unit_id DROP DEFAULT;
ALTER TABLE public.lodge_contact_settings ALTER COLUMN unit_id DROP DEFAULT;