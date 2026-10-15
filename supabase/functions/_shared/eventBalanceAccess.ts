// Public balance-link lookup shared by get-event-balance and create-event-balance-checkout.
// Every failure returns null so callers give one generic "link no longer valid" answer.
import { balanceLinkLive, balanceStillOwed, isBalanceToken } from "./eventPricing.ts";
import { londonToday } from "./stripe-events.ts";

export async function loadByBalanceToken(sb: any, token: unknown) {
  if (!isBalanceToken(token)) return null;
  const { data: t } = await sb.from("event_booking_balance_tokens").select("booking_id").eq("token", token).maybeSingle();
  if (!t) return null;
  const { data: b } = await sb.from("event_bookings").select("*").eq("id", t.booking_id).maybeSingle();
  if (!b || (b.payment_status !== "deposit_paid" && b.payment_status !== "paid")) return null;
  const { data: ev } = await sb.from("event_accounts").select("*").eq("id", b.event_id).is("archived_at", null).maybeSingle();
  if (!ev || ev.event_date < londonToday()) return null;
  const { count: undecided } = await sb.from("event_guest_course_choices").select("id", { count: "exact", head: true }).eq("booking_id", b.id).eq("decide_later", true);
  const balanceOpen = balanceStillOwed(b);
  if (!balanceLinkLive(b, undecided ?? 0)) return null; // paid and nothing left to choose: link is used up
  return { booking: b, ev, balanceOpen, undecided: undecided ?? 0 };
}
