# Booking tidy-ups, sign-up redesign, dietary and bulk import

Nothing is published. Old rows are left alone until you approve each data step.

## What the code and database show today
- **Fee storage already exists.** Bookings already have subtotal, fee and total amounts. Booking 6f1a6926 does in fact have them stored: base 35.00, fee 0.90, total 35.90, paid. The total is stored; it just isn't shown where you looked. All 38 paid bookings have a fee and a total, so no money columns need backfilling. The gap is in what's displayed: the confirmation page and the four emails don't all show a separate fee line yet.
- **Names:** 2 of 63 bookings have stray or double spaces. New saves have trimmed and collapsed spaces since the last fix. Register visitor names will be counted the same way before any backfill.
- **Waitlist:** an unpaid waitlisted card booking isn't picked up by the hourly cleanup, which only looks at payment status "pending".
- **Sign-in page:** it offers self-registration (which includes typing in a Grand Lodge Ref. No.), a magic link that creates an account for an email it doesn't know, and Google sign-in. There are 25 member records at the moment, not 30. I'll list them by sign-in method before changing anything.
- **Dietary:** already built. It is stored privately on the member record and read only through the private-details function. The Festive Board booking form already pre-fills it while the box is empty. The register export already has a "Special requirements" column.

## Part 1: Booking tidy-ups
1. **Fee display:** one shared line builder gives Base, Card processing fee (left out when it's 0) and Total, all read from the stored values. Used by the confirmation page, the confirmation email, the receipt and the lodge notification. The register amount stays the base price. The Treasurer pairs the total with what Stripe charged. A read-only check will confirm that every stored total matches Stripe for the 38 paid bookings, and list any that don't.
2. **Names:** keep trimming on save, and extend it to register visitor and guest names. Backfill later: one update that trims and collapses spaces on the 2 bookings plus the register rows found, run only when you say.
3. **Repeated date:** remove the date from the event line in the booking emails and keep the Date line.
4. **Waitlist:** the cleanup also picks up unpaid waitlisted card bookings that have a Stripe session. Same rules as pending ones: Stripe checked first, 60-minute hold, 15-minute grace, linked register rows deleted. Anything paid is never deleted. Unit tests cover paid in grace, expired, no session and still within the hour. A dry run comes before the first real run.

## Part 2: Sign-up redesign
- Remove self-registration and Google sign-up for people the lodge doesn't know. A Google sign-in for an unknown email is signed out straight away with an "ask for access" message. The magic link stops creating accounts, so an unknown email gets the same neutral message as everyone else.
- Accounts are created only by the Secretary or admin, through pre-create or the bulk import, and each one sends the branded invite email.
- New public **Request access** form: Turnstile check, a hidden honeypot field, and an email to the Secretary. No account is created and nothing is saved beyond what the email needs.
- **Decision needed:** should marking a candidate "initiated" create the account automatically, or just show the Secretary a one-click "Invite" prompt? I suggest the prompt, because the candidate's email may not be checked yet.
- The Grand Lodge Ref. No. is removed from every self-service form. It stays editable in Edit Member only.
- **Affected:** the sign-in page, the new-account setup in the database (it would no longer copy the ref no. from what someone typed at sign-up), and the backend sign-in settings. Existing accounts don't change.
- **Tests:** one each for the removed paths: sign-up hidden, magic link for an unknown email creates nothing, Google for an unknown email is refused.

## Part 3: Dietary and bulk import
- **Booking-level edit:** add a "Update my saved requirements" tick box. Without it, the booking keeps its own text and the saved record isn't changed.
- **Who is booking:** the form checks whether someone is signed in. A visitor or guest gets no pre-fill and types their own text, which is stored on that booking only.
- **PerfectTablePlan export:** switch to the "Special req." column name from PerfectTablePlan's published guest-import format (checked first), keeping the column order and the combined notes. The cell shows the booking's own text and stays blank if the booking has none, never falling back to the saved record. Each guest gets his own text. Sample row: `Bro.,John,Smith,Weybridge,Beef,"No nuts",Attending`. It's limited to the roles that can already export.
- **Who can see it:** I'll show you the current database permissions as they stand. Planned: no general read access to that field; the private-details function only for the member himself, the Secretary, admin and the catering screens.
- **Bulk import:** an import screen already exists. Planned changes:
  - Imported members are created as active.
  - Each one is sent the invite email.
  - It runs for any lodge using that lodge's ID.
  - It keeps the preview, the confirm step and safe re-runs.
  - Proposed columns: title, names, email, phone, address, dates, degree, Grand Lodge Ref. No., Past Master, Royal Arch, honorary, dietary.
  - No financial fields and no roles.

## Checks
Every changed screen gets a 320px check and an accessibility scan with colour contrast on: confirmation page, Request access, sign-in, booking form, import dialog. Screens that need a signed-in officer to scan will be reported as unscanned. Theme colours only.
