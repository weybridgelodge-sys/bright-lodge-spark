import { EmailText } from "@/components/ui/email-text";
import SendWarningsNote from "@/components/members/SendWarningsNote";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { loadProvinceReturnEmail } from "@/lib/provinceReturnEmail";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, RefreshCw, AlertTriangle, FileText, Send } from "lucide-react";
import { formatMasonicYear } from "@/lib/officersProgression";
import { loadProvincialData, fileBase, ukLongDate, lodgeLine, type ProvincialData } from "@/lib/provincialReturn";
import { buildDocx, buildPdf, signatureDate } from "@/lib/provincialReturnDoc";
import { lodgeTitle } from "@/lib/lodgeIdentity";
import { saveBlob } from "@/lib/nativeDownload";
import { useOfficerSignaturesEnabled } from "@/hooks/useOfficerSignaturesEnabled";
import SignersPanel from "@/components/members/SignersPanel";
import { readFunctionError } from "@/lib/functionError";
import { signaturesSummary, SIGNATURES_ON_HELP, type SignedPlacement } from "@/lib/signatureSummary";

type Generated = { docx_path: string; pdf_path: string; docx_url: string | null; pdf_url: string | null; signed?: SignedPlacement };
/** Signed path (officer_signatures on): the server builds and stores both files with signatures embedded. */
async function generateSigned(year: number, data: ProvincialData): Promise<Generated> {
  const { data: res, error } = await supabase.functions.invoke("generate-provincial-return", {
    body: { lodge_year: year, data, file_stem: fileBase(year, data.lodgeNumber) },
  });
  if (error || !res?.ok) throw new Error(await readFunctionError(error, res, "Could not generate the signed return"));
  return res as Generated;
}

const PROV_LABEL: Record<string, { text: string; cls: string }> = {
  confirmed: { text: "Confirmed", cls: "bg-emerald-700/40 text-primary-foreground" },
  planned: { text: "Saved on ladder", cls: "bg-sky-700/40 text-primary-foreground" },
  computed: { text: "Ladder, not saved", cls: "bg-amber-700/40 text-primary-foreground" },
  carried: { text: "Carried forward", cls: "bg-navy-light text-primary-foreground" },
  vacant: { text: "Blank", cls: "bg-destructive/40 text-primary-foreground" },
  none: { text: "Always blank", cls: "bg-navy-light text-primary-foreground/70" },
};

const FIRST_YEAR = 2025; // no member records before 2025/26
const BUCKET = "secretary-returns";

