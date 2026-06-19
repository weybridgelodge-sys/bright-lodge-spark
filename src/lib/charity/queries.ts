import { supabase } from "@/integrations/supabase/client";

export type CollectionType = "charity_column" | "raffle" | "ad_hoc" | "relief_chest" | "other";
export type PaymentMethod = "cheque" | "bacs" | "cash" | "online";
export type AuthorisedBy = "wm" | "treasurer" | "both";

export const COLLECTION_TYPE_LABEL: Record<CollectionType, string> = {
  charity_column: "Charity Column",
  raffle: "Raffle",
  ad_hoc: "Ad Hoc",
  relief_chest: "Direct Relief Chest",
  other: "Other",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cheque: "Cheque",
  bacs: "BACS",
  cash: "Cash",
  online: "Online",
};

export const AUTHORISED_LABEL: Record<AuthorisedBy, string> = {
  wm: "WM",
  treasurer: "Treasurer",
  both: "WM & Treasurer",
};

export type Charity = {
  id: string;
  name: string;
  charity_number: string | null;
  description: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: "active" | "inactive";
};

export type Collection = {
  id: string;
  collection_date: string;
  lodge_event_id: string | null;
  collection_type: CollectionType;
  gross_amount: number;
  costs: number;
  net_amount: number;
  notes: string | null;
};

export type Donation = {
  id: string;
  donation_date: string;
  charity_id: string;
  amount: number;
  purpose: string | null;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  authorised_by: AuthorisedBy;
  confirmation_received: boolean;
  is_festival_contribution: boolean;
  from_relief_chest: boolean;
};

export type FestivalSettings = {
  id: string;
  festival_name: string;
  target_amount: number;
  festival_notes: string | null;
  public_feed_start_date: string | null;
  public_feed_start_amount: number;
};

export function currentMasonicYear(): number {
  const d = new Date();
  return d.getMonth() >= 9 ? d.getFullYear() : d.getFullYear() - 1;
}

export function masonicYearBounds(year: number): { start: string; end: string; label: string } {
  return {
    start: `${year}-10-01`,
    end: `${year + 1}-09-30`,
    label: `${year}/${year + 1}`,
  };
}

export async function fetchCharities(): Promise<Charity[]> {
  const { data, error } = await supabase
    .from("charity_ledger")
    .select("id,name,charity_number,description,contact_name,email,phone,website,status")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Charity[];
}

export async function fetchCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("charity_collections")
    .select("id,collection_date,lodge_event_id,collection_type,gross_amount,costs,net_amount,notes")
    .order("collection_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Collection[];
}

export async function fetchDonations(): Promise<Donation[]> {
  const { data, error } = await supabase
    .from("charity_donations")
    .select(
      "id,donation_date,charity_id,amount,purpose,payment_method,payment_reference,authorised_by,confirmation_received,is_festival_contribution,from_relief_chest",
    )
    .order("donation_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Donation[];
}

export async function fetchFestivalSettings(): Promise<FestivalSettings | null> {
  const { data, error } = await supabase
    .from("charity_festival_settings")
    .select("id,festival_name,target_amount,festival_notes,public_feed_start_date,public_feed_start_amount")
    .maybeSingle();
  if (error) throw error;
  return data as FestivalSettings | null;
}

export function inYear(dateIso: string, year: number): boolean {
  const { start, end } = masonicYearBounds(year);
  return dateIso >= start && dateIso <= end;
}

export function reliefChestBalance(collections: Collection[], donations: Donation[]): number {
  const in_ = collections.filter((c) => c.collection_type === "relief_chest").reduce((a, c) => a + Number(c.net_amount), 0);
  const out = donations.filter((d) => d.from_relief_chest).reduce((a, d) => a + Number(d.amount), 0);
  return in_ - out;
}

export function isFestivalDonation(donation: Donation, charities: Charity[], festival?: FestivalSettings | null): boolean {
  if (donation.is_festival_contribution) return true;
  const charityName = charities.find((c) => c.id === donation.charity_id)?.name.toLowerCase().trim() ?? "";
  const festivalName = (festival?.festival_name ?? "Surrey 2030 Festival").toLowerCase().trim();
  return charityName.length > 0 && (charityName === festivalName || charityName.includes("2030 festival") || charityName.includes("surrey 2030"));
}

export function gbp(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(n);
}
