-- Stage 4: no host-lodge default; handle_new_user always supplies unit_id. NOT NULL kept.
ALTER TABLE public.profiles ALTER COLUMN unit_id DROP DEFAULT;