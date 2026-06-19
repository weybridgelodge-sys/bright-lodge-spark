DROP POLICY "Managers update assignments" ON public.loi_part_assignments;
CREATE POLICY "Managers update assignments" ON public.loi_part_assignments
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role) OR has_role(auth.uid(), 'director_of_ceremonies'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'worshipful_master'::app_role) OR has_role(auth.uid(), 'director_of_ceremonies'::app_role) OR has_role(auth.uid(), 'secretary'::app_role));