// Shared guard: prevent a second booking (and therefore a second charge) for
// the same person at the same meeting/event.
//
// Historically the only thing that blocked duplicates was an *indirect* unique
// constraint on festive_board_attendance. Once the attendance sync was made
// idempotent, nothing stopped a member paying twice for the same meeting.
// This check runs BEFORE any Stripe session is created.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Statuses that mean "this person already has a live response/booking". */
export const BLOCKING_STATUSES = [
  "paid",
  "confirmed",
  "apologies",
  "waitlisted",
  "waitlisted_refunded",
];

export const DUPLICATE_BOOKING_MESSAGE =
  "You already have a booking for this event. If you need to change or cancel it, please contact the Assistant Secretary at assistantsecretary@weybridgelodge.org.uk.";

export interface DuplicateCheckArgs {
  supabase: SupabaseClient;
  meetingId: string | null;
  eventKey: string;
  email: string;
  userId?: string | null;
}

export interface ExistingBooking {
  id: string;
  payment_status: string;
  created_at: string;
}

/**
 * Returns the existing blocking booking, or null when it is safe to proceed.
 * Matches on meeting_id when known (most reliable), otherwise on event_key,
 * and on either the contact email (case-insensitive) or the linked user id.
 */
export async function findExistingBooking(
  { supabase, meetingId, eventKey, email, userId }: DuplicateCheckArgs,
): Promise<ExistingBooking | null> {
  const normalisedEmail = email.trim().toLowerCase();

  let query = supabase
    .from("bookings")
    .select("id,payment_status,created_at,contact_email,user_id")
    .in("payment_status", BLOCKING_STATUSES);

  query = meetingId
    ? query.eq("meeting_id", meetingId)
    : query.eq("event_key", eventKey);

  const { data, error } = await query;
  if (error) {
    // Fail open on a read error rather than blocking a legitimate booking,
    // but make it loud in the logs. The DB unique index is the backstop.
    console.error("Duplicate booking check failed:", error);
    return null;
  }

  const match = (data ?? []).find((b: Record<string, unknown>) => {
    const rowEmail = String(b.contact_email ?? "").trim().toLowerCase();
    if (rowEmail && rowEmail === normalisedEmail) return true;
    if (userId && b.user_id === userId) return true;
    return false;
  });

  return match
    ? {
      id: String(match.id),
      payment_status: String(match.payment_status),
      created_at: String(match.created_at),
    }
    : null;
}
