/**
 * Booking → member matching rule. Mirrors public.sync_attendance_from_booking
 * (migration 0114) so the rule is unit-tested in one place.
 * - Email matches an active member → link, whatever title/lodge was typed.
 * - Otherwise exactly one active member with the same first (or preferred)
 *   and last name → flag only, never link.
 * - Only members of the meeting's unit count (blank meeting unit = all units;
 *   a member with a blank unit never matches a unit-owned meeting).
 * - Otherwise → visitor.
 */
export type MatchProfile = {
  id: string;
  email: string | null;
  first_name: string | null;
  preferred_name?: string | null;
  last_name: string | null;
  status: string | null;
  unit_id?: string | null;
};

export type BookingMatch =
  | { kind: "member"; memberId: string }
  | { kind: "flag"; suspectedMemberId: string }
  | { kind: "visitor" };

const norm = (s: unknown) => (typeof s === "string" ? s.trim().toLowerCase() : "");

export function matchBookingToMember(
  booking: { email?: string | null; firstName?: string | null; lastName?: string | null },
  profiles: MatchProfile[],
  meetingUnit?: string | null,
): BookingMatch {
  const unit = typeof meetingUnit === "string" ? meetingUnit : "";
  const active = profiles.filter((p) => p.status === "active" && (unit === "" || p.unit_id === unit));
  const email = norm(booking.email);
  if (email) {
    const hit = active.find((p) => norm(p.email) === email);
    if (hit) return { kind: "member", memberId: hit.id };
  }
  const first = norm(booking.firstName);
  const last = norm(booking.lastName);
  if (first && last) {
    const hits = active.filter(
      (p) => norm(p.last_name) === last && (norm(p.first_name) === first || norm(p.preferred_name) === first),
    );
    if (hits.length === 1) return { kind: "flag", suspectedMemberId: hits[0].id };
  }
  return { kind: "visitor" };
}
