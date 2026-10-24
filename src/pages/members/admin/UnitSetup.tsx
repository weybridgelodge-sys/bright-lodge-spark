import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fieldCls, fieldLabelCls, fieldHintCls } from "@/lib/fieldStyle";
import { useInitialLoading } from "@/hooks/useInitialLoading";
import { loadLodgeIdentity } from "@/lib/lodgeIdentity";
import { changedFields, clearedRequired, patchFor, REQUIRED_UNIT_FIELDS, type FieldMap } from "@/lib/unitSetupForm";
import { emailError, MEMBERSHIP_OFFICER_UNIT_KEY, normaliseEmail } from "@/lib/membershipOfficerEmail";
import { SUMMONS_COVER_UNIT_KEY, coverImageError, coverImageUrl } from "@/lib/summonsCoverImages";
import { CREST_IMAGE_UNIT_KEY, crestUrlError, crestUrlFrom, normaliseCrestUrl } from "@/lib/crestImage";
import { canonicalSortCode, signOff, validAccountNumber, paymentReference } from "@/lib/bookingDetails";

type Form = {
  lodge_name: string; lodge_number: string; consecration_date: string;
  account_name: string; sort_code: string; account_number: string; reference_pattern: string;
  card_wording: string; cheque_payee: string; sign_off_override: string; booking_contact_email: string; membership_officer_email: string; crest_image_url: string; cover_left_url: string; cover_right_url: string;
  venue_id: string; assistant_secretary_email: string; webmaster_email: string; communications_email: string; site_url: string;
  sender_name: string; formal_sender_name: string; facebook_url: string; instagram_url: string; twitter_url: string;
  province_name: string; ico_number: string; newsletter_masthead: string; newsletter_footer_note: string; calendar_name: string;
  provincial_file: string; installation_file: string; provincial_return_email: string; installation_return_email: string;
};
type Venue = { id: string; name: string; address: string | null; display_lines: string[] | null };
const EMPTY: Form = { lodge_name: "", lodge_number: "", consecration_date: "", account_name: "", sort_code: "", account_number: "", reference_pattern: "", card_wording: "", cheque_payee: "", sign_off_override: "", booking_contact_email: "", membership_officer_email: "", crest_image_url: "", cover_left_url: "", cover_right_url: "", venue_id: "", assistant_secretary_email: "", webmaster_email: "", communications_email: "", site_url: "", sender_name: "", formal_sender_name: "", facebook_url: "", instagram_url: "", twitter_url: "", province_name: "", ico_number: "", newsletter_masthead: "", newsletter_footer_note: "", calendar_name: "", provincial_file: "", installation_file: "", provincial_return_email: "", installation_return_email: "" };
type Audit = { id: string; key: string; old_value: unknown; new_value: unknown; changed_by: string | null; changed_at: string };
type Errs = Partial<Record<keyof Form, string>>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 space-y-4" aria-label={title}>
      <h2 className="font-serif text-lg text-gold">{title}</h2>
      {children}
    </section>
  );
}

const rpc = (name: string, args?: object) => (supabase.rpc as any)(name, args);

const CONTACTS: FieldMap<Form> = { assistant_secretary_email: "assistant_secretary_email", webmaster_email: "webmaster_email", communications_email: "communications_email", site_url: "site_url", sender_name: "sender_name", formal_sender_name: "formal_sender_name" };
type Step = { key: string; fields: (keyof Form)[]; value: (changed: (keyof Form)[]) => object };

