
-- enums
CREATE TYPE public.festive_meeting_type AS ENUM ('regular','installation','emergency');
CREATE TYPE public.festive_attendance_status AS ENUM ('booked','attended','no_show','cancelled_refunded');
CREATE TYPE public.festive_payment_method AS ENUM ('stripe','paid_on_night_cash','paid_on_night_card','complimentary','unknown');

-- meetings
CREATE TABLE public.festive_board_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL,
  meeting_type public.festive_meeting_type NOT NULL DEFAULT 'regular',
  notes text,
  headcount_override integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.festive_board_meetings TO authenticated;
GRANT ALL ON public.festive_board_meetings TO service_role;

ALTER TABLE public.festive_board_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members can view festive meetings"
  ON public.festive_board_meetings FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()));

CREATE POLICY "Managers can insert festive meetings"
  ON public.festive_board_meetings FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
    OR public.has_role(auth.uid(),'director_of_ceremonies')
  );

CREATE POLICY "Managers can update festive meetings"
  ON public.festive_board_meetings FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
    OR public.has_role(auth.uid(),'director_of_ceremonies')
  );

CREATE POLICY "Managers can delete festive meetings"
  ON public.festive_board_meetings FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
    OR public.has_role(auth.uid(),'director_of_ceremonies')
  );

CREATE TRIGGER trg_festive_meetings_updated_at
  BEFORE UPDATE ON public.festive_board_meetings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- attendance
CREATE TABLE public.festive_board_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.festive_board_meetings(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  visitor_name text,
  visitor_lodge_name text,
  visitor_lodge_number text,
  attendance_status public.festive_attendance_status NOT NULL DEFAULT 'booked',
  payment_method public.festive_payment_method NOT NULL DEFAULT 'unknown',
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount_pence integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT festive_attendee_kind CHECK (
    (member_id IS NOT NULL AND visitor_name IS NULL)
    OR (member_id IS NULL AND visitor_name IS NOT NULL)
  )
);

CREATE UNIQUE INDEX festive_attendance_unique_member
  ON public.festive_board_attendance(meeting_id, member_id)
  WHERE member_id IS NOT NULL;

CREATE INDEX festive_attendance_meeting_idx ON public.festive_board_attendance(meeting_id);
CREATE INDEX festive_attendance_member_idx ON public.festive_board_attendance(member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.festive_board_attendance TO authenticated;
GRANT ALL ON public.festive_board_attendance TO service_role;

ALTER TABLE public.festive_board_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members can view festive attendance"
  ON public.festive_board_attendance FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()));

CREATE POLICY "Managers can insert festive attendance"
  ON public.festive_board_attendance FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
    OR public.has_role(auth.uid(),'director_of_ceremonies')
  );

CREATE POLICY "Managers can update festive attendance"
  ON public.festive_board_attendance FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
    OR public.has_role(auth.uid(),'director_of_ceremonies')
  );

CREATE POLICY "Managers can delete festive attendance"
  ON public.festive_board_attendance FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretary')
    OR public.has_role(auth.uid(),'worshipful_master')
    OR public.has_role(auth.uid(),'director_of_ceremonies')
  );

CREATE TRIGGER trg_festive_attendance_updated_at
  BEFORE UPDATE ON public.festive_board_attendance
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
