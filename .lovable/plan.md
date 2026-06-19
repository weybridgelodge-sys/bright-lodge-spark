## Newsletter system — what I'll build

### 1. Backend (Lovable Cloud)

**New table `newsletter_subscribers`** (single opt-in)
- email (unique, lowercase), source ('public_signup' | 'imported' | 'manual'), confirmed (default true), unsubscribed_at, unsubscribe_token (uuid), created_at
- RLS: anyone can INSERT (public signup); only admins can SELECT/UPDATE/DELETE; service_role full access for the edge function

**New table `newsletter_broadcasts`** (audit log of every send)
- subject, target_list, content (jsonb of the four sections), sent_by (uuid), recipient_count, resend_broadcast_id, status ('sending'|'sent'|'failed'), error, created_at
- RLS: only newsletter editors can read; service_role writes

**New SQL function `can_edit_newsletter(_user uuid)`** returns true if user is:
- `admin`, OR
- `worshipful_master` role, OR
- `secretary` role, OR
- a member of the "Communications & Heritage Group" working group

### 2. Resend connector

I'll prompt you to link the **Resend** App connector (you'll paste your Resend API key once). Your sending domain `notify.weybridgelodge.org.uk` is already DNS-verified inside Lovable, so I'll set the From address to `Weybridge Lodge <chronicle@notify.weybridgelodge.org.uk>`. If you prefer a different sending domain you've verified inside Resend itself, tell me and I'll swap it.

### 3. Edge function `broadcast-newsletter`
- Validates caller's JWT, checks `can_edit_newsletter(auth.uid())`
- Compiles recipient list from selected target:
  - **Portal & Candidates**: profiles (status active+pending) ∪ candidates.email
  - **Visitors & Public**: newsletter_subscribers where unsubscribed_at is null
- Renders branded HTML (navy/gold, Playfair heading) from the four content blocks + unsubscribe link
- Creates a Resend Broadcast via gateway (`POST /broadcasts` then `POST /broadcasts/:id/send`) — uses a Resend Audience kept in sync per send so we don't loop sends ourselves
- Inserts a `newsletter_broadcasts` row, returns the count

### 4. Edge function `newsletter-unsubscribe`
- Public GET endpoint; marks `unsubscribed_at = now()` by token. Returns a small branded HTML confirmation page.

### 5. UI — Admin Hub (`/members/admin/newsletter`)
- Route protected by `can_edit_newsletter` (client check + RLS enforces server-side)
- Composer form matching your design: target-list tabs, subject, 4 textareas (WM's Desk, Meeting Recap, Charity Spotlight, Masonic History)
- Live email preview pane (navy header, gold accents, your brand fonts)
- "Broadcast" button → calls edge function → success state with recipient count
- Adds link card on `AdminHub.tsx` (visible only to authorised users)

### 6. UI — Public signup widget (`NewsletterSignup.tsx`)
- Mounted in `Footer.tsx`
- Honeypot field, email validation (zod), POSTs to a tiny `newsletter-subscribe` edge function (no auth) which inserts into `newsletter_subscribers` (idempotent on email)
- Success confirmation state

### Notes
- Templates use your existing brand tokens (navy `#1B2A4A`, gold `#C9A432`, Playfair/Inter) — no hardcoded colors in components.
- This is marketing email; it does NOT go through Lovable's transactional email queue — only through Resend Broadcasts, which is the correct tool for list sends.
- "Communications & Heritage Group" membership is read live each broadcast, so adding/removing members in the working group automatically grants/revokes Newsletter Hub access.

Approve and I'll build it end-to-end.