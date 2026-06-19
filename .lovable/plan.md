## Charity Steward Module & Portal Navigation Consolidation

Two large, related pieces of work. I'll plan both, then build in sequence after your approval.

---

### Part A — Charity Steward Module

A single `/members/admin/charity` screen with five tabs plus a settings panel for the public website feed. Read-only for Secretary; full edit for Charity Steward and WM; Admin sees everything.

**New database tables** (Lovable Cloud / Supabase):

1. `charity_ledger` — charity directory
   - name, charity_number, description, contact_name, email, phone, website, status (active/inactive)
2. `charity_collections` — money collected
   - date, lodge_event_id (nullable FK), collection_type (enum: charity_column / raffle / ad_hoc / relief_chest / other), gross_amount, costs, net_amount (generated), notes
3. `charity_donations` — outgoing donations
   - date, charity_id (FK → charity_ledger), amount, purpose, payment_method (enum), payment_reference, authorised_by (enum), confirmation_received, is_festival_contribution
4. `charity_festival_settings` — single-row config
   - target_amount, festival_name, notes, public_feed_start_date, public_feed_start_amount (baseline for homepage widget)
5. `charity_annual_reports` — finalised year-end snapshots
   - masonic_year, payload (jsonb), notes, finalised_at

New role `charity_steward` added to `app_role` enum, plus `can_edit_charity(uuid)` and `can_view_charity(uuid)` security-definer helpers. RLS:
- Edit: admin, WM, charity_steward
- Read: admin, WM, charity_steward, secretary, treasurer
- Public anon read on aggregated views only (see widgets)

Two SQL views for the public website feed (anon-readable, no PII):
- `public_charity_totals` — all-time total since `public_feed_start_date` + start baseline
- `public_charity_year_breakdown` — current Masonic year totals + per-charity breakdown + festival progress

**New UI** (`src/pages/members/admin/CharitySteward.tsx`):

Single page with shadcn `Tabs`:
- **Collections** — table + add/edit dialog; summary cards (YTD by type, Relief Chest balance, per-meeting subtotals)
- **Donations** — table + add/edit dialog with charity picker; YTD + grand total + relief chest disbursements
- **Charity Ledger** — searchable/sortable table; row click opens drawer with that charity's full donation history (auto-calc last donation date + total donated)
- **Festival Tracker** — target editor, progress bar in gold, % reached, projected final based on rate-to-date, contribution list, notes
- **Annual Report** — year picker, on-screen preview, PDF export via new `src/lib/charity/annualReportPdf.ts` (matches Almoner / Lodge Summary styling), "Finalise" button snapshots to `charity_annual_reports`
- **Website Feed** — start date + baseline amount editor, preview of both widgets

**Public website widgets**:
- `src/components/charity/HomepageCharityCTA.tsx` — mounted on `Index.tsx`
- Extend `src/pages/OurCharities.tsx` with year total, all-time total, per-charity list, festival progress bar
- Both read from the public views via the existing anon Supabase client

---

### Part B — Portal Navigation Consolidation

`MembersLayout.tsx` currently renders a long flat sidebar plus a 4-item bottom bar. Reorganise into four buckets with sub-navigation. **No routes are removed and no functionality changes** — only the navigation surface.

**Bottom bar** (unchanged items): Hub / Trestle / Ritual / Accounts. Each opens its section landing page with a sub-nav (shadcn `Tabs` strip at the top of the page) listing the relevant tools.

**New section landing pages** (each is just a small wrapper that renders the section sub-nav + routes to existing pages):
- `/members` → Hub (existing Dashboard, plus Admin panel card for admin roles)
- `/members/trestle` → Trestle landing with sub-tabs: Meetings & Summons, Festive Board, Working Groups
- `/members/ritual-hub` → Ritual landing with sub-tabs: Ritual Archive, Skills Matrix, My Development
- `/members/accounts` → Accounts landing with sub-tabs: Bookings, Festive Board payments

**Admin** (no bottom-bar slot — surfaced as a card on Hub for users with any admin role, and as a sub-nav strip on `/members/admin`):
- Members, Almoner Portal, Mentor Portal, **Charity Steward**, KPI Dashboard
- Each item visible only if the user holds the owning role (or is WM/admin); omitted entirely otherwise

**Desktop sidebar** is replaced by the same four-bucket model with collapsible sub-sections, so desktop and mobile share the structure.

**Role visibility helpers** added to `useAuth`:
- `isCharitySteward`, `canAccessCharity`, `canAccessAdminArea` (= any admin role)

All existing routes (`/members/loi-register`, `/members/summons`, `/members/working-groups/*`, `/members/admin/development`, etc.) continue to work unchanged — they're just grouped under the new section landings rather than listed flat.

---

### Build order

1. Migration: `charity_steward` role + 5 tables + 2 public views + RLS/grants
2. Charity Steward page + sub-components + PDF export
3. Public widgets (Homepage CTA + Our Charities extension)
4. Navigation consolidation in `MembersLayout` + new section landing pages
5. Wire Admin panel card on Hub

### Open questions before I start

1. **Treasurer role** — you mention Treasurer should see the Relief Chest running total. There's no `treasurer` role today. Add it now (read-only on charity), or just grant read to WM/Secretary/Charity Steward for v1?
2. **Masonic year boundary** — Lodge year currently starts in October (per `current_lodge_year()`). Use the same boundary for the Charity "Masonic year"? (Assumed yes unless you say otherwise.)
3. **Direct Relief Chest donations** — recorded only on the Collections side (as a collection type), or do you also want them as a category on the Donations log when disbursed *from* the chest? I'll model it as: Collections feed the chest balance up, Donations flagged "from relief chest" draw it down.