function defaultYear() {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

function Inner() {
  const { canManageSummons, isAdmin, isSecretary, isAssistantSecretary, isWorshipfulMaster, isCurrentSecretary } = useAuth();
  const canSubmit = isAdmin || isSecretary || isCurrentSecretary;
  const [pgsEmail, setPgsEmail] = useState("");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [pending, setPending] = useState<{ pdfPath: string; docxPath: string; pdfUrl: string; docxUrl: string; signed?: SignedPlacement | null } | null>(null);
  const [sending, setSending] = useState(false);
  const allowed = canManageSummons || isWorshipfulMaster;
  const canAppend = isAdmin || isSecretary || isAssistantSecretary || isWorshipfulMaster;
  const [year, setYear] = useState(Math.max(FIRST_YEAR, defaultYear()));
  const [data, setData] = useState<ProvincialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"" | "docx" | "pdf">("");
  const signaturesOn = useOfficerSignaturesEnabled() === true;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadProvincialData(year, { canAppend }));
      setPgsEmail(await loadProvinceReturnEmail("provincial"));
      if (canSubmit) {
        const { data: subs } = await supabase.from("provincial_return_submissions").select("*").eq("lodge_year", year).order("sent_at", { ascending: false });
        setSubmissions(subs ?? []);
      }
    }
    catch (e: any) { toast.error(e?.message ?? "Could not load the return"); }
    finally { setLoading(false); }
  }, [year, canAppend, canSubmit]);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const download = async (kind: "docx" | "pdf") => {
    setBusy(kind);
    try {
      const fresh = await loadProvincialData(year, { canAppend });
      setData(fresh);
      if (signaturesOn) {
        const g = await generateSigned(year, fresh);
        const url = kind === "docx" ? g.docx_url : g.pdf_url;
        if (!url) throw new Error("Download link could not be created");
        const blob = await (await fetch(url)).blob();
        await saveBlob(blob, `${fileBase(year, fresh.lodgeNumber)}.${kind}`);
        return;
      }
      const blob = kind === "docx"
        ? await buildDocx(fresh)
        : new Blob([(await buildPdf(fresh)) as BlobPart], { type: "application/pdf" });
      await saveBlob(blob, `${fileBase(year, fresh.lodgeNumber)}.${kind}`);
    } catch (e: any) { toast.error(e?.message ?? "Download failed"); }
    finally { setBusy(""); }
  };


  // Build both files fresh from live records, store them, then show the confirmation.
  const prepareSubmit = async () => {
    if (!pgsEmail) return toast.error("Set the Provincial Grand Secretary's email address in Unit Setup > Province first.");
    setBusy("pdf");
    try {
      const fresh = await loadProvincialData(year, { canAppend });
      setData(fresh);
      if (signaturesOn) {
        const g = await generateSigned(year, fresh);
        if (!g.pdf_url || !g.docx_url) throw new Error("Preview links could not be created");
        setPending({ docxPath: g.docx_path, pdfPath: g.pdf_path, docxUrl: g.docx_url, pdfUrl: g.pdf_url, signed: g.signed ?? null });
        return;
      }
      const docx = await buildDocx(fresh);
      const pdf = new Blob([(await buildPdf(fresh)) as BlobPart], { type: "application/pdf" });
      const stamp = Date.now();
      const docxPath = `provincial-returns/${year}/${fileBase(year, fresh.lodgeNumber)}-${stamp}.docx`;
      const pdfPath = `provincial-returns/${year}/${fileBase(year, fresh.lodgeNumber)}-${stamp}.pdf`;
      const up1 = await supabase.storage.from(BUCKET).upload(docxPath, docx, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage.from(BUCKET).upload(pdfPath, pdf, { contentType: "application/pdf" });
      if (up2.error) { await supabase.storage.from(BUCKET).remove([docxPath]); throw up2.error; }
      setPending({ docxPath, pdfPath, docxUrl: URL.createObjectURL(docx), pdfUrl: URL.createObjectURL(pdf) });
    } catch (e: any) { toast.error(e?.message ?? "Could not prepare the return"); }
    finally { setBusy(""); }
  };

  const cancelSubmit = async () => {
    if (pending) {
      URL.revokeObjectURL(pending.pdfUrl); URL.revokeObjectURL(pending.docxUrl);
      await supabase.storage.from(BUCKET).remove([pending.pdfPath, pending.docxPath]);
    }
    setPending(null);
  };

  const confirmSubmit = async () => {
    if (!pending || !data) return;
    setSending(true);
    const { data: res, error } = await supabase.functions.invoke("submit-provincial-return", {
      body: { lodge_year: year, pdf_path: pending.pdfPath, docx_path: pending.docxPath, recipient_email: pgsEmail, installation_date: signatureDate(data) },
    });
    setSending(false);
    if (error || (res as any)?.error) {
      let msg = (res as any)?.error;
      try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      return toast.error(msg ?? "Sending failed");
    }
    URL.revokeObjectURL(pending.pdfUrl); URL.revokeObjectURL(pending.docxUrl);
    setPending(null);
    toast.success(`Provincial Return sent to ${pgsEmail}`);
    load();
  };

  if (!allowed) return <MembersLayout><p className="text-primary-foreground/70">You don't have permission to view this page.</p></MembersLayout>;
  const years = Array.from({ length: Math.max(1, defaultYear() + 2 - FIRST_YEAR) }, (_, i) => defaultYear() + 1 - i).filter((y) => y >= FIRST_YEAR);

  return (
    <MembersLayout>
      <Link to="/members/admin/secretary" className="inline-flex min-h-[48px] items-center gap-1 text-sm text-gold hover:text-gold"><ArrowLeft className="w-4 h-4" /> Secretary Portal</Link>
      <header className="mb-4 flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl md:text-3xl text-gold break-words">Provincial Installation Return</h1>
          <p className="text-primary-foreground/80 text-sm break-words">Provincial Grand Lodge of Surrey — built fresh from live records. Download it to check and send yourself, or send it straight to the Provincial Grand Secretary from here.</p>
        </div>
        <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="min-h-[48px] w-full sm:w-40" aria-label="Masonic year"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{formatMasonicYear(y)}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" className="min-h-[48px]" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button className="min-h-[48px]" onClick={() => download("docx")} disabled={!!busy || !data}><FileText className="w-4 h-4 mr-1" /> {busy === "docx" ? "Preparing…" : "Download Word"}</Button>
          <Button variant="outline" className="min-h-[48px]" onClick={() => download("pdf")} disabled={!!busy || !data}><Download className="w-4 h-4 mr-1" /> {busy === "pdf" ? "Preparing…" : "Download PDF"}</Button>
          {canSubmit && <Button variant="secondary" className="min-h-[48px]" onClick={prepareSubmit} disabled={!!busy || !data || !pgsEmail}><Send className="w-4 h-4 mr-1" /> Submit to Province</Button>}
        </div>
      </header>

      {!data ? <p className="text-primary-foreground/80">{loading ? "Loading…" : ""}</p> : (
        <div className="space-y-6 min-w-0">
          {data.issues.length > 0 && (
            <div className="rounded-sm border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-primary-foreground/90 min-w-0">
              <p className="mb-2 flex items-center gap-2 font-medium"><AlertTriangle className="w-4 h-4 shrink-0" /> Check before sending</p>
              <ul className="list-disc pl-5 space-y-1 break-words">{data.issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          )}
          {data.appended.length > 0 && (
            <p className="rounded-sm border border-gold/30 bg-navy-light/30 p-3 text-sm text-primary-foreground/80 break-words">Added to the Past Masters roll from the appointment records: {data.appended.join("; ")}.</p>
          )}

          {signaturesOn && (
            <SignersPanel year={formatMasonicYear(year)} signers={(["secretary", "worshipful_master"] as const).map((k) => {
              const r = data.rows.find((x) => x.key === k);
              return { office: k === "secretary" ? "Secretary" : "Worshipful Master", memberId: r?.office?.memberId ?? null, name: r ? [r.firstNames, r.surname].filter(Boolean).join(" ") : "" };
            })} />
          )}

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 text-sm text-primary-foreground/80 space-y-1 break-words">
            <p><span className="text-gold">Consecrated:</span> {ukLongDate(data.consecrated)}</p>
            <p><span className="text-gold">Lodge:</span> {lodgeLine(data) || "Lodge name and number not set"}</p>
            <p><span className="text-gold">Venue:</span> {data.venue}</p>
            <p><span className="text-gold">Meeting days:</span> {data.meetingPattern}</p>
            <p><span className="text-gold">Scheduled Installation:</span> {ukLongDate(data.scheduledDate)}</p>
            <p><span className="text-gold">Actual, if different:</span> {data.actualDate ? ukLongDate(data.actualDate) : "— (same day)"}</p>
          </section>

          {([["Officers", data.rows], ["Tyler, Representatives and LMO", data.lowerRows]] as const).map(([title, list]) => (
            <section key={title}>
              <h2 className="font-serif text-lg text-gold mb-2">{title}</h2>
              <ul className="divide-y divide-gold/10 rounded-sm border border-gold/20">
                {list.map((r, i) => {
                  const pl = r.provenance === "rep"
                    ? { text: r.vacantRep ? "Vacant" : "From lodge details", cls: "bg-navy-light text-primary-foreground" }
                    : PROV_LABEL[r.provenance];
                  const name = [r.firstNames, r.surname].filter(Boolean).join(" ");
                  return (
                    <li key={i} className="flex min-w-0 flex-col gap-1 p-3 sm:flex-row sm:items-center sm:gap-3">
                      <span className="w-32 shrink-0 text-gold text-sm">{r.label}</span>
                      <span className="min-w-0 flex-1 break-words text-primary-foreground">{name || <em className="text-primary-foreground/80">blank</em>}{r.decorations && <span className="text-primary-foreground/80"> · {r.decorations}</span>}</span>
                      <Badge className={`self-start sm:self-auto ${pl.cls}`}>{pl.text}{r.provenance === "carried" && r.office?.fromYear ? ` from ${formatMasonicYear(r.office.fromYear)}` : ""}</Badge>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="text-xs text-primary-foreground/80">Grey text after a name is the member's post-nominals, printed in the "Civil & Military Decorations" column. Edit it on the member's record if it holds masonic ranks.</p>

          <section>
            <h2 className="font-serif text-lg text-gold mb-2">Subscribing Past Masters of the Lodge</h2>
            <ul className="divide-y divide-gold/10 rounded-sm border border-gold/20">
              {data.pastMasters.map((m) => (
                <li key={m.name + m.years[0]} className="flex min-w-0 flex-col gap-1 p-3 sm:flex-row sm:gap-3">
                  <span className="w-32 shrink-0 text-gold text-sm break-words">{m.years.join(", ")}</span>
                  <span className="min-w-0 break-words text-primary-foreground">{m.name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-primary-foreground/80">A Master is added only once he is confirmed as IPM, with all his years as Master. "Subscribing Past Masters in the Lodge" prints empty.</p>
          </section>

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 text-sm text-primary-foreground/80 min-w-0">
            <h2 className="font-serif text-lg text-gold mb-2">Submit to Province</h2>
            <p className="mb-2 break-words"><span className="text-gold">Signature dates:</span> both pre-filled with {data ? signatureDate(data) : "—"} (the Installation date). {signaturesOn ? SIGNATURES_ON_HELP : "Signatures stay blank."}</p>
            <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-xs">Provincial Grand Secretary's email:</span>
              {pgsEmail ? <EmailText email={pgsEmail} /> : <span>Not set yet</span>}
              <span className="text-xs">(change in Unit Setup &gt; Province)</span>
            </div>
            {!canSubmit && <p className="text-xs text-amber-300 mt-2">Only the Secretary or an administrator can submit the return.</p>}
            <p className="text-xs text-primary-foreground/80 mt-2">The email carries secure 30-day download links to the Word and PDF files (our email service can't send attachments). The download buttons above still work as before.</p>
            {canSubmit && (<>
              <h3 className="text-gold text-sm mt-3 mb-1">Sent for {formatMasonicYear(year)}</h3>
              {submissions.length === 0 ? <p className="text-xs text-primary-foreground/80">Not sent yet.</p> : (
                <ul className="text-xs space-y-1">{submissions.map((s) => (
                  <li className="break-words" key={s.id}>{new Date(s.sent_at).toLocaleString("en-GB")} — by {s.sent_by_name ?? "unknown"} to {s.recipient_email}</li>
                ))}</ul>
              )}
            </>)}
          </section>

          <section>
            <h2 className="font-serif text-lg text-gold mb-2">Secretary's contact details</h2>
            <div className="rounded-sm border border-gold/20 p-3 text-sm text-primary-foreground space-y-1 break-words">
              <p><span className="text-gold">Name:</span> {data.secretary.name || "—"}</p>
              <p><span className="text-gold">Home address:</span> {data.secretary.address || "—"}</p>
              <p><span className="text-gold">Mobile:</span> {data.secretary.mobile || "—"}</p>
              <p><span className="text-gold">Personal email:</span> {data.secretary.personalEmail || "—"}</p>
              <p><span className="text-gold">Lodge email:</span> {data.secretary.lodgeEmail}</p>
              <p className="pt-1 text-xs text-primary-foreground/80">Taken from the Secretary's own member record, which only the Secretary, admins, the Master, Almoner and IPM can see.</p>
            </div>
          </section>
        </div>
      )}
      <AlertDialog open={!!pending} onOpenChange={(o) => { if (!o && !sending) cancelSubmit(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send the Provincial Return to Province?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm break-words">
                <p><strong>To:</strong> <EmailText email={pgsEmail} /> (Provincial Grand Secretary)</p>
                <p><strong>Reply-to:</strong> <EmailText email={data?.secretary.lodgeEmail} /></p>
                <p><strong>Subject:</strong> {data ? lodgeTitle(data) : ""} — Provincial Installation Return {formatMasonicYear(year)}</p>
                <p><strong>Documents:</strong> Word and PDF, built just now from the live records, sent as 30-day download links. <a href={pending?.docxUrl} download={`${fileBase(year, data?.lodgeNumber ?? "")}.docx`} className="underline">Open the Word file</a> · <a href={pending?.pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">Open the PDF</a></p>
                <p><strong>Signature dates:</strong> {data ? signatureDate(data) : "—"}. {signaturesSummary(signaturesOn && !!pending?.signed, pending?.signed)}</p>
                <SendWarningsNote count={data?.issues.length ?? 0} />
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

export default function ProvincialReturn() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
