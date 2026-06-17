ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS post_nominals text;