async function loadForm() {
  const [id, rows, setup] = await Promise.all([loadLodgeIdentity(), (supabase.from("unit_settings" as never) as any).select("key,value"), rpc("get_unit_setup")]);
  if (rows.error) throw rows.error;
  if (setup.error) throw setup.error;
  const su = (setup.data ?? {}) as { contacts?: Record<string, string | null>; venues?: Venue[]; can_edit_province_emails?: boolean };
  const c = su.contacts ?? {};
  const by: Record<string, Record<string, string | null>> = {};
  for (const r of (rows.data ?? []) as { key: string; value: Record<string, string | null> }[]) by[r.key] = r.value ?? {};
  const b = by.bank_details ?? {}, p = by.payment_wording ?? {};
  const form: Form = {
    lodge_name: id.lodgeName, lodge_number: id.lodgeNumber, consecration_date: id.consecrationDate,
    account_name: b.account_name ?? "", sort_code: b.sort_code ?? "", account_number: b.account_number ?? "", reference_pattern: b.reference_pattern ?? "",
    card_wording: p.card_wording ?? "", cheque_payee: p.cheque_payee ?? "", sign_off_override: by.sign_off?.override ?? "",
    booking_contact_email: by.booking_contact_email?.email ?? "",
    membership_officer_email: by[MEMBERSHIP_OFFICER_UNIT_KEY]?.email ?? "",
    crest_image_url: by[CREST_IMAGE_UNIT_KEY]?.url ?? "",
    cover_left_url: by[SUMMONS_COVER_UNIT_KEY]?.left_url ?? "", cover_right_url: by[SUMMONS_COVER_UNIT_KEY]?.right_url ?? "",
    venue_id: by.meeting_place?.venue_id ?? "", assistant_secretary_email: c.assistant_secretary_email ?? "", webmaster_email: c.webmaster_email ?? "",
    communications_email: c.communications_email ?? "", site_url: c.site_url ?? "", sender_name: c.sender_name ?? "", formal_sender_name: c.formal_sender_name ?? "",
    facebook_url: by.web_social?.facebook_url ?? "", instagram_url: by.web_social?.instagram_url ?? "", twitter_url: by.web_social?.twitter_url ?? "",
    province_name: by.province?.name ?? "", ico_number: by.registrations?.ico_number ?? "", newsletter_masthead: by.newsletter?.masthead ?? "",
    newsletter_footer_note: by.newsletter?.footer_note ?? "", calendar_name: by.calendar_feed?.name ?? "",
    provincial_file: by.return_files?.provincial ?? "", installation_file: by.return_files?.installation ?? "",
    provincial_return_email: by.province?.provincial_return_email ?? "", installation_return_email: by.province?.installation_return_email ?? "",
  };
  return { form, contactEmail: id.secretaryEmail, venues: su.venues ?? [], canEditProv: su.can_edit_province_emails === true };
}

