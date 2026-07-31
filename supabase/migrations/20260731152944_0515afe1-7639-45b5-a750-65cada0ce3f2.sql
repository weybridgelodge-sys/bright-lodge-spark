CREATE TABLE public.backup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK (status IN ('success','failed')),
  file_name text,
  table_count integer NOT NULL DEFAULT 0,
  row_count integer NOT NULL DEFAULT 0,
  size_bytes bigint NOT NULL DEFAULT 0,
  duration_ms integer,
  deleted_files text[] NOT NULL DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backup_log TO authenticated;
GRANT ALL ON public.backup_log TO service_role;

ALTER TABLE public.backup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backup log"
ON public.backup_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can read db backups"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'db-backups' AND public.has_role(auth.uid(), 'admin'::public.app_role));