CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_self_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.title             IS DISTINCT FROM OLD.title
  OR NEW.first_name        IS DISTINCT FROM OLD.first_name
  OR NEW.last_name         IS DISTINCT FROM OLD.last_name
  OR NEW.full_name         IS DISTINCT FROM OLD.full_name
  OR NEW.date_of_birth     IS DISTINCT FROM OLD.date_of_birth
  OR NEW.office            IS DISTINCT FROM OLD.office
  OR NEW.rank              IS DISTINCT FROM OLD.rank
  OR NEW.provincial_rank   IS DISTINCT FROM OLD.provincial_rank
  OR NEW.grand_rank        IS DISTINCT FROM OLD.grand_rank
  OR NEW.ugle_reg_number   IS DISTINCT FROM OLD.ugle_reg_number
  OR NEW.is_honorary_member IS DISTINCT FROM OLD.is_honorary_member
  OR NEW.is_royal_arch     IS DISTINCT FROM OLD.is_royal_arch
  OR NEW.royal_arch_date   IS DISTINCT FROM OLD.royal_arch_date
  OR NEW.initiation_date   IS DISTINCT FROM OLD.initiation_date
  OR NEW.passing_date      IS DISTINCT FROM OLD.passing_date
  OR NEW.raising_date      IS DISTINCT FROM OLD.raising_date
  OR NEW.joined_lodge_date IS DISTINCT FROM OLD.joined_lodge_date
  OR NEW.joined_year       IS DISTINCT FROM OLD.joined_year
  OR NEW.mother_lodge      IS DISTINCT FROM OLD.mother_lodge
  OR NEW.proposer          IS DISTINCT FROM OLD.proposer
  THEN
    RAISE EXCEPTION 'Only admins can change name, title, date of birth, rank, office, dates, registration, or memberships';
  END IF;

  RETURN NEW;
END $function$;