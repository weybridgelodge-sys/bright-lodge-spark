import { EmailText } from "@/components/ui/email-text";
import { lodgeTitle } from "@/lib/lodgeIdentity";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { loadProvinceReturnEmail } from "@/lib/provinceReturnEmail";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Download, RefreshCw, Upload, AlertTriangle, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatMasonicYear } from "@/lib/officersProgression";
import {
  buildFieldSpecs, fillTemplate, returnFileStem, loadReturnData, blockName, lodgeEmailFor, ukDate,
  membershipEmailOptions, MEMBERSHIP_EMAIL_SETTING, secretaryChoiceError, secretaryChangedValue, secretaryChoiceSummary, TEMPLATE_BUCKET, TEMPLATE_PATH,
  type YesNo, type Provenance, type ResolvedOffice, type ReturnData, type FillReport,
} from "@/lib/installationReturn";
import { useOfficerSignaturesEnabled } from "@/hooks/useOfficerSignaturesEnabled";
import SignersPanel from "@/components/members/SignersPanel";
import { readFunctionError } from "@/lib/functionError";
import { ugleSignedDate } from "@/lib/ugleReturnSignatures";

type SignedResult = { path: string; url: string | null; signed: { secretary: boolean; worshipful_master: boolean } };
/** Signed path (officer_signatures on): store the filled form, then the server adds the stored signatures and dates. */
async function signFilledReturn(year: number, d: ReturnData, bytes: Uint8Array): Promise<SignedResult> {
  const unsigned = `installation-returns/${year}/${returnFileStem(d.identity.lodgeNumber, year)}-${Date.now()}-unsigned.pdf`;
  const up = await supabase.storage.from(TEMPLATE_BUCKET).upload(unsigned, new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), { contentType: "application/pdf" });
  if (up.error) throw up.error;
  const { data: res, error } = await supabase.functions.invoke("sign-installation-return", {
    body: { lodge_year: year, unsigned_path: unsigned, installation_date: d.installationDate, prescribed_date: d.prescribedDate, wm_member_id: d.wm.memberId, secretary_member_id: d.officers.find((o) => o.key === "secretary")?.memberId ?? null },
  });
  if (error || !res?.ok) {
    await supabase.storage.from(TEMPLATE_BUCKET).remove([unsigned]);
    throw new Error(await readFunctionError(error, res, "Could not add the signatures"));
  }
  return res as SignedResult;
}

const PROV: Record<Provenance, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed for this year", cls: "bg-emerald-600/80 text-primary-foreground" },
  planned: { label: "Ladder projection (saved, not confirmed)", cls: "bg-amber-500/80 text-navy" },
  computed: { label: "Worked out by the ladder, not saved", cls: "bg-amber-300/80 text-navy" },
  carried: { label: "Carried forward, not reconfirmed", cls: "bg-sky-500/70 text-primary-foreground" },
  vacant: { label: "Blank — nobody holds it", cls: "bg-destructive/80 text-destructive-foreground" },
};

function defaultYear() {
  const d = new Date();
  return d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
}

