CREATE TABLE IF NOT EXISTS public.unit_domains (
  host text PRIMARY KEY CHECK (host = lower(host) AND host !~ ':' AND host !~ '\.$'),
  unit_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.unit_domains TO service_role;
ALTER TABLE public.unit_domains ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.unit_domains IS 'Web address -> unit for public forms (service role only). Selects a unit; never grants access.';
INSERT INTO public.unit_domains (host, unit_id) VALUES
  ('weybridgelodge.org.uk', 'weybridge'),
  ('www.weybridgelodge.org.uk', 'weybridge'),
  ('bright-lodge-spark.lovable.app', 'weybridge'),
  ('id-preview--af7769c0-3910-4ce1-9c23-387cf7643cdb.lovable.app', 'weybridge'),
  ('af7769c0-3910-4ce1-9c23-387cf7643cdb.lovableproject.com', 'weybridge'),
  ('localhost', 'weybridge')
ON CONFLICT (host) DO NOTHING;