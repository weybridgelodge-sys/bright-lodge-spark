// Lodge, bank and sign-off details for the booking form and its confirmation.
// Read from get_public_booking_details() (unit settings + lodge identity);
// nothing here is typed in code. Edited on Members > Admin > Unit Setup.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BookingDetails = {
  lodgeName: string; lodgeNumber: string; accountName: string; sortCode: string; accountNumber: string;
  referencePattern: string; cardWording: string; chequePayee: string; signOffOverride: string; contactEmail: string;
};

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function parseBookingDetails(row: unknown): BookingDetails {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    lodgeName: s(r.lodge_name), lodgeNumber: s(r.lodge_number), accountName: s(r.account_name),
    sortCode: s(r.sort_code), accountNumber: s(r.account_number), referencePattern: s(r.reference_pattern),
    cardWording: s(r.card_wording), chequePayee: s(r.cheque_payee), signOffOverride: s(r.sign_off_override),
    contactEmail: s(r.contact_email),
  };
}

/** "Sincerely and Fraternally,\nWM <name> <number>", or the saved override. */
export function signOff(d: Pick<BookingDetails, "lodgeName" | "lodgeNumber" | "signOffOverride">): string {
  if (d.signOffOverride) return d.signOffOverride;
  const who = ["WM", d.lodgeName, d.lodgeNumber].filter(Boolean).join(" ");
  return `Sincerely and Fraternally,\n${who}`;
}

/** Payment reference from the pattern, e.g. "Dining + {surname}". */
export const paymentReference = (pattern: string, surname: string) =>
  (pattern || "{surname}").replace(/\{surname\}/gi, surname.trim() || "Your Surname");

/** "e.g. <name> No. <number>" placeholder; "" when identity is unknown. */
export const lodgePlaceholder = (d: Pick<BookingDetails, "lodgeName" | "lodgeNumber">) =>
  d.lodgeName ? `e.g. ${[d.lodgeName, d.lodgeNumber ? `No. ${d.lodgeNumber}` : ""].filter(Boolean).join(" ")}` : "";

/** Accepts dashed, spaced or plain six digits; returns canonical NN-NN-NN or null. */
export function canonicalSortCode(v: string): string | null {
  const d = v.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(d) ? `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}` : null;
}
export const validAccountNumber = (v: string) => /^\d{8}$/.test(v.replace(/\s/g, ""));

export const EMPTY_BOOKING_DETAILS = parseBookingDetails(null);

export async function loadBookingDetails(): Promise<BookingDetails> {
  const { data, error } = await (supabase.rpc as any)("get_public_booking_details");
  if (error) throw error;
  return parseBookingDetails(data);
}

export function useBookingDetails(): BookingDetails {
  const [d, setD] = useState<BookingDetails>(EMPTY_BOOKING_DETAILS);
  useEffect(() => {
    let live = true;
    loadBookingDetails().then((v) => live && setD(v), () => {});
    return () => { live = false; };
  }, []);
  return d;
}
