ALTER TABLE public.secretary_returns
  ADD COLUMN IF NOT EXISTS reminder_lead_days integer DEFAULT 14;

UPDATE public.secretary_returns SET reminder_lead_days = 14 WHERE reminder_lead_days IS NULL;