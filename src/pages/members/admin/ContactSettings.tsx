import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fieldCls, fieldLabelCls, fieldHintCls } from "@/lib/fieldStyle";
import { validateContactSettings, type ContactSettingsForm } from "@/lib/contactSettings";
import { useInitialLoading } from "@/hooks/useInitialLoading";

const EMPTY: ContactSettingsForm = { secretary_email: "", membership_cc_email: "", guide_url: "" };

function Inner() {
  const [form, setForm] = useState<ContactSettingsForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactSettingsForm, string>>>({});
  const [status, setStatus] = useState<string>("");
  const [denied, setDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setLoading] = useInitialLoading();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_lodge_contact_settings");
      if (error) setDenied(true);
      else {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) setForm({ secretary_email: row.secretary_email ?? "", membership_cc_email: row.membership_cc_email ?? "", guide_url: row.guide_url ?? "" });
      }
      setLoading(false);
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateContactSettings(form);
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Please correct the highlighted fields."); return; }
    setSaving(true); setStatus("");
    const { error } = await supabase.rpc("update_lodge_contact_settings", {
      _secretary_email: form.secretary_email.trim(),
      _membership_cc_email: form.membership_cc_email.trim(),
      _guide_url: form.guide_url.trim(),
    });
    setSaving(false);
    setStatus(error ? `Not saved: ${error.message}` : "Saved. New enquiries will use these details.");
  };

  const field = (key: keyof ContactSettingsForm, label: string, hint: string, type: string, placeholder: string) => (
    <div>
      <label htmlFor={`cs-${key}`} className={fieldLabelCls}>{label}</label>
      <input
        id={`cs-${key}`} type={type} value={form[key]} placeholder={placeholder} autoComplete="off"
        aria-invalid={!!errors[key]} aria-describedby={`cs-${key}-hint${errors[key] ? ` cs-${key}-err` : ""}`}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={`${fieldCls} mt-1`}
      />
      <span id={`cs-${key}-hint`} className={fieldHintCls}>{hint}</span>
      {errors[key] && <span id={`cs-${key}-err`} className="mt-1 block text-sm text-gold-light">{errors[key]}</span>}
    </div>
  );

  return (
    <MembersLayout>
      <header className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-gold">Enquiry contact settings</h1>
        <p className="font-sans text-sm text-cream">Who receives new membership enquiries from the website, and the guide link sent to enquirers.</p>
      </header>
      {initialLoading ? (
        <p className="text-cream">Loading…</p>
      ) : denied ? (
        <p className="text-cream">Only the Secretary or an administrator can view these settings.</p>
      ) : (
        <form onSubmit={save} noValidate className="max-w-xl space-y-5 rounded-sm border border-gold/30 bg-navy-light/30 p-4 sm:p-6">
          {field("secretary_email", "Secretary email", "Receives each new enquiry.", "email", "e.g. secretary@example.org")}
          {field("membership_cc_email", "Membership copy email", "Receives a copy of each new enquiry.", "email", "e.g. membership@example.org")}
          {field("guide_url", "Prospective members guide link", "Must start with https://", "url", "e.g. https://example.org/guide.pdf")}
          <Button type="submit" disabled={saving} className="min-h-[44px] w-full sm:w-auto bg-gold text-navy hover:bg-gold">{saving ? "Saving…" : "Save settings"}</Button>
          <p role="status" aria-live="polite" className="text-sm text-cream">{status}</p>
        </form>
      )}
    </MembersLayout>
  );
}

export default function ContactSettings() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
