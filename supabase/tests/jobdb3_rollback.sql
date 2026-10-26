-- JOB DB3 rollback: original live bodies (2026-10-26). Run to restore.

CREATE OR REPLACE FUNCTION public.diary_add_meeting(_date date, _type festive_meeting_type, _series_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$;

CREATE OR REPLACE FUNCTION public.diary_move_meeting(_meeting_id uuid, _new_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$;

CREATE OR REPLACE FUNCTION public.log_meeting_diary_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$;

CREATE OR REPLACE FUNCTION public.log_member_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$;

CREATE OR REPLACE FUNCTION public.sync_festive_board_from_lodge_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$;

