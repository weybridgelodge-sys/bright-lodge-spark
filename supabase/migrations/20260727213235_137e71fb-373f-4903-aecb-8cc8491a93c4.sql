ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_is_test_account_idx
  ON public.profiles (is_test_account) WHERE is_test_account = true;

COMMENT ON COLUMN public.profiles.is_test_account IS
  'Play Store reviewer bypass — temporary. Accounts flagged true (e.g. playreview@weybridgelodge.org.uk) are excluded from the members directory and member-facing lists.';