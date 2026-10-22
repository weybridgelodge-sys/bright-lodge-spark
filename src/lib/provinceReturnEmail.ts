// Client read of the Province return destination (Unit Setup > Province).
// RLS limits unit_settings to the signed-in member's unit. "" means not set: screens must block sending.
import { supabase } from "@/integrations/supabase/client";
import { PROVINCE_SETTING_KEY, provinceReturnEmail, type ReturnKind } from "../../supabase/functions/_shared/provinceReturnEmail";
export { provinceReturnEmail, PROVINCE_EMAIL_FIELD, type ReturnKind } from "../../supabase/functions/_shared/provinceReturnEmail";

export async function loadProvinceReturnEmail(kind: ReturnKind): Promise<string> {
  const { data, error } = await supabase.from("unit_settings").select("value").eq("key", PROVINCE_SETTING_KEY).maybeSingle();
  if (error) throw error;
  return provinceReturnEmail(data?.value, kind);
}
