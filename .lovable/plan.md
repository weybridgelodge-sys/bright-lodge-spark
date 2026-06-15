## Members Portal v1

A private area for Weybridge Lodge brethren, gated by login. Backed by Lovable Cloud (auth, database, storage).

### Scope (v1)

1. **Authentication** — Email + password and Google sign-in. **Admin-invite model**: signup is open, but new accounts have no member access until an admin approves (status = pending → active). Pending users see a friendly "awaiting approval" screen.
2. **Roles** — `member` and `admin` stored in a separate `user_roles` table (security‑definer `has_role` function, recursive‑safe RLS).
3. **Profile** — name, masonic rank (W Bro. / RW Bro. / Bro.), office, joined year, phone (optional), avatar.
4. **Members directory** — list of approved brethren, searchable by name/office. Visible only to authenticated, approved members.
5. **Documents** — secretary uploads PDFs (summons, minutes, ritual notes). Private storage bucket; only members can download; only admins can upload/delete. Tagged by category (Summons / Minutes / Ritual / Other).
6. **Private events feed** — admins post member-only notices (text + optional date). Read by all approved members.
7. **Admin panel** — approve/reject pending members, promote to admin, manage documents and notices.

### Routes

```text
/members/login            Sign in / Sign up (tabs)
/members                  Dashboard (welcome, next meeting, recent docs, notices)
/members/directory        Brethren directory
/members/documents        Document library
/members/profile          Edit own profile
/members/admin            Admin (pending users, roles, notices)  [admin only]
/members/pending          "Awaiting approval" screen
```

All `/members/*` routes (except `/members/login` and `/members/pending`) are protected by a `<ProtectedRoute>` wrapper that checks session + approved status.

### Navigation

Add a discreet "Members" link to the header (top-right, near Contact), shown as "Sign in" when logged out and "Members Area" when logged in. Mobile menu gets the same entry.

### Backend (Lovable Cloud)

Tables (all under `public`, with GRANTs + RLS):

- `profiles` — `id uuid PK → auth.users`, `full_name`, `rank`, `office`, `joined_year`, `phone`, `avatar_url`, `status` (`pending`|`active`|`suspended`), timestamps. Auto-created on signup via trigger; default status `pending`.
- `user_roles` — `(user_id, role)` with enum `app_role` (`member`,`admin`). Security‑definer `has_role()` for policy checks.
- `lodge_documents` — `id`, `title`, `category`, `file_path`, `uploaded_by`, `created_at`.
- `member_notices` — `id`, `title`, `body`, `event_date`, `author_id`, `created_at`.

Storage bucket `lodge-docs` (private). RLS: read for active members, write/delete for admins.

Policies (summary):
- `profiles`: a user can read/update their own row; active members can read other active profiles; admins can read/update all.
- `user_roles`: readable by self and admins; writable by admins only.
- `lodge_documents` / `member_notices`: select for active members; insert/update/delete for admins.

### Frontend pieces

- `src/lib/supabase` already wired by Cloud — add `useAuth` hook (session + profile + roles) and `useRequireMember` guard.
- `ProtectedRoute` component that redirects: no session → `/members/login`; pending → `/members/pending`; suspended → logout.
- Pages styled to match the existing navy/gold design system (semi-transparent cards on dark bg, Playfair headings, Inter body).
- Toasts (sonner) for sign‑in/out, upload success, approval actions.

### Out of scope for v1 (can come later)

- Self-service RSVPs / dining numbers
- Password reset email customisation
- Email notifications to admins on new signups (would need an edge function + Resend secret)
- 2FA / SSO / SAML

### Tech notes

- Enable Lovable Cloud first (provisions auth, DB, storage).
- Single SQL migration creates enum, tables, GRANTs, RLS, `has_role()`, signup trigger, and storage bucket + policies.
- Google OAuth: redirect URLs set to current origin; user can later add their own Google credentials in Cloud settings if needed.
- No edge functions required for v1.

After your approval I'll enable Cloud, run the migration, and build the screens.