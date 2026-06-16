
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS provincial_rank text,
  ADD COLUMN IF NOT EXISTS grand_rank text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS is_royal_arch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_honorary_member boolean NOT NULL DEFAULT false;