function Inner() {
  const { canManageSummons, isWorshipfulMaster, isAdmin, isSecretary, isCurrentSecretary } = useAuth();
  const canSubmit = isAdmin || isSecretary || isCurrentSecretary;
  const [secChanged, setSecChanged] = useState<YesNo>("");
  const [secError, setSecError] = useState<string | null>(null);
  const secFirstRef = useRef<HTMLButtonElement | null>(null);
  const [provinceEmail, setProvinceEmail] = useState("");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [pending, setPending] = useState<{ path: string; url: string; missing: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [year, setYear] = useState(defaultYear());
  const [data, setData] = useState<ReturnData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasTemplate, setHasTemplate] = useState<boolean | null>(null);
  const [report, setReport] = useState<FillReport | null>(null);
  const [busy, setBusy] = useState(false);
  const signaturesOn = useOfficerSignaturesEnabled() === true;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadReturnData(year));
      const { data: list } = await supabase.storage.from(TEMPLATE_BUCKET).list("templates");
      setHasTemplate(!!list?.some((f) => f.name === "New_IR_Craft.pdf"));
      setProvinceEmail(await loadProvinceReturnEmail("installation"));
      const { data: subs } = await supabase.from("installation_return_submissions").select("*").eq("lodge_year", year).order("sent_at", { ascending: false });
      setSubmissions(subs ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load");
    } finally {
      setLoading(false);
    }
  }, [year]);
  useEffect(() => { load(); }, [load]);
  // Must be chosen consciously for each year; Refresh keeps it.
  useEffect(() => { setSecChanged(""); setSecError(null); }, [year]);
  /** Returns true when the Y/N choice is missing (shows the error and moves focus to the field). */
  const secretaryChoiceMissing = () => {
    const err = secretaryChoiceError(secChanged);
    setSecError(err);
    if (err) {
      secFirstRef.current?.scrollIntoView({ block: "center" });
      secFirstRef.current?.focus();
    }
    return !!err;
  };

  const specs = useMemo(() => (data ? buildFieldSpecs(data, { secretaryChanged: secChanged }) : []), [data, secChanged]);

  if (!(canManageSummons || isWorshipfulMaster)) {
    return <MembersLayout><p className="text-primary-foreground/70">You don't have permission to view this page.</p></MembersLayout>;
  }

  const uploadTemplate = async (file: File) => {
    setBusy(true);
    const { error } = await supabase.storage.from(TEMPLATE_BUCKET).upload(TEMPLATE_PATH, file, { upsert: true, contentType: "application/pdf" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("UGLE template saved");
    load();
  };

  const setMembershipEmail = async (v: string) => {
    const { error } = await supabase.from("module_settings").upsert({ key: MEMBERSHIP_EMAIL_SETTING, value: v as any }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    load();
  };

  const exportPdf = async () => {
    if (secretaryChoiceMissing()) return;
    setBusy(true);
    try {
      // Re-read everything at the moment of export — no stale data.
      const fresh = await loadReturnData(year);
      setData(fresh);
      const { data: blob, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(TEMPLATE_PATH);
      if (error || !blob) throw new Error("UGLE template not found — upload New_IR_Craft.pdf first.");
      const { bytes, report } = await fillTemplate(await blob.arrayBuffer(), buildFieldSpecs(fresh, { secretaryChanged: secretaryChangedValue(secChanged) }));
      setReport(report);
      const pdfOut = signaturesOn
        ? await (async () => { const g = await signFilledReturn(year, fresh, bytes); if (!g.url) throw new Error("Download link could not be created"); return (await fetch(g.url)).blob(); })()
        : new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfOut);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${returnFileStem(fresh.identity.lodgeNumber, fresh.year)}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      if (report.long.length) toast.warning(`${report.long.length} value(s) too long for their box — see below.`);
      if (report.missing.length) toast.warning(`${report.missing.length} field(s) not found in the template — see below.`);
      else toast.success("Installation Return exported");
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setBusy(false);
    }
  };


  // Step 1: build the final PDF fresh, store it, then show the confirmation.
  const prepareSubmit = async () => {
    if (secretaryChoiceMissing()) return;
    if (!provinceEmail) return toast.error("Set the Provincial Office email address in Unit Setup > Province first.");
    setBusy(true);
    try {
      const fresh = await loadReturnData(year);
      setData(fresh);
      const { data: blob, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(TEMPLATE_PATH);
      if (error || !blob) throw new Error("UGLE template not found — upload New_IR_Craft.pdf first.");
      const { bytes, report } = await fillTemplate(await blob.arrayBuffer(), buildFieldSpecs(fresh, { secretaryChanged: secretaryChangedValue(secChanged) }));
      setReport(report);
      if (signaturesOn) {
        const g = await signFilledReturn(year, fresh, bytes);
        if (!g.url) throw new Error("Preview link could not be created");
        setPending({ path: g.path, url: g.url, missing: report.missing.length });
        return;
      }
      const path = `installation-returns/${year}/${returnFileStem(fresh.identity.lodgeNumber, year)}-${Date.now()}.pdf`;
      const pdfBlob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const { error: upErr } = await supabase.storage.from(TEMPLATE_BUCKET).upload(path, pdfBlob, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      setPending({ path, url: URL.createObjectURL(pdfBlob), missing: report.missing.length });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not prepare the return");
    } finally {
      setBusy(false);
    }
  };

  const cancelSubmit = async () => {
    if (pending) {
      if (pending.url.startsWith("blob:")) URL.revokeObjectURL(pending.url);
      await supabase.storage.from(TEMPLATE_BUCKET).remove([pending.path]);
    }
    setPending(null);
  };

  const confirmSubmit = async () => {
    if (!pending || !data) return;
    setSending(true);
    const { data: res, error } = await supabase.functions.invoke("submit-installation-return", {
      body: { lodge_year: year, storage_path: pending.path, recipient_email: provinceEmail, secretary_changed: secretaryChangedValue(secChanged), installation_date: data.installationDate ? ukDate(data.installationDate) : "" },
    });
    setSending(false);
    if (error || (res as any)?.error) {
      let msg = (res as any)?.error;
      try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      return toast.error(msg ?? "Sending failed");
    }
    if (pending.url.startsWith("blob:")) URL.revokeObjectURL(pending.url);
    setPending(null);
    toast.success(`Installation Return sent to ${provinceEmail}`);
    load();
  };

  const years = Array.from({ length: 6 }, (_, i) => defaultYear() - 3 + i);
  const P = (o: ResolvedOffice) => (o.memberId ? data?.profiles[o.memberId] : null);

  const Row = ({ o, email }: { o: ResolvedOffice; email?: boolean }) => {
    const p = P(o);
    return (
      <tr className="border-t border-gold/10 align-top">
        <td className="py-2 pr-3 text-gold">{o.label}</td>
        <td className="py-2 pr-3">{p ? blockName(p) : <span className="text-primary-foreground/80">—</span>}</td>
        {email && <td className="py-2 pr-3 text-xs">{p?.email ?? "—"}</td>}
        {email && (
          <td className="py-2 pr-3 text-xs">
            {o.key === "treasurer" ? <span className="text-amber-300">No lodge email field on UGLE's form</span> : lodgeEmailFor(o.key, data!.membershipLodgeEmail, data!.identity.emailDomain)}
          </td>
        )}
        <td className="py-2">
          <Badge className={PROV[o.provenance].cls}>{PROV[o.provenance].label}{o.provenance === "carried" && o.fromYear ? ` (from ${formatMasonicYear(o.fromYear)})` : ""}</Badge>
          {o.note && <p className="text-xs text-primary-foreground/80 mt-1">{o.note}</p>}
        </td>
      </tr>
    );
  };

  const q = data?.qualification;

  return (
    <MembersLayout>
      <Link to="/members/admin/secretary" className="inline-flex items-center gap-1 text-sm text-gold hover:text-gold mb-3"><ArrowLeft className="w-4 h-4" /> Secretary Portal</Link>
      <header className="mb-4 flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl md:text-3xl text-gold">UGLE Installation Return</h1>
          <p className="text-primary-foreground/80 text-sm">Read live from the lodge records every time you open or export it.</p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger aria-label="Installation year" className="w-full sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{formatMasonicYear(y)}</SelectItem>)}</SelectContent>
          </Select>
          <Button className="w-full sm:w-auto" variant="outline" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
          <Button className="w-full sm:w-auto" onClick={exportPdf} disabled={busy || !data || !hasTemplate}><Download className="w-4 h-4 mr-1" />Export PDF</Button>
          {canSubmit && <Button className="w-full sm:w-auto" variant="secondary" onClick={prepareSubmit} disabled={busy || !data || !hasTemplate || !provinceEmail}><Send className="w-4 h-4 mr-1" />Submit to Province</Button>}
          {secChanged && <p className="text-xs text-primary-foreground/80 sm:basis-full sm:text-right">Secretary change: {secretaryChoiceSummary(secChanged)}</p>}
        </div>
      </header>

      {hasTemplate === false && (
        <div className="min-w-0 break-words rounded-sm border border-amber-400/50 bg-amber-400/10 p-4 mb-4 text-sm">
          <p className="mb-2">The official UGLE form (New_IR_Craft.pdf) hasn't been uploaded yet. Export needs it — it is filled fresh each time.</p>
          <label className="inline-flex items-center gap-2 cursor-pointer text-gold"><Upload className="w-4 h-4" /> Upload New_IR_Craft.pdf
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadTemplate(e.target.files[0])} />
          </label>
        </div>
      )}

      {data && (
        <div className="min-w-0 space-y-5 text-primary-foreground text-sm">
          {data.issues.length > 0 && (
            <div className="min-w-0 break-words rounded-sm border border-amber-400/40 bg-amber-400/10 p-4">
              <p className="font-semibold text-amber-300 flex items-start gap-1 mb-1"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Check before sending</p>
              <ul className="min-w-0 list-disc ml-5 space-y-0.5">{data.issues.map((i) => <li className="break-words" key={i}>{i}</li>)}</ul>
            </div>
          )}

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4">
            <h2 className="font-serif text-gold text-lg mb-2">Lodge &amp; dates</h2>
            <p>{lodgeTitle(data.identity) || "Lodge name and number not set"}</p>
            <p>Installation date prescribed by by-laws{data.ruleWording ? ` (${data.ruleWording})` : ""}: <strong>{ukDate(data.prescribedDate)}</strong></p>
            <p>Actual installation meeting: <strong>{data.installationDate ? ukDate(data.installationDate) : "not found"}</strong>
              {data.installationEventTitle && <span className="text-primary-foreground/80"> — {data.installationEventTitle}</span>}</p>
            <p className="text-primary-foreground/80">{data.installationDate && data.installationDate !== data.prescribedDate ? "Different from the by-laws, so the 'if different' date is filled." : "Same as the by-laws, so the 'if different' date is left blank."}</p>
          </section>

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4">
            <h2 className="font-serif text-gold text-lg mb-2">Master's qualification</h2>
            {q?.branch === 1 && <p>Served as Master of Lodge No. {q.lodgeNo} in the year <strong>{q.year}</strong>{q.allYears.length > 1 ? ` (earliest of ${q.allYears.join(", ")})` : ""}.</p>}
            {q?.branch === 2 && <p>Served as {q.office === "senior_warden" ? "Senior" : "Junior"} Warden for a full year in Lodge No. {q.lodgeNo} in the year <strong>{q.year}</strong>.</p>}
            {q?.branch === 0 && <p className="text-amber-300">{q.reason}</p>}
            <p className="text-xs text-primary-foreground/80 mt-1">The dispensation box is never filled automatically.</p>
          </section>

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 overflow-x-auto">
            <h2 className="font-serif text-gold text-lg mb-2">Master, Wardens and IPM</h2>
            <table className="w-full"><tbody>{data && [data.wm, data.sw, data.jw, data.ipm].map((o) => <Row key={o.key} o={o} />)}</tbody></table>
          </section>

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 overflow-x-auto">
            <h2 className="font-serif text-gold text-lg mb-2">Officers and email addresses</h2>
            <table className="w-full">
              <thead><tr className="text-left text-xs text-primary-foreground/80"><th>Office</th><th>Name</th><th>Personal</th><th>Lodge</th><th>Status</th></tr></thead>
              <tbody>{data.officers.map((o) => <Row key={o.key} o={o} email />)}</tbody>
            </table>
            <div className="mt-3 flex min-w-0 flex-col items-stretch gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-center">
              <span>Membership Officer lodge email:</span>
              <Select value={data.membershipLodgeEmail} onValueChange={setMembershipEmail} disabled={!(isAdmin || isSecretary)}>
                <SelectTrigger aria-label="Membership Officer lodge email" className="h-8 w-full min-w-0 sm:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>{membershipEmailOptions(data.identity.emailDomain).map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-xs text-primary-foreground/80 mt-2">UGLE's own form has no lodge email box for the Treasurer, so only the personal address can be given.</p>
          </section>

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4">
            <h2 id="sec-changed-label" className="font-serif text-gold text-lg mb-2">Has the Secretary or his details changed? (required)</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" role="radiogroup" aria-labelledby="sec-changed-label" aria-required="true"
              aria-invalid={secError ? true : undefined} aria-describedby={secError ? "sec-changed-error" : undefined}>
              {(["Y", "N"] as const).map((v, i) => (
                <Button key={v} ref={i === 0 ? secFirstRef : undefined} type="button" role="radio" aria-checked={secChanged === v}
                  aria-invalid={secError ? true : undefined} aria-describedby={secError ? "sec-changed-error" : undefined}
                  className="min-h-12 h-auto w-full whitespace-normal text-left sm:w-auto" variant={secChanged === v ? "default" : "outline"}
                  onClick={() => { setSecChanged(v); setSecError(null); }}>
                  {v === "Y" ? "Yes, the Secretary or his details have changed" : "No change"}
                </Button>
              ))}
            </div>
            {secError && <p id="sec-changed-error" role="alert" className="mt-2 text-sm font-semibold text-destructive-foreground bg-destructive/80 rounded-sm px-2 py-1">{secError}</p>}
            <p className="text-xs text-primary-foreground/80 mt-2">Your choice fills the Y/N box on the form. It isn't saved: choose it each time you open this page or change the year. Export and Submit need it.</p>
          </section>

          {signaturesOn && (
            <SignersPanel year={formatMasonicYear(year)} signers={[
              { office: "Worshipful Master", memberId: data.wm.memberId, name: blockName(P(data.wm)) },
              (() => { const s = data.officers.find((o) => o.key === "secretary"); return { office: "Secretary", memberId: s?.memberId ?? null, name: s ? blockName(P(s)) : "" }; })(),
            ]} />
          )}

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4">
            <h2 className="font-serif text-gold text-lg mb-2">Submit to Province</h2>
            <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-xs">Provincial Office email:</span>
              {provinceEmail ? <EmailText email={provinceEmail} /> : <span>Not set yet</span>}
              <span className="text-xs">(change in Unit Setup &gt; Province)</span>
            </div>
            {!canSubmit && <p className="text-xs text-amber-300 mt-2">Only the Secretary or an administrator can submit the return.</p>}
            <p className="text-xs text-primary-foreground/80 mt-2">The email carries a secure 30-day download link to the PDF (our email service can't send attachments). {signaturesOn ? "Stored signatures are added where on file; a missing one leaves its box blank." : "Signature boxes stay blank."}</p>
            <h3 className="text-gold text-sm mt-3 mb-1">Sent for {formatMasonicYear(year)}</h3>
            {submissions.length === 0 ? <p className="text-xs text-primary-foreground/80">Not sent yet.</p> : (
              <ul className="text-xs space-y-1">{submissions.map((s) => (
                <li className="break-words" key={s.id}>{new Date(s.sent_at).toLocaleString("en-GB")} — by {s.sent_by_name ?? "unknown"} to {s.recipient_email}{s.secretary_changed ? ` (Secretary changed: ${s.secretary_changed})` : ""}</li>
              ))}</ul>
            )}
          </section>

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 overflow-x-auto">
            <h2 className="font-serif text-gold text-lg mb-2">Every field that will be filled</h2>
            <table className="w-full text-xs">
              <tbody>{specs.map((s) => (
                <tr key={s.id} className="border-t border-gold/10"><td className="py-1 pr-3 text-primary-foreground/80">{s.label}</td><td className="py-1">{s.value || <span className="text-primary-foreground/80">(blank)</span>}</td></tr>
              ))}</tbody>
            </table>
            <p className="text-xs text-primary-foreground/80 mt-2">{signaturesOn
              ? `Stored signatures of the Master and Secretary are added on the server; each signed box gets the date ${ugleSignedDate(data.installationDate, data.prescribedDate).text || "—"}. A box with no signature on file stays blank.`
              : "Signatures of the Master and Secretary are always left blank for a real signature. Date signed is prefilled with the installation date and can be changed in the PDF."}</p>
          </section>

          {report && (report.missing.length > 0 || report.long.length > 0 || report.filled.some((f) => f.fuzzy)) && (
            <section className="rounded-sm border border-amber-400/40 bg-amber-400/10 p-4 text-xs">
              <h2 className="font-semibold text-amber-300 mb-1">Template check from last export</h2>
              {report.missing.length > 0 && <p>Not found in the template: {report.missing.join("; ")}</p>}
              {report.long.length > 0 && <p className="break-words">Too long to fit even at the smallest size (check the PDF): {report.long.join("; ")}</p>}
              {report.filled.filter((f) => f.fuzzy).map((f) => <p key={f.id}>Filled "{f.field}" for {f.id}</p>)}
            </section>
          )}
        </div>
      )}

      <AlertDialog open={!!pending} onOpenChange={(o) => { if (!o && !sending) cancelSubmit(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send the Installation Return to Province?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p><strong>To:</strong> <EmailText email={provinceEmail} /></p>
                <p><strong>Reply-to:</strong> <EmailText email={data?.identity.secretaryEmail} /></p>
                <p><strong>Subject:</strong> {data ? lodgeTitle(data.identity) : ""} — Installation Return {formatMasonicYear(year)}</p>
                <p><strong>Document:</strong> {returnFileStem(data?.identity.lodgeNumber, year)}.pdf, filled just now from the live records (sent as a 30-day download link). <a href={pending?.url} target="_blank" rel="noopener noreferrer" className="underline">Open the exact PDF</a></p>
                <p><strong>Secretary changed (Y/N):</strong> {secChanged}</p>
                <p>{signaturesOn ? "Stored signatures are on the PDF where on file (open it to check)." : "Signatures are left blank."}</p>
                {data && data.issues.length > 0 && <p className="text-destructive-foreground">{data.issues.length} warning(s) are still showing on the page.</p>}
                {pending && pending.missing > 0 && <p className="text-destructive-foreground">{pending.missing} field(s) weren't found in the template.</p>}
                <p>This is an official document to an external body and can't be recalled once sent.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmSubmit(); }} disabled={sending}>{sending ? "Sending…" : "Send to Province"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MembersLayout>
  );
}

export default function InstallationReturn() {
  return <Inner />;
}
