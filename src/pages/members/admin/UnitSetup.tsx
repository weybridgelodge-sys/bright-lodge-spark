import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fieldCls, fieldLabelCls, fieldHintCls } from "@/lib/fieldStyle";
import { useInitialLoading } from "@/hooks/useInitialLoading";
import { loadLodgeIdentity } from "@/lib/lodgeIdentity";
import { canonicalSortCode, signOff, validAccountNumber, paymentReference } from "@/lib/bookingDetails";

type Form = {
  lodge_name: string; lodge_number: string; consecration_date: string;
  account_name: string; sort_code: string; account_number: string; reference_pattern: string;
  card_wording: string; cheque_payee: string; sign_off_override: string; booking_contact_email: string;
};
const EMPTY: Form = { lodge_name: "", lodge_number: "", consecration_date: "", account_name: "", sort_code: "", account_number: "", reference_pattern: "", card_wording: "", cheque_payee: "", sign_off_override: "", booking_contact_email: "" };
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

function Inner() {
  const [f, setF] = useState<Form>(EMPTY);
  const [contactEmail, setContactEmail] = useState("");
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
      const [id, rows] = await Promise.all([loadLodgeIdentity().catch(() => null), (supabase.from("unit_settings" as never) as any).select("key,value")]);
      const by: Record<string, Record<string, string | null>> = {};
      for (const r of (rows.data ?? []) as { key: string; value: Record<string, string | null> }[]) by[r.key] = r.value ?? {};
      const b = by.bank_details ?? {}, p = by.payment_wording ?? {};
      setContactEmail(id?.secretaryEmail ?? "");
      setF({
        lodge_name: id?.lodgeName ?? "", lodge_number: id?.lodgeNumber ?? "", consecration_date: id?.consecrationDate ?? "",
        account_name: b.account_name ?? "", sort_code: b.sort_code ?? "", account_number: b.account_number ?? "", reference_pattern: b.reference_pattern ?? "",
        card_wording: p.card_wording ?? "", cheque_payee: p.cheque_payee ?? "", sign_off_override: by.sign_off?.override ?? "",
        booking_contact_email: by.booking_contact_email?.email ?? "",
      });
      await loadAudit();
      setLoading(false);
    })().catch(() => { setCanView(false); setLoading(false); });
  }, []);

  const save = async (section: string, key: string, value: object, check: () => Errs) => {
    const e = check(); setErrs(e);
    if (Object.keys(e).length) { setStatus((s) => ({ ...s, [section]: "Please correct the highlighted fields." })); return; }
    setBusy(section); setStatus((s) => ({ ...s, [section]: "" }));
    const { data, error } = await rpc("save_unit_setup", { _key: key, _value: value });
    setBusy("");
    if (error) { setStatus((s) => ({ ...s, [section]: `Not saved: ${error.message}` })); return; }
    if (key === "bank_details" && data?.sort_code) setF((x) => ({ ...x, sort_code: data.sort_code, account_number: data.account_number }));
    setStatus((s) => ({ ...s, [section]: "Saved." }));
    loadAudit();
  };

  const ro = !canEdit;
  const field = (k: keyof Form, label: string, opts: { hint?: string; type?: string; inputMode?: "numeric" | "text" | "email" } = {}) => (
    <div>
      <label htmlFor={`us-${k}`} className={fieldLabelCls}>{label}</label>
      <input id={`us-${k}`} type={opts.type ?? "text"} inputMode={opts.inputMode} value={f[k]} readOnly={ro} autoComplete="off"
        aria-invalid={!!errs[k]} aria-describedby={[opts.hint ? `us-${k}-hint` : "", errs[k] ? `us-${k}-err` : ""].filter(Boolean).join(" ") || undefined}
        onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className={`${fieldCls} mt-1 min-h-[44px]`} />
      {opts.hint && <span id={`us-${k}-hint`} className={fieldHintCls}>{opts.hint}</span>}
      {errs[k] && <span id={`us-${k}-err`} className="mt-1 block text-sm text-gold-light">{errs[k]}</span>}
    </div>
  );
  const saveBtn = (section: string, onClick: () => void) => canEdit && (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Button type="button" onClick={onClick} disabled={busy === section} className="min-h-[44px]">{busy === section ? "Saving…" : "Save"}</Button>
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
          {saveBtn("identity", () => save("identity", "identity", { lodge_name: f.lodge_name.trim(), lodge_number: f.lodge_number.trim(), consecration_date: f.consecration_date }, () => {
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

        <Section title="Bank details for dining and event payments">
          <p role="note" className="rounded-sm border border-gold/40 p-3 text-sm">Changes appear on public booking confirmations immediately.</p>
          {field("account_name", "Account name")}
          {field("sort_code", "Sort code", { inputMode: "numeric", hint: "6 digits, with or without dashes." })}
          {field("account_number", "Account number", { inputMode: "numeric", hint: "8 digits." })}
          {field("reference_pattern", "Payment reference pattern", { hint: `Use {surname} for the booker's surname. Example: ${paymentReference(f.reference_pattern, "Smith")}` })}
          {saveBtn("bank", () => save("bank", "bank_details", { account_name: f.account_name.trim(), sort_code: f.sort_code, account_number: f.account_number, reference_pattern: f.reference_pattern.trim() }, () => {
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
          {saveBtn("payment", async () => {
            await save("payment", "payment_wording", { card_wording: f.card_wording.trim(), cheque_payee: f.cheque_payee.trim() }, () => ({}));
            await save("payment", "booking_contact_email", { email: f.booking_contact_email.trim() }, () => {
              const e: Errs = {};
              if (f.booking_contact_email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.booking_contact_email.trim())) e.booking_contact_email = "Enter a valid email address.";
              return e;
            });
          })}
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
          {saveBtn("signoff", () => save("signoff", "sign_off", { override: f.sign_off_override.trim() }, () => ({})))}
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
