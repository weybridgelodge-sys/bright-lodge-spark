CREATE OR REPLACE FUNCTION public.is_working_group_member(_user uuid, _group uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.working_group_members m
    JOIN public.working_groups g ON g.id = m.working_group_id
    WHERE m.working_group_id = _group
      AND m.member_id = _user
      AND g.is_active
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_working_group_lead(_user uuid, _group uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.working_groups g
    WHERE g.id = _group AND g.is_active AND g.lead_member_id = _user
  ) OR EXISTS (
    SELECT 1
    FROM public.working_group_members m
    JOIN public.working_groups g ON g.id = m.working_group_id
    WHERE m.working_group_id = _group
      AND m.member_id = _user
      AND m.role = 'lead'
      AND g.is_active
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_working_group_member_by_slug(_user uuid, _slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.working_group_members m
    JOIN public.working_groups g ON g.id = m.working_group_id
    WHERE m.member_id = _user AND g.slug = _slug AND g.is_active
  )
$function$;

DROP POLICY IF EXISTS "Event images readable by anyone" ON storage.objects;

CREATE POLICY "Published event images readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.lodge_events e
    WHERE e.header_image_url = storage.objects.name
      AND e.published
  )
);

CREATE POLICY "Admins and secretary read event images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'event-images'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretary'::app_role))
);
