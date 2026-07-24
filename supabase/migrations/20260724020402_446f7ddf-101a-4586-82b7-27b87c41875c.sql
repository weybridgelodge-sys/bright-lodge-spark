
DROP TRIGGER IF EXISTS trg_prevent_degree_self_edit ON public.profiles;
DROP TRIGGER IF EXISTS trg_prevent_status_self_edit ON public.profiles;
DROP TRIGGER IF EXISTS trg_prevent_past_master_self_edit ON public.profiles;

CREATE TRIGGER trg_prevent_degree_self_edit
  BEFORE UPDATE OF degree ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_degree_self_edit();

CREATE TRIGGER trg_prevent_status_self_edit
  BEFORE UPDATE OF status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_status_self_edit();

CREATE TRIGGER trg_prevent_past_master_self_edit
  BEFORE UPDATE OF is_past_master ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_past_master_self_edit();
