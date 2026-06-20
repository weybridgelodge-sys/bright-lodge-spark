## Phase 2 — Visitor Contacts & Dedup

### 1. Database migration

New tables and trigger to extract unique visiting Freemasons from `festive_board_attendance`.

**`visitor_contacts`**
- `id`, `email` (unique, normalized lowercase/trimmed), `name`, `lodge_name`, `lodge_number`
- `opted_out_at` (nullable), `unsubscribe_token` (unique, default `gen_random_uuid()::text`)
- `first_seen_at`, `last_seen_at`, `created_at`
- Trigger: lowercase/trim email on write
- RLS: members can read (for name-search UI); only admins/secretary/WM can update/delete; service role full
- GRANTs: `SELECT` to authenticated; `ALL` to service_role

**`visitor_attendances`** (link table, one row per visit)
- `id`, `visitor_contact_id` → `visitor_contacts(id)` on delete cascade
- `festive_board_attendance_id` → `festive_board_attendance(id)` on delete cascade (unique)
- `created_at`
- RLS: members read; service role full; GRANTs accordingly

**Find-or-create trigger on `festive_board_attendance`**
- AFTER INSERT OR UPDATE OF `email` on `festive_board_attendance`
- If `NEW.email` is null/blank → return
- Skip if the attendee is a registered member (i.e. `user_id` matches an active profile)
- Normalize email; UPSERT into `visitor_contacts` (insert if missing with token; on existing only fill `name`/`lodge_name`/`lodge_number` where currently blank; always bump `last_seen_at`)
- Insert link row into `visitor_attendances` (ignore on conflict so re-saves don't duplicate)

**Backfill**: one-time pass over existing `festive_board_attendance` rows where `email IS NOT NULL` to seed `visitor_contacts` + link rows.

### 2. `broadcast-newsletter` edge function

In the `"members"` (Lodge Members & Visitors) recipient query:
- Continue fetching active/pending members minus `member_newsletter_opt_outs`
- Additionally fetch `visitor_contacts` where `opted_out_at IS NULL`
- Merge and dedup by normalized email; member tokens take precedence over visitor tokens when the same email appears in both
- Each visitor recipient gets its `unsubscribe_token` injected into the footer URL the same way member tokens are today
- "all" merged send extends the same way (visitors union into the members-side of the union before the final dedup with public subscribers)

### 3. `newsletter-unsubscribe` edge function

Extend token lookup order: member token → public subscriber token → **visitor_contacts token**. For visitor matches, set `opted_out_at = now()`. Same confirmation response shape; copy clarifies "newsletter only — summonses and booking confirmations unaffected."

### 4. Festive Board UI — name-search-first suggestions

In `src/pages/members/FestiveBoardRegister.tsx`, on the visitor row name input:
- Debounced query (250ms) against `visitor_contacts` using `ilike` on `name` once ≥2 chars typed
- Render a small suggestion popover (existing `Command`/`Popover` shadcn primitives) showing up to 6 matches as *"J. Smith — Lodge of Friendship No. 1234 — last attended Mar 2023"*
- Selecting a suggestion pre-fills `name`, `lodge_name`, `lodge_number`, `email`; the trigger then handles linking on save
- Secretary can ignore suggestions and type freely; email-based dedup remains authoritative

### 5. Types

Run after migration approval — regenerated `src/integrations/supabase/types.ts` will pick up the two new tables; only consumer files (`FestiveBoardRegister.tsx`, the two edge functions) need code changes.

### Out of scope (per brief)
- Historical paper visitors-book backfill
- Fuzzy email matching for typos

### Files touched
- `supabase/migrations/<new>.sql` (tables, GRANTs, RLS, trigger, backfill)
- `supabase/functions/broadcast-newsletter/index.ts`
- `supabase/functions/newsletter-unsubscribe/index.ts`
- `src/pages/members/FestiveBoardRegister.tsx`
