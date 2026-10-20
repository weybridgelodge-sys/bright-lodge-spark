# Book my place (members portal) — findings and plan

Nothing goes live before the 21 Oct 2026 meeting. Step 2 is built only after Step 1 is reviewed.

## Findings (read-only)

**a) How booking works today**
- Meetings: public `/bookings` (`src/pages/Bookings.tsx`) loads the next published `lodge_events` row (`fetchNextEvent`), links it to its register meeting via `get_published_meeting_for_event`, and submits through `save-meeting-response` (bank / pay on the night / apologies) or `create-checkout` + `StripeEmbeddedCheckoutPanel` (card). With no open event it shows Save the Date. The form lives inside the page, not as a reusable component.
- Public events (e.g. Christmas party): `/events/:slug` (`PublicEvent.tsx`) reads the `public_events` view of `event_accounts`, uses `BookingCore` for the form and `create-event-checkout`; bookings go to a separate table, `event_bookings`.
- Socials (`lodge_socials`): an invite/notification list only. No price, deadline or booking flow. They cannot become "Book" cards without new work.
- Reusable: `BookingCore`, `StripeEmbeddedCheckoutPanel`, `bookingTitles`, `nameCase`, pricing helpers. The meeting form must be lifted out of `Bookings.tsx` into a shared component so both pages render the same thing.

**b) Finding a member's own booking**
- `bookings.user_id` exists. `create-checkout` already fills it when a signed-in token is sent, but the public page doesn't send one, and `save-meeting-response` never sets it. That is why 7c7125aa has no user.
- `event_bookings` has no user or member column.
- Proposed key, in this order: (1) `bookings.user_id` = member (set server-side from the token, never from the browser); (2) register row `festive_board_attendance.member_id` for that meeting; (3) an active-member email match on `contact_email` (same rule as the register trigger). For events: a new nullable `event_bookings.member_id`, otherwise an email match.
- Older bookings: members who booked with their own email, or who already have a linked register row, show their correct status. Anyone who booked with another email and has no register link shows "Not booked". Name-only matches never count.

**c) Deadline and event types**
- The deadline isn't calculated as "meeting date minus 7". It's typed in per event: `lodge_events.booking_deadline` (a date; 21 Oct is set to 16 Oct, 5 days before) and `event_accounts.booking_deadline` (date and time). If it's blank, public events close at the end of the event day. I'll use the stored value and won't add a new rule; please confirm.
- Meeting type comes from `festive_board_meetings.meeting_type` (regular / installation / emergency / dispensation), plus `status` and `cancelled_at`. Public events come from `event_accounts` (`is_public`, `event_type`, `archived_at`, `hosting_lodges` as free text).
- Host unit: `festive_board_meetings`, `bookings` and `profiles` have `unit_id`. **`event_accounts` and `lodge_socials` have no `unit_id`.** Host-unit filtering for public events needs a new column, backfilled to the single current unit.

**d) Risk to the live booking pipeline**
A portal booking calls the same functions, so:
- 60-minute hold and hourly expiry: unchanged. A card hold appears on the card as "Pending payment" until it's paid or expired.
- Register rows only for paid/confirmed: unchanged.
- Member-matching trigger: a portal booking uses the member's profile email, so it always links. This is better than today.
- Expected amount on non-card bookings: unchanged (worked out on the server).
- Waitlist promotion: unchanged; shown as "Waitlisted".
- Double-booking risks: (1) A member with a pending card hold opens the form again. The duplicate guard ignores `pending`, so he could start a second checkout. Fix: the card hides "Book" while a hold is open, and the server refuses a second pending booking for the same user and meeting. (2) A member who booked publicly under another email isn't seen by the duplicate guard. Fix: the guard also checks `user_id` and the register member link. (3) An abandoned checkout tab leaves a pending row, which the hourly expiry already clears.
- Add a guest after booking: a second linked booking with guests only (`details.parentBookingId`, no diner row for the member himself), priced per person, using the same payment methods. The first booking is never edited.

## Plan

**Step 1 — screen and Hub tile (nothing changes in the booking pipeline)**
- New page `/members/book` ("Book my place"), plus a tile on the members Hub and in the portal menu. Module key: `member_bookings`.
- A security-definer function `get_my_bookable_items()` returns, for the signed-in member's units: the next non-cancelled published Regular/Installation meeting with an open `lodge_events` row, and open public `event_accounts` hosted by those units. Each item carries its title, date, per-person price, deadline and the member's status, worked out by the key in (b). Past events are excluded. After the deadline the item stays, marked closed, until the event date.
- Cards show the event, date, price per person, deadline and a status badge: Not booked / Pending payment / Booked / Waitlisted / Apologies / "Booking closed, contact the Secretary". There's no cancel button. In Step 1, "Book" opens the existing public page.
- Migration: add `event_accounts.unit_id` (nullable, backfilled to the current unit) and `event_bookings.member_id` (nullable). Nothing is hard-coded: no lodge name, URL or email.
- Socials appear only once they have a price and a booking flow. That would be a separate decision.

**Step 2 — in-portal booking**
- Lift the meeting form out of `Bookings.tsx` into `components/bookings/MeetingBookingForm.tsx`, used unchanged by both pages. The portal pre-fills it from the profile and the dietary note via `get_profiles_pii`.
- The portal sends the member's sign-in token. `save-meeting-response`, `create-checkout` and `create-event-checkout` set `user_id` / `member_id` from the token on the server.
- Duplicate guard extended (no second pending hold; checks user and register links). Add a "+ Add a guest" button on booked cards, which creates the linked guest booking.
- Redirect: a signed-in member opening `/bookings` goes to `/members/book`. Deep links with a query, email links and QR codes still work: visitors aren't affected, and links to `/events/:slug` are left alone. Inside the native app the same redirect applies. The redirect runs in the app, so cached pages don't matter.

## Tests
- Unit: status key order (user_id, then register member, then email; a name-only match never counts); deadline/closed/past visibility; host-unit filter; second-pending refusal; guest-only linked booking pricing; redirect only when signed in.
- Browser: `/members/book` at 320px with worst-case data (long titles, every status) using the e2e synthetic identity, checked for overflow and 44px targets; axe WCAG 2.1 AA with colour contrast on. Same for the Hub tile and the in-portal form.

## Will not touch
The register, the dining reconciliation panel, ledger posting, the GMC invoice and the PerfectTablePlan export.

## Decisions needed
1. Deadline: keep the per-event stored date (the 21 Oct deadline is 16 Oct), or apply "date minus 7" as the default when it's blank?
2. Socials: leave them out until they have prices and booking?
3. The Christmas party is in `event_bookings`, not `bookings`. Is matching by member id/email there acceptable?
