CREATE TABLE public.regular_meeting_reminders_sent (
  meeting_id uuid NOT NULL REFERENCES public.festive_board_meetings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, member_id)
);

GRANT SELECT ON public.regular_meeting_reminders_sent TO authenticated;
GRANT ALL ON public.regular_meeting_reminders_sent TO service_role;

ALTER TABLE public.regular_meeting_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view regular meeting reminders"
ON public.regular_meeting_reminders_sent
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretary'));