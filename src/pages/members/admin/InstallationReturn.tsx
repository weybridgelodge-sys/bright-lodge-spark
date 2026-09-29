import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Download, RefreshCw, Upload, AlertTriangle } from "lucide-react";
import { formatMasonicYear } from "@/lib/officersProgression";
import {
  buildFieldSpecs, fillTemplate, loadReturnData, blockName, lodgeEmailFor, ukDate,
  MEMBERSHIP_EMAIL_OPTIONS, MEMBERSHIP_EMAIL_SETTING, TEMPLATE_BUCKET, TEMPLATE_PATH,
  type Provenance, type ResolvedOffice, type ReturnData, type FillReport,
} from "@/lib/installationReturn";

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
  const { canManageSummons, isWorshipfulMaster, isAdmin, isSecretary } = useAuth();
  const [year, setYear] = useState(defaultYear());
  const [data, setData] = useState<ReturnData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasTemplate, setHasTemplate] = useState<boolean | null>(null);
  const [report, setReport] = useState<FillReport | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadReturnData(year));
      const { data: list } = await supabase.storage.from(TEMPLATE_BUCKET).list("templates");
      setHasTemplate(!!list?.some((f) => f.name === "New_IR_Craft.pdf"));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load");
    } finally {
      setLoading(false);
    }
  }, [year]);
  useEffect(() => { load(); }, [load]);

  const specs = useMemo(() => (data ? buildFieldSpecs(data) : []), [data]);

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
    setBusy(true);
    try {
      // Re-read everything at the moment of export — no stale data.
      const fresh = await loadReturnData(year);
      setData(fresh);
      const { data: blob, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(TEMPLATE_PATH);
      if (error || !blob) throw new Error("UGLE template not found — upload New_IR_Craft.pdf first.");
      const { bytes, report } = await fillTemplate(await blob.arrayBuffer(), buildFieldSpecs(fresh));
      setReport(report);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Installation-Return-6787-${fresh.year}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      if (report.missing.length) toast.warning(`${report.missing.length} field(s) not found in the template — see below.`);
      else toast.success("Installation Return exported");
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const years = Array.from({ length: 6 }, (_, i) => defaultYear() - 3 + i);
  const P = (o: ResolvedOffice) => (o.memberId ? data?.profiles[o.memberId] : null);

  const Row = ({ o, email }: { o: ResolvedOffice; email?: boolean }) => {
    const p = P(o);
    return (
      <tr className="border-t border-gold/10 align-top">
        <td className="py-2 pr-3 text-gold">{o.label}</td>
        <td className="py-2 pr-3">{p ? blockName(p) : <span className="text-primary-foreground/50">—</span>}</td>
        {email && <td className="py-2 pr-3 text-xs">{p?.email ?? "—"}</td>}
        {email && (
          <td className="py-2 pr-3 text-xs">
            {o.key === "treasurer" ? <span className="text-amber-300">No lodge email field on UGLE's form</span> : lodgeEmailFor(o.key, data!.membershipLodgeEmail)}
          </td>
        )}
        <td className="py-2">
          <Badge className={PROV[o.provenance].cls}>{PROV[o.provenance].label}{o.provenance === "carried" && o.fromYear ? ` (from ${formatMasonicYear(o.fromYear)})` : ""}</Badge>
          {o.note && <p className="text-xs text-primary-foreground/60 mt-1">{o.note}</p>}
        </td>
      </tr>
    );
  };

  const q = data?.qualification;

  return (
    <MembersLayout>
      <Link to="/members/admin/secretary" className="inline-flex items-center gap-1 text-sm text-gold/80 hover:text-gold mb-3"><ArrowLeft className="w-4 h-4" /> Secretary Portal</Link>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-gold">UGLE Installation Return</h1>
          <p className="text-primary-foreground/60 text-sm">Read live from the lodge records every time you open or export it.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{formatMasonicYear(y)}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
          <Button onClick={exportPdf} disabled={busy || !data || !hasTemplate}><Download className="w-4 h-4 mr-1" />Export PDF</Button>
        </div>
      </header>

      {hasTemplate === false && (
        <div className="rounded-sm border border-amber-400/50 bg-amber-400/10 p-4 mb-4 text-sm">
          <p className="mb-2">The official UGLE form (New_IR_Craft.pdf) hasn't been uploaded yet. Export needs it — it is filled fresh each time.</p>
          <label className="inline-flex items-center gap-2 cursor-pointer text-gold"><Upload className="w-4 h-4" /> Upload New_IR_Craft.pdf
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadTemplate(e.target.files[0])} />
          </label>
        </div>
      )}

      {data && (
        <div className="space-y-5 text-primary-foreground text-sm">
          {data.issues.length > 0 && (
            <div className="rounded-sm border border-amber-400/40 bg-amber-400/10 p-4">
              <p className="font-semibold text-amber-300 flex items-center gap-1 mb-1"><AlertTriangle className="w-4 h-4" /> Check before sending</p>
              <ul className="list-disc ml-5 space-y-0.5">{data.issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          )}

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4">
            <h2 className="font-serif text-gold text-lg mb-2">Lodge &amp; dates</h2>
            <p>Weybridge Lodge No. 6787</p>
            <p>Installation date prescribed by by-laws (3rd Wednesday in October): <strong>{ukDate(data.prescribedDate)}</strong></p>
            <p>Actual installation meeting: <strong>{data.installationDate ? ukDate(data.installationDate) : "not found"}</strong>
              {data.installationEventTitle && <span className="text-primary-foreground/60"> — {data.installationEventTitle}</span>}</p>
            <p className="text-primary-foreground/60">{data.installationDate && data.installationDate !== data.prescribedDate ? "Different from the by-laws, so the 'if different' date is filled." : "Same as the by-laws, so the 'if different' date is left blank."}</p>
          </section>

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4">
            <h2 className="font-serif text-gold text-lg mb-2">Master's qualification</h2>
            {q?.branch === 1 && <p>Served as Master of Lodge No. {q.lodgeNo} in the year <strong>{q.year}</strong>{q.allYears.length > 1 ? ` (earliest of ${q.allYears.join(", ")})` : ""}.</p>}
            {q?.branch === 2 && <p>Served as {q.office === "senior_warden" ? "Senior" : "Junior"} Warden for a full year in Lodge No. {q.lodgeNo} in the year <strong>{q.year}</strong>.</p>}
            {q?.branch === 0 && <p className="text-amber-300">{q.reason}</p>}
            <p className="text-xs text-primary-foreground/60 mt-1">The dispensation box is never filled automatically.</p>
          </section>

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 overflow-x-auto">
            <h2 className="font-serif text-gold text-lg mb-2">Master, Wardens and IPM</h2>
            <table className="w-full"><tbody>{data && [data.wm, data.sw, data.jw, data.ipm].map((o) => <Row key={o.key} o={o} />)}</tbody></table>
          </section>

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 overflow-x-auto">
            <h2 className="font-serif text-gold text-lg mb-2">Officers and email addresses</h2>
            <table className="w-full">
              <thead><tr className="text-left text-xs text-primary-foreground/60"><th>Office</th><th>Name</th><th>Personal</th><th>Lodge</th><th>Status</th></tr></thead>
              <tbody>{data.officers.map((o) => <Row key={o.key} o={o} email />)}</tbody>
            </table>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span>Membership Officer lodge email:</span>
              <Select value={data.membershipLodgeEmail} onValueChange={setMembershipEmail} disabled={!(isAdmin || isSecretary)}>
                <SelectTrigger className="w-72 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{MEMBERSHIP_EMAIL_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-xs text-primary-foreground/60 mt-2">UGLE's own form has no lodge email box for the Treasurer, so only the personal address can be given.</p>
          </section>

          <section className="rounded-sm border border-gold/20 bg-navy-light/30 p-4 overflow-x-auto">
            <h2 className="font-serif text-gold text-lg mb-2">Every field that will be filled</h2>
            <table className="w-full text-xs">
              <tbody>{specs.map((s) => (
                <tr key={s.id} className="border-t border-gold/10"><td className="py-1 pr-3 text-primary-foreground/60">{s.label}</td><td className="py-1">{s.value || <span className="text-primary-foreground/40">(blank)</span>}</td></tr>
              ))}</tbody>
            </table>
            <p className="text-xs text-primary-foreground/60 mt-2">Signatures of the Master and Secretary are always left blank for a real signature. Date signed is prefilled with the installation date and can be changed in the PDF.</p>
          </section>

          {report && (report.missing.length > 0 || report.filled.some((f) => f.fuzzy)) && (
            <section className="rounded-sm border border-amber-400/40 bg-amber-400/10 p-4 text-xs">
              <h2 className="font-semibold text-amber-300 mb-1">Template check from last export</h2>
              {report.missing.length > 0 && <p>Not found in the template: {report.missing.join("; ")}</p>}
              {report.filled.filter((f) => f.fuzzy).map((f) => <p key={f.id}>Filled "{f.field}" for {f.id}</p>)}
            </section>
          )}
        </div>
      )}
    </MembersLayout>
  );
}

export default function InstallationReturn() {
  return <Inner />;
}
