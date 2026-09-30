import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Download, RefreshCw, AlertTriangle, FileText } from "lucide-react";
import { formatMasonicYear } from "@/lib/officersProgression";
import { loadProvincialData, fileBase, ukLongDate, lodgeLine, type ProvincialData } from "@/lib/provincialReturn";
import { buildDocx, buildPdf } from "@/lib/provincialReturnDoc";
import { saveBlob } from "@/lib/nativeDownload";

const PROV_LABEL: Record<string, { text: string; cls: string }> = {
  confirmed: { text: "Confirmed", cls: "bg-emerald-700/40 text-primary-foreground" },
  planned: { text: "Saved on ladder", cls: "bg-sky-700/40 text-primary-foreground" },
  computed: { text: "Ladder, not saved", cls: "bg-amber-700/40 text-primary-foreground" },
  carried: { text: "Carried forward", cls: "bg-navy-light text-primary-foreground" },
  vacant: { text: "Blank", cls: "bg-destructive/40 text-primary-foreground" },
  none: { text: "Always blank", cls: "bg-navy-light text-primary-foreground/70" },
};

function defaultYear() {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

function Inner() {
  const { canManageSummons, isAdmin, isSecretary, isAssistantSecretary, isWorshipfulMaster } = useAuth();
  const allowed = canManageSummons || isWorshipfulMaster;
  const canAppend = isAdmin || isSecretary || isAssistantSecretary || isWorshipfulMaster;
  const [year, setYear] = useState(defaultYear());
  const [data, setData] = useState<ProvincialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"" | "docx" | "pdf">("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await loadProvincialData(year, { canAppend })); }
    catch (e: any) { toast.error(e?.message ?? "Could not load the return"); }
    finally { setLoading(false); }
  }, [year, canAppend]);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const download = async (kind: "docx" | "pdf") => {
    setBusy(kind);
    try {
      const fresh = await loadProvincialData(year, { canAppend });
      setData(fresh);
      const blob = kind === "docx"
        ? await buildDocx(fresh)
        : new Blob([await buildPdf(fresh)], { type: "application/pdf" });
      await saveBlob(blob, `${fileBase(year)}.${kind}`);
    } catch (e: any) { toast.error(e?.message ?? "Download failed"); }
    finally { setBusy(""); }
  };

  if (!allowed) return <MembersLayout><p className="text-primary-foreground/70">You don't have permission to view this page.</p></MembersLayout>;
  const years = Array.from({ length: 6 }, (_, i) => defaultYear() + 1 - i);

  return (
    <MembersLayout>
      <Link to="/members/admin/secretary" className="inline-flex min-h-[48px] items-center gap-1 text-sm text-gold/80 hover:text-gold"><ArrowLeft className="w-4 h-4" /> Secretary Portal</Link>
      <header className="mb-4 flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl md:text-3xl text-gold break-words">Provincial Installation Return</h1>
          <p className="text-primary-foreground/60 text-sm break-words">Provincial Grand Lodge of Surrey — built fresh from live records. Download, check, and email it to Province yourself.</p>
        </div>
        <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="min-h-[48px] w-full sm:w-40" aria-label="Masonic year"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{formatMasonicYear(y)}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" className="min-h-[48px]" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button className="min-h-[48px]" onClick={() => download("docx")} disabled={!!busy || !data}><FileText className="w-4 h-4 mr-1" /> {busy === "docx" ? "Preparing…" : "Download Word"}</Button>
          <Button variant="outline" className="min-h-[48px]" onClick={() => download("pdf")} disabled={!!busy || !data}><Download className="w-4 h-4 mr-1" /> {busy === "pdf" ? "Preparing…" : "Download PDF"}</Button>
        </div>
      </header>

      {!data ? <p className="text-primary-foreground/60">{loading ? "Loading…" : ""}</p> : (
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

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 text-sm text-primary-foreground/80 space-y-1 break-words">
            <p><span className="text-gold">Lodge:</span> {lodgeLine()}</p>
            <p><span className="text-gold">Installation:</span> {ukLongDate(data.installationDate)}</p>
            <p><span className="text-gold">Venue:</span> {data.venue}</p>
            <p><span className="text-gold">Meeting days:</span> {data.meetingPattern}</p>
          </section>

          <section>
            <h2 className="font-serif text-lg text-gold mb-2">Officers</h2>
            <ul className="divide-y divide-gold/10 rounded-sm border border-gold/20">
              {data.rows.map((r, i) => {
                const pl = PROV_LABEL[r.provenance];
                return (
                  <li key={i} className="flex min-w-0 flex-col gap-1 p-3 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-36 shrink-0 text-gold text-sm">{r.label}</span>
                    <span className="min-w-0 flex-1 break-words text-primary-foreground">{r.name || <em className="text-primary-foreground/50">blank</em>}{r.decorations && <span className="text-primary-foreground/60"> · {r.decorations}</span>}</span>
                    <Badge className={`self-start sm:self-auto ${pl.cls}`}>{pl.text}{r.provenance === "carried" && r.office?.fromYear ? ` from ${formatMasonicYear(r.office.fromYear)}` : ""}</Badge>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-primary-foreground/60">The grey text after a name is the member's post-nominals field, which prints in the decorations column. Edit it on the member's record if it should only show civil or military honours.</p>
          </section>

          <section>
            <h2 className="font-serif text-lg text-gold mb-2">Lodge Representatives</h2>
            <ul className="divide-y divide-gold/10 rounded-sm border border-gold/20">
              {data.reps.map((r) => (
                <li key={r.label} className="flex min-w-0 flex-col gap-1 p-3 sm:flex-row sm:gap-3">
                  <span className="w-36 shrink-0 text-gold text-sm">{r.label}</span>
                  <span className="min-w-0 break-words text-primary-foreground">{r.vacant ? <em className="text-primary-foreground/50">Vacant</em> : r.name}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg text-gold mb-2">Past Masters</h2>
            <ul className="divide-y divide-gold/10 rounded-sm border border-gold/20">
              {data.pastMasters.map((m) => (
                <li key={m.name + m.years[0]} className="flex min-w-0 flex-col gap-1 p-3 sm:flex-row sm:gap-3">
                  <span className="w-36 shrink-0 text-gold text-sm break-words">{m.years.join(", ")}</span>
                  <span className="min-w-0 break-words text-primary-foreground">{m.name}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg text-gold mb-2">Secretary's contact details</h2>
            <div className="rounded-sm border border-gold/20 p-3 text-sm text-primary-foreground space-y-1 break-words">
              <p><span className="text-gold">Name:</span> {data.secretary.name || "—"}</p>
              <p><span className="text-gold">Home address:</span> {data.secretary.address || "—"}</p>
              <p><span className="text-gold">Mobile:</span> {data.secretary.mobile || "—"}</p>
              <p><span className="text-gold">Personal email:</span> {data.secretary.personalEmail || "—"}</p>
              <p><span className="text-gold">Lodge email:</span> {data.secretary.lodgeEmail}</p>
              <p className="pt-1 text-xs text-primary-foreground/60">Taken from the Secretary's own member record, which only the Secretary, admins, the Master, Almoner and IPM can see.</p>
            </div>
          </section>
        </div>
      )}
    </MembersLayout>
  );
}

export default function ProvincialReturn() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
