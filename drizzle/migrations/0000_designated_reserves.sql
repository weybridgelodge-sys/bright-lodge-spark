INSERT INTO public.chart_of_accounts (code, name, account_type, description)
VALUES ('3100', 'Designated Reserves', 'equity', 'Ring-fenced portions of General Fund for specific future purposes — Almoners, Initiates & Regalia, Master''s Fund, Tyler Provision, and any future pots. Balance shown as one figure on the Balance Sheet; individual pots tracked via fund_code on journal_lines.')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS fund_code text;