function Inner() {
  const [f, setF] = useState<Form>(EMPTY);
  const [orig, setOrig] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [canEditProv, setCanEditProv] = useState(false);
  const [canView, setCanView] = useState<boolean | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [errs, setErrs] = useState<Errs>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<Audit[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useInitialLoading();

  const loadAudit = async () => {
    const { data } = await (supabase.from("unit_settings_audit" as never) as any).select("*").order("changed_at", { ascending: false }).limit(20);
    const rows = (data as Audit[]) ?? [];
    setAudit(rows);
    const ids = [...new Set(rows.map((r) => r.changed_by).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,first_name,last_name").in("id", ids);
      setNames(Object.fromEntries(((ps ?? []) as { id: string; first_name: string | null; last_name: string | null }[]).map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ")])));
    }
  };

  useEffect(() => {
    (async () => {
      const uid = (await supabase.auth.getSession()).data.session?.user?.id;
      const [v, e] = await Promise.all([rpc("can_view_unit_setup", { _user: uid }), rpc("can_edit_unit_setup", { _user: uid })]);
      setCanView(v.data === true); setCanEdit(e.data === true);
      if (v.data !== true) { setLoading(false); return; }
      try {
        const r = await loadForm();
        setVenues(r.venues); setCanEditProv(r.canEditProv); setContactEmail(r.contactEmail);
        setF(r.form); setOrig(r.form);
      } catch {
        // Never show blanks as if they were the saved values: saving stays off.
        setLoadError("The saved details could not be loaded, so saving is switched off. Reload the page to try again.");
      }
      await loadAudit().catch(() => {});
      setLoading(false);
    })().catch(() => { setCanView(false); setLoading(false); });
  }, []);

  const save = async (section: string, steps: Step[], check: () => Errs) => {
    if (!orig) return;
    const all = steps.flatMap((s) => s.fields);
    const changed = changedFields(orig, f, all);
    if (!changed.length) { setErrs({}); setStatus((s) => ({ ...s, [section]: "No changes to save." })); return; }
    const e = { ...check(), ...clearedRequired(f, changed, [...REQUIRED_UNIT_FIELDS]) };
    for (const k of Object.keys(e) as (keyof Form)[]) if (!all.includes(k)) delete e[k];
    setErrs(e);
    if (Object.keys(e).length) { setStatus((s) => ({ ...s, [section]: "Please correct the highlighted fields." })); return; }
    setBusy(section); setStatus((s) => ({ ...s, [section]: "" }));
    let failed = "";
    for (const st of steps) {
      const ch = changed.filter((k) => st.fields.includes(k));
      if (!ch.length) continue;
      const { error } = await rpc("save_unit_setup", { _key: st.key, _value: st.value(ch) });
      if (error) { failed = error.message; break; }
    }
    // Refresh the stored values; keep what the user typed if the save failed.
    try {
      const r = await loadForm();
      setOrig(r.form);
      if (!failed) setF((x) => { const n = { ...x }; for (const k of all) n[k] = r.form[k]; return n; });
    } catch { /* keep the form as typed */ }
    setBusy("");
    const at = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setStatus((s) => ({ ...s, [section]: failed ? `Not saved: ${failed}. Your changes are still in the form.` : `Saved at ${at}.` }));
    loadAudit().catch(() => {});
  };
  const whole = (m: FieldMap<Form>) => () => patchFor(f, Object.keys(m) as (keyof Form)[], m);
  const only = (m: FieldMap<Form>) => (ch: (keyof Form)[]) => patchFor(f, ch, m);

  const ro = !canEdit;
  const field = (k: keyof Form, label: string, opts: { hint?: string; type?: string; inputMode?: "numeric" | "text" | "email" | "url"; readOnly?: boolean; tall?: boolean } = {}) => (
    <div>
      <label htmlFor={`us-${k}`} className={fieldLabelCls}>{label}</label>
      <input id={`us-${k}`} type={opts.type ?? "text"} inputMode={opts.inputMode} value={f[k]} readOnly={ro || opts.readOnly} autoComplete="off"
        aria-invalid={!!errs[k]} aria-describedby={[opts.hint ? `us-${k}-hint` : "", errs[k] ? `us-${k}-err` : ""].filter(Boolean).join(" ") || undefined}
        onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className={`${fieldCls} mt-1 ${opts.tall ? "min-h-[48px]" : "min-h-[44px]"}`} />
      {opts.hint && <span id={`us-${k}-hint`} className={fieldHintCls}>{opts.hint}</span>}
      {errs[k] && <span id={`us-${k}-err`} className="mt-1 block text-sm text-gold-light">{errs[k]}</span>}
    </div>
  );
  const saveBtn = (section: string, onClick: () => void, tall = false) => canEdit && (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Button type="button" onClick={onClick} disabled={busy === section || !orig} className={tall ? "min-h-[48px]" : "min-h-[44px]"}>{busy === section ? "Saving…" : "Save"}</Button>
      <p role="status" className="font-sans text-sm text-primary-foreground/90">{status[section]}</p>
    </div>
  );
  if (loading || canView === null) return <MembersLayout><p role="status" className="font-sans text-sm text-primary-foreground/80">Loading…</p></MembersLayout>;
  if (!canView) return <MembersLayout><p className="font-sans text-sm text-primary-foreground">You don't have access to Unit Setup.</p></MembersLayout>;

  const preview = signOff({ lodgeName: f.lodge_name, lodgeNumber: f.lodge_number, signOffOverride: f.sign_off_override.trim() });
  const fmt = (v: unknown) => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${x ?? "—"}`).join("; ") : "—");

  return (
    <MembersLayout>
      <header className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Unit Setup</h1>
        <p className="font-sans text-sm text-primary-foreground/80">Lodge details used across the portal and the public booking pages.{ro && " You can view these details; only the Admin, Secretary or Treasurer can change them."}</p>
      </header>
      {loadError && <p role="alert" className="mb-4 max-w-2xl rounded-sm border border-gold/60 p-3 font-sans text-sm text-primary-foreground">{loadError}</p>}
      <div className="max-w-2xl space-y-6 font-sans text-primary-foreground">
        <Section title="Lodge identity">
          {field("lodge_name", "Lodge name")}
          {field("lodge_number", "Lodge number", { inputMode: "numeric" })}
          {field("consecration_date", "Consecration date", { type: "date" })}
          <div>
            <p className={fieldLabelCls}>Contact email</p>
            <p className="mt-1 break-words text-sm">{contactEmail || "Not set"}</p>
            <Link to="/members/admin/contact-settings" className="inline-flex min-h-[44px] items-center text-sm text-gold underline underline-offset-4">Change in Enquiry contact settings</Link>
          </div>
          {saveBtn("identity", () => save("identity", [{ key: "identity", fields: ["lodge_name", "lodge_number", "consecration_date"], value: whole({ lodge_name: "lodge_name", lodge_number: "lodge_number", consecration_date: "consecration_date" }) }], () => {
            const e: Errs = {};
            if (!f.lodge_name.trim()) e.lodge_name = "Enter the lodge name.";
            if (!/^\d{1,6}$/.test(f.lodge_number.trim())) e.lodge_number = "Enter the lodge number in digits.";
            return e;
          }))}
        </Section>

        <Section title="Meetings">
          <p className="text-sm">Meeting dates and the meeting pattern are kept in the Meeting Diary.</p>
          <Link to="/members/admin/secretary" className="inline-flex min-h-[44px] items-center text-sm text-gold underline underline-offset-4">Open the Secretary Portal (Meeting Diary)</Link>
        </Section>

        <Section title="Venue and meeting place">
          <div>
            <label htmlFor="us-venue_id" className={fieldLabelCls}>Meeting place</label>
            <select id="us-venue_id" value={f.venue_id} disabled={ro} onChange={(e) => setF((x) => ({ ...x, venue_id: e.target.value }))} className={`${fieldCls} mt-1 min-h-[44px]`}>
              <option value="">Choose a venue</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <span className={fieldHintCls}>The venue's address is part of the shared venue record, not this lodge.</span>
          </div>
          {(() => { const v = venues.find((x) => x.id === f.venue_id); const lines = v?.display_lines?.length ? v.display_lines : v?.address ? [v.address] : []; return lines.length ? <p className="whitespace-pre-line text-sm">{lines.join("\n")}</p> : null; })()}
          {saveBtn("venue", () => save("venue", [{ key: "meeting_place", fields: ["venue_id"], value: only({ venue_id: "venue_id" }) }], () => (f.venue_id ? {} : { venue_id: "Choose a venue." })))}
        </Section>

        <Section title="Contacts">
          {field("assistant_secretary_email", "Assistant Secretary email", { type: "email", inputMode: "email" })}
          {field("webmaster_email", "Webmaster email", { type: "email", inputMode: "email" })}
          {field("communications_email", "Communications email", { type: "email", inputMode: "email" })}
          {field("sender_name", "Email sender name", { hint: "Shown as the sender of lodge emails." })}
          {field("formal_sender_name", "Formal lodge title", { hint: "Used in invitations and formal emails." })}
          {saveBtn("contacts", () => save("contacts", [{ key: "contacts", fields: ["assistant_secretary_email", "webmaster_email", "communications_email", "sender_name", "formal_sender_name"], value: only(CONTACTS) }], () => {
            const e: Errs = {};
            for (const k of ["assistant_secretary_email", "webmaster_email", "communications_email"] as const) if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f[k].trim())) e[k] = "Enter a valid email address.";
            if (!f.sender_name.trim()) e.sender_name = "Enter a sender name.";
            if (!f.formal_sender_name.trim()) e.formal_sender_name = "Enter the formal title.";
            return e;
          }))}
        </Section>

        <Section title="Web and social">
          {field("site_url", "Website address", { hint: "Starts with https://" })}
          {field("facebook_url", "Facebook link")}
          {field("instagram_url", "Instagram link")}
          {field("twitter_url", "X (Twitter) link")}
          {field("ico_number", "ICO registration number")}
          {saveBtn("web", () => save("web", [
            { key: "contacts", fields: ["site_url"], value: only(CONTACTS) },
            { key: "web_social", fields: ["facebook_url", "instagram_url", "twitter_url"], value: only({ facebook_url: "facebook_url", instagram_url: "instagram_url", twitter_url: "twitter_url" }) },
            { key: "registrations", fields: ["ico_number"], value: only({ ico_number: "ico_number" }) },
          ], () => {
            const e: Errs = {};
            for (const k of ["site_url", "facebook_url", "instagram_url", "twitter_url"] as const) if ((k === "site_url" || f[k].trim()) && !/^https:\/\/[^\s/]+\.[^\s]+$/.test(f[k].trim())) e[k] = "Enter a link starting with https://";
            return e;
          }))}
        </Section>

        <Section title="Province">
          {field("province_name", "Province name", { hint: "e.g. Province of Somewhere" })}
          <p role="note" className="rounded-sm border border-gold/40 p-3 font-sans text-sm text-gold-light">Signed returns are emailed to these addresses. Check them carefully.</p>
          {field("provincial_return_email", "Provincial return email (Provincial Grand Secretary)", { type: "email", inputMode: "email", readOnly: !canEditProv, hint: canEditProv ? undefined : "Only the Secretary or an administrator can change this." })}
          {field("installation_return_email", "Installation return email (Provincial Office)", { type: "email", inputMode: "email", readOnly: !canEditProv, hint: canEditProv ? undefined : "Only the Secretary or an administrator can change this." })}
          {saveBtn("province", () => save("province", [{ key: "province", fields: canEditProv ? ["province_name", "provincial_return_email", "installation_return_email"] : ["province_name"],
            // Both addresses always travel together so the server can check the pair.
            value: (ch) => { const v = only({ province_name: "name", provincial_return_email: "provincial_return_email", installation_return_email: "installation_return_email" })(ch) as Record<string, unknown>;
              if (ch.includes("provincial_return_email") || ch.includes("installation_return_email")) { v.provincial_return_email = f.provincial_return_email.trim(); v.installation_return_email = f.installation_return_email.trim(); }
              return v; } }], () => {
            const e: Errs = {};
            if (!f.province_name.trim()) e.province_name = "Enter the province name.";
            if (canEditProv) for (const k of ["provincial_return_email", "installation_return_email"] as const) if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f[k].trim())) e[k] = "Enter a valid email address. This address is required.";
            return e;
          }))}
        </Section>

        <Section title="Newsletter">
          {field("newsletter_masthead", "Masthead and footer name")}
          {field("newsletter_footer_note", "Footer address line")}
          {saveBtn("newsletter", () => save("newsletter", [{ key: "newsletter", fields: ["newsletter_masthead", "newsletter_footer_note"], value: only({ newsletter_masthead: "masthead", newsletter_footer_note: "footer_note" }) }], () => ({})))}
        </Section>

        <Section title="Calendar feed">
          {field("calendar_name", "Calendar name", { hint: "Shown in members' calendar apps." })}
          {saveBtn("calendar", () => save("calendar", [{ key: "calendar_feed", fields: ["calendar_name"], value: only({ calendar_name: "name" }) }], () => ({})))}
        </Section>

        <Section title="Return file naming">
          {field("provincial_file", "Provincial return file name", { hint: `Use {year}. Example: ${f.provincial_file.replace(/\{year\}/g, "2026")}.pdf` })}
          {field("installation_file", "Installation return file name", { hint: `Use {year}. Example: ${f.installation_file.replace(/\{year\}/g, "2026")}.pdf` })}
          {saveBtn("files", () => save("files", [{ key: "return_files", fields: ["provincial_file", "installation_file"], value: only({ provincial_file: "provincial", installation_file: "installation" }) }], () => {
            const e: Errs = {};
            for (const k of ["provincial_file", "installation_file"] as const) {
              if (!/\{year\}/.test(f[k])) e[k] = "Include {year} in the file name.";
              else if (/[\\/]/.test(f[k])) e[k] = "File names cannot contain slashes.";
            }
            return e;
          }))}
        </Section>

        <Section title="Bank details for dining and event payments">
          <p role="note" className="rounded-sm border border-gold/40 p-3 text-sm">Changes appear on public booking confirmations immediately.</p>
          {field("account_name", "Account name")}
          {field("sort_code", "Sort code", { inputMode: "numeric", hint: "6 digits, with or without dashes." })}
          {field("account_number", "Account number", { inputMode: "numeric", hint: "8 digits." })}
          {field("reference_pattern", "Payment reference pattern", { hint: `Use {surname} for the booker's surname. Example: ${paymentReference(f.reference_pattern, "Smith")}` })}
          {saveBtn("bank", () => save("bank", [{ key: "bank_details", fields: ["account_name", "sort_code", "account_number", "reference_pattern"], value: only({ account_name: "account_name", sort_code: "sort_code", account_number: "account_number", reference_pattern: "reference_pattern" }) }], () => {
            const e: Errs = {};
            if (!f.account_name.trim()) e.account_name = "Enter the account name.";
            if (!canonicalSortCode(f.sort_code)) e.sort_code = "Sort code must be 6 digits.";
            if (!validAccountNumber(f.account_number)) e.account_number = "Account number must be 8 digits.";
            return e;
          }))}
        </Section>

        <Section title="Card payment wording and cheques">
          {field("card_wording", "Card payment option wording", { hint: "Leave blank to use the standard wording." })}
          {field("cheque_payee", "Cheques payable to")}
          {field("booking_contact_email", "Booking queries email", { type: "email", inputMode: "email", hint: "Shown on the public Bookings page. Leave blank to use the Assistant Secretary address." })}
          {saveBtn("payment", () => save("payment", [
            { key: "payment_wording", fields: ["card_wording", "cheque_payee"], value: only({ card_wording: "card_wording", cheque_payee: "cheque_payee" }) },
            { key: "booking_contact_email", fields: ["booking_contact_email"], value: only({ booking_contact_email: "email" }) },
          ], () => {
            const e: Errs = {};
            if (f.booking_contact_email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.booking_contact_email.trim())) e.booking_contact_email = "Enter a valid email address.";
            return e;
          }))}
        </Section>

        <Section title="Membership Officer lodge email">
          {field("membership_officer_email", "Membership Officer lodge email", { type: "email", inputMode: "email", hint: "Used on the UGLE Installation Return. The Secretary can override it on the return itself. Leave blank to use the fallback address." })}
          {saveBtn("membership", () => save("membership", [
            { key: MEMBERSHIP_OFFICER_UNIT_KEY, fields: ["membership_officer_email"], value: (ch) => { const p = only({ membership_officer_email: "email" })(ch); return { ...p, email: normaliseEmail(p.email) }; } },
          ], () => {
            const e: Errs = {};
            const m = emailError(f.membership_officer_email);
            if (m) e.membership_officer_email = m;
            return e;
          }))}
        </Section>

        <Section title="Lodge crest image">
          {field("crest_image_url", "Crest image address (https)", { type: "url", inputMode: "url", hint: "A public https:// link to the crest picture, used in emails and printed documents. Leave blank to leave the crest out.", tall: true })}
          {crestUrlFrom({ url: f.crest_image_url }) && (
            <div className="flex min-w-0 items-center gap-3">
              <img src={crestUrlFrom({ url: f.crest_image_url })!} alt="Crest preview" width={64} height={64} className="h-16 w-16 shrink-0 rounded-sm bg-primary-foreground object-contain p-1" />
              <span className="font-sans text-xs text-primary-foreground/80">Preview. If no picture appears, the address can't be loaded.</span>
            </div>
          )}
          {saveBtn("crest", () => save("crest", [
            { key: CREST_IMAGE_UNIT_KEY, fields: ["crest_image_url"], value: () => ({ url: normaliseCrestUrl(f.crest_image_url) }) },
          ], () => {
            const e: Errs = {};
            const m = crestUrlError(f.crest_image_url);
            if (m) e.crest_image_url = m;
            return e;
          }), true)}
        </Section>

        <Section title="Summons cover images">
          <p className="font-sans text-sm text-primary-foreground/80">Pictures printed either side of the lodge name on the summons front cover, for example award badges. Leave blank for no picture.</p>
          {field("cover_left_url", "Left cover image address", { type: "url", inputMode: "url", hint: "A public https:// link to the picture (or a site address starting with /).", tall: true })}
          {field("cover_right_url", "Right cover image address", { type: "url", inputMode: "url", hint: "A public https:// link to the picture (or a site address starting with /).", tall: true })}
          {saveBtn("cover", () => save("cover", [
            { key: SUMMONS_COVER_UNIT_KEY, fields: ["cover_left_url", "cover_right_url"], value: (ch) => ({
              ...(ch.includes("cover_left_url") ? { left_url: f.cover_left_url.trim() } : {}),
              ...(ch.includes("cover_right_url") ? { right_url: f.cover_right_url.trim() } : {}),
            }) },
          ], () => {
            const e: Errs = {};
            const l = coverImageError(f.cover_left_url); if (l) e.cover_left_url = l;
            const r = coverImageError(f.cover_right_url); if (r) e.cover_right_url = r;
            return e;
          }), true)}
        </Section>

        <Section title="Sign-off">
          <div>
            <label htmlFor="us-sign_off_override" className={fieldLabelCls}>Optional sign-off override</label>
            <textarea id="us-sign_off_override" rows={3} value={f.sign_off_override} readOnly={ro} aria-describedby="us-so-hint"
              onChange={(e) => setF((x) => ({ ...x, sign_off_override: e.target.value }))} className={`${fieldCls} mt-1`} />
            <span id="us-so-hint" className={fieldHintCls}>Leave blank to use the standard sign-off built from the lodge name and number.</span>
          </div>
          <div>
            <p className={fieldLabelCls}>Preview</p>
            <p className="mt-1 whitespace-pre-line text-sm">{preview}</p>
          </div>
          {saveBtn("signoff", () => save("signoff", [{ key: "sign_off", fields: ["sign_off_override"], value: only({ sign_off_override: "override" }) }], () => ({})))}
        </Section>

        <Section title="Change history">
          {audit.length === 0 ? <p className="text-sm">No changes recorded yet.</p> : (
            <ul className="space-y-3 text-sm">
              {audit.map((a) => (
                <li key={a.id} className="border-t border-gold/20 pt-2 break-words">
                  <p className="font-semibold">{a.key.replace(/_/g, " ")} · {new Date(a.changed_at).toLocaleString("en-GB")} · {(a.changed_by && names[a.changed_by]) || "Unknown member"}</p>
                  <p>From: {fmt(a.old_value)}</p>
                  <p>To: {fmt(a.new_value)}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </MembersLayout>
  );
}

export default function UnitSetup() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
