CREATE TYPE public.meeting_minutes_type AS ENUM ('regular','committee');
CREATE TYPE public.meeting_minutes_status AS ENUM ('draft','approved');

CREATE TABLE public.meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type public.meeting_minutes_type NOT NULL,
  meeting_date date NOT NULL,
  title text NOT NULL,
  lodge_event_id uuid REFERENCES public.lodge_events(id) ON DELETE SET NULL,
  status public.meeting_minutes_status NOT NULL DEFAULT 'draft',
  approved_date date,
  apologies text,
  previous_minutes_note text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_meeting_date date,
  transcript_text text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_minutes TO authenticated;
GRANT ALL ON public.meeting_minutes TO service_role;

ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_meeting_minutes(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user, 'admin'::public.app_role)
      OR public.has_role(_user, 'secretary'::public.app_role)
      OR public.has_role(_user, 'assistant_secretary'::public.app_role)
      OR public.has_role(_user, 'worshipful_master'::public.app_role)
      OR public.is_current_officer(_user, 'secretary')
      OR public.is_current_officer(_user, 'assistant_secretary')
      OR public.is_current_officer(_user, 'worshipful_master');
$$;

CREATE POLICY "Secretary team can view meeting minutes"
  ON public.meeting_minutes FOR SELECT TO authenticated
  USING (public.can_manage_meeting_minutes(auth.uid()));

CREATE POLICY "Secretary team can manage meeting minutes"
  ON public.meeting_minutes FOR ALL TO authenticated
  USING (public.can_manage_meeting_minutes(auth.uid()))
  WITH CHECK (public.can_manage_meeting_minutes(auth.uid()));

CREATE TRIGGER set_meeting_minutes_updated_at
  BEFORE UPDATE ON public.meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX meeting_minutes_date_idx ON public.meeting_minutes (meeting_date DESC);