import { supabase } from "@/integrations/supabase/client";

export type ReservePot = {
  id: string;
  fund_code: string;
  label: string;
  annual_pence: number;
  sort_order: number;
};

export type SubscriptionSettings = {
  id: string;
  annual_rate_pence: number;
};

export const FALLBACK_POTS: Omit<ReservePot, "id">[] = [
  { fund_code: "ALMONERS", label: "Almoners", annual_pence: 1000, sort_order: 1 },
  { fund_code: "INITIATES_REGALIA", label: "Initiates & Regalia", annual_pence: 900, sort_order: 2 },
  { fund_code: "MASTERS_FUND", label: "Master's Fund", annual_pence: 1000, sort_order: 3 },
  { fund_code: "TYLER_PROVISION", label: "Tyler Provision", annual_pence: 1000, sort_order: 4 },
];

export async function fetchSubscriptionSettings(): Promise<SubscriptionSettings | null> {
  const { data } = await supabase
    .from("subscription_settings" as any)
    .select("id,annual_rate_pence")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as SubscriptionSettings) ?? null;
}

export async function fetchReservePots(): Promise<ReservePot[]> {
  const { data } = await supabase
    .from("subscription_reserve_pots" as any)
    .select("id,fund_code,label,annual_pence,sort_order")
    .order("sort_order");
  const rows = (data as unknown as ReservePot[]) ?? [];
  return rows.length ? rows : (FALLBACK_POTS.map((p, i) => ({ id: `fallback-${i}`, ...p })) as ReservePot[]);
}
