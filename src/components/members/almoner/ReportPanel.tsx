import { loadDocIdentity, docTitle, docSubtitle, docFileName, docGroupName } from "@/lib/docIdentity";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, FileText, FileDown, Save, CheckCircle2, Trash2, FolderOpen, Printer, Plus, Sparkles, X } from "lucide-react";
import { defaultWidowReportFrom } from "@/lib/widowGifts";
import { saveBlob, saveJsPdf } from "@/lib/nativeDownload";
import { pastMasterTerms } from "@/lib/pastMastersRoll";
import { upcomingManualDate, dateKey } from "@/lib/lifeEvents";
import { buildAlmonerReportPdf } from "@/lib/almonerReportPdf";

type Member = {
  id: string; first_name: string | null; last_name: string | null;
  preferred_name: string | null; full_name: string | null;
  date_of_birth?: string | null; initiation_date?: string | null;
};

const memberName = (m?: Member) => {
  if (!m) return "—";
  const f = m.preferred_name?.trim() || m.first_name?.trim() || "";
  return [f, m.last_name?.trim() || ""].filter(Boolean).join(" ") || m.full_name || "Unnamed";
};
const fmt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const MILESTONE_YEARS = [10, 15, 20, 25, 30, 35, 40];

const stripEmoji = (s: string) =>
  s
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/[^\x00-\xFF]/g, "");


type LifeEventRow = { member: string; type: string; date: string; detail: string; at?: string };

/** Automated and manual life events together, by date (rows without a key keep their order). */
const sortedLifeRows = (d: SnapshotData): LifeEventRow[] =>
  [...d.derivedLife, ...d.manualLife]
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.at && b.r.at ? a.r.at.localeCompare(b.r.at) : 0) || a.i - b.i)
    .map((x) => x.r);

type WidowLine = { widow_id: string; name: string; text: string };

type SnapshotData = {
  concern: any[]; logRows: any[]; corrRows: any[]; activeRefs: any[]; absRows: any[];
  derivedLife: LifeEventRow[]; manualLife: LifeEventRow[];
  widows?: WidowLine[];
};

type SavedReport = {
  id: string; title: string; period_from: string; period_to: string;
  advice: string; markdown: string; snapshot: SnapshotData;
  status: "draft" | "final"; finalised_at: string | null;
  created_at: string; updated_at: string; created_by: string | null;
};

export default function ReportPanel({ members }: { members: Member[] }) {
  const { canEditAlmoner } = useAuth();
  const today = new Date();
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [defaultFrom, setDefaultFrom] = useState(monthAgo);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [advice, setAdvice] = useState("");
  const [title, setTitle] = useState("Almoner's Report");
  const [report, setReport] = useState<string>("");
  const [data, setData] = useState<SnapshotData | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<"draft" | "final" | null>(null);
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [widows, setWidows] = useState<WidowLine[]>([]);
  const [widowsNote, setWidowsNote] = useState("");
  const [drafting, setDrafting] = useState(false);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const loadList = async () => {
    const { data: rows, error } = await (supabase as any)
      .from("almoner_reports").select("*").order("updated_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setSaved(rows ?? []);
  };

  useEffect(() => {
    loadList();
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: roles } = await (supabase as any).from("user_roles").select("role").eq("user_id", u.user.id);
      setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
    })();
    (async () => {
      const todayIso = today.toISOString().slice(0, 10);
      const [lastFinal, lastMeeting] = await Promise.all([
        (supabase as any).from("almoner_reports").select("period_to").eq("status", "final").order("period_to", { ascending: false }).limit(1),
        (supabase as any).from("lodge_events").select("event_date").lte("event_date", todayIso).is("archived_at", null).order("event_date", { ascending: false }).limit(1),
      ]);
      const d = defaultWidowReportFrom(lastFinal.data?.[0]?.period_to ?? null, lastMeeting.data?.[0]?.event_date?.slice(0, 10) ?? null, todayIso);
      setDefaultFrom(d);
      setFrom((cur) => (cur === monthAgo ? d : cur));
    })();
  }, []);

  const resetForm = () => {
    setCurrentId(null); setCurrentStatus(null);
    setReport(""); setData(null); setAdvice(""); setTitle("Almoner's Report");
    setWidows([]); setWidowsNote("");
    setFrom(defaultFrom); setTo(today.toISOString().slice(0, 10));
  };

  const buildLifeEvents = (toDate: string, wmTerms: { member_id: string; year_started: number }[]): LifeEventRow[] => {
    const horizonDays = 92;
    const now = new Date();
    const horizon = new Date(now.getTime() + horizonDays * 86_400_000);

    const firstWmByMember = new Map<string, number>();
    for (const t of wmTerms) {
      const cur = firstWmByMember.get(t.member_id);
      if (cur == null || t.year_started < cur) firstWmByMember.set(t.member_id, t.year_started);
    }

    const items: { when: Date; row: LifeEventRow }[] = [];

    for (const m of members) {
      const name = memberName(m);

      if (m.date_of_birth) {
        const d = new Date(m.date_of_birth);
        const when = new Date(now.getFullYear(), d.getMonth(), d.getDate());
        if (when < new Date(now.getFullYear(), now.getMonth(), now.getDate())) when.setFullYear(now.getFullYear() + 1);
        if (when <= horizon) {
          let age = when.getFullYear() - d.getFullYear();
          items.push({ when, row: { member: name, type: "Birthday", date: fmt(when.toISOString()), detail: `Turns ${age}` } });
        }
      }

      if (m.initiation_date) {
        const d = new Date(m.initiation_date);
        for (const yrs of MILESTONE_YEARS) {
          const when = new Date(d.getFullYear() + yrs, d.getMonth(), d.getDate());
          if (when >= now && when <= horizon) {
            items.push({ when, row: { member: name, type: "Initiation anniversary", date: fmt(when.toISOString()), detail: `${yrs} years` } });
          }
        }
      }

      const firstWm = firstWmByMember.get(m.id);
      if (firstWm) {
        for (const yrs of MILESTONE_YEARS) {
          const when = new Date(firstWm + yrs, 9, 1);
          if (when >= now && when <= horizon) {
            items.push({ when, row: { member: name, type: "Worshipful Master anniversary", date: fmt(when.toISOString()), detail: `${yrs} years` } });
          }
        }
      }
    }

    return items.sort((a, b) => a.when.getTime() - b.when.getTime()).map((x) => ({ ...x.row, at: dateKey(x.when) }));
  };

  const buildMarkdown = (fromD: string, toD: string, adviceText: string, d: SnapshotData) => {
    const lines: string[] = [];
    lines.push(`# Almoner's Report`);
    lines.push(`**Period:** ${fmt(fromD)} — ${fmt(toD)}`);
    lines.push(`**Generated:** ${fmt(new Date().toISOString())}`);
    lines.push("");
    lines.push(`## 1. Members of Concern`);
    if (d.concern.length === 0) lines.push(`No members currently flagged amber or red.`);
    else for (const s of d.concern) lines.push(`- **${memberName(memberMap.get(s.member_id))}** — ${s.status.toUpperCase()}${s.notes ? `: ${s.notes}` : ""}`);
    lines.push("");
    lines.push(`## 2. Welfare Contacts (${d.logRows.length})`);
    if (d.logRows.length === 0) lines.push(`No logged contacts in this period.`);
    else for (const l of d.logRows) lines.push(`- ${fmt(l.contact_date)} · **${memberName(memberMap.get(l.member_id))}** · ${l.contact_type} / ${l.contact_nature}${l.notes ? ` — ${l.notes}` : ""}`);
    lines.push("");
    lines.push(`## 3. Correspondence (${d.corrRows.length})`);
    if (d.corrRows.length === 0) lines.push(`No correspondence logged.`);
    else for (const c of d.corrRows) {
      const name = c.member_id ? memberName(memberMap.get(c.member_id)) : "general";
      lines.push(`- ${fmt(c.correspondence_date)} · ${c.direction === "outgoing" ? "→" : "←"} ${name} · ${c.method} — ${c.subject}`);
    }
    lines.push("");
    lines.push(`## 4. Active MCF / Provincial Referrals (${d.activeRefs.length})`);
    if (d.activeRefs.length === 0) lines.push(`No active referrals.`);
    else for (const r of d.activeRefs) {
      lines.push(`- **${memberName(memberMap.get(r.member_id))}** — ${r.referral_type} · *${r.status}* (referred ${fmt(r.referral_date)})`);
      lines.push(`  ${r.summary}`);
    }
    lines.push("");
    lines.push(`## 5. Known Absences (${d.absRows.length})`);
    if (d.absRows.length === 0) lines.push(`No absences recorded for this period.`);
    else for (const a of d.absRows) lines.push(`- **${memberName(memberMap.get(a.member_id))}** — ${a.reason} · ${fmt(a.period_start)} → ${fmt(a.period_end)}${a.notes ? ` — ${a.notes}` : ""}`);
    lines.push("");
    lines.push(`## 6. Life Events — next 3 months (${d.derivedLife.length + d.manualLife.length})`);
    if (d.derivedLife.length === 0 && d.manualLife.length === 0) lines.push(`Nothing in the next 3 months.`);
    else {
      for (const e of sortedLifeRows(d)) lines.push(`- ${e.date} · **${e.member}** · ${e.type}${e.detail ? ` — ${e.detail}` : ""}`);
    }
    lines.push("");
    const wl = d.widows ?? [];
    if (wl.length) {
      lines.push(`## 7. Widows & Dependants (${wl.length})`);
      for (const w of wl) lines.push(`- **${w.name}** — ${w.text}`);
      lines.push("");
    }
    if (adviceText.trim()) {
      lines.push(`## ${wl.length ? 8 : 7}. Almoner's Advice & Notes`);
      lines.push(adviceText.trim());
      lines.push("");
    }
    lines.push(`*This report is confidential — for use by the Almoner and Worshipful Master only.*`);
    return lines.join("\n");
  };

  const generate = async () => {
    setBusy(true);
    try {
      const [logs, corr, refs, abs, status, life, wm, pmRoll] = await Promise.all([
        (supabase as any).from("welfare_log_entries").select("*")
          .gte("contact_date", from).lte("contact_date", to).is("deleted_at", null)
          .order("contact_date", { ascending: false }),
        (supabase as any).from("welfare_correspondence").select("*")
          .gte("correspondence_date", from).lte("correspondence_date", to).is("deleted_at", null),
        (supabase as any).from("welfare_rmtgb_referrals").select("*").is("deleted_at", null),
        (supabase as any).from("welfare_absences").select("*").is("deleted_at", null)
          .or(`period_end.is.null,period_end.gte.${from}`),
        (supabase as any).from("welfare_member_status").select("*").in("status", ["amber", "red"]),
        (supabase as any).from("welfare_life_events").select("*").is("deleted_at", null),
        (supabase as any).from("member_wm_terms").select("member_id,year_started"),
        (supabase as any).from("past_masters").select("member_id,lodge_year"),
      ]);

      const derivedLife = buildLifeEvents(to, [...(wm.data ?? []), ...pastMasterTerms(pmRoll.data)]);
      const manualLife = (life.data ?? [])
        .filter((e: any) => e.event_type !== "birthday" && e.event_type !== "initiation_anniversary" && e.event_type !== "wm_anniversary")
        .map((e: any) => ({ e, when: upcomingManualDate(e.event_date, !!e.recurring) }))
        .filter((x: any) => x.when)
        .map(({ e, when }: any) => ({
          member: memberName(memberMap.get(e.member_id)),
          type: e.event_type.replace(/_/g, " "),
          date: when.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          detail: e.notes || "",
          at: dateKey(when),
        }));

      const snap: SnapshotData = {
        concern: status.data ?? [],
        logRows: ((logs.data as any[]) ?? []).filter((l) => !l.is_system),
        corrRows: corr.data ?? [],
        activeRefs: (refs.data ?? []).filter((r: any) => !["closed", "declined"].includes(r.status)),
        absRows: abs.data ?? [],
        derivedLife, manualLife, widows,
      };
      setData(snap);
      setReport(buildMarkdown(from, to, advice, snap));
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  const persist = async (status: "draft" | "final") => {
    if (!data) { toast.error("Generate the report first"); return; }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const payload: any = {
        title: title.trim() || "Almoner's Report",
        period_from: from, period_to: to, advice,
        markdown: report, snapshot: data, status,
        finalised_at: status === "final" ? new Date().toISOString() : null,
      };
      if (currentId) {
        const { error } = await (supabase as any).from("almoner_reports").update(payload).eq("id", currentId);
        if (error) throw error;
      } else {
        const { data: row, error } = await (supabase as any).from("almoner_reports")
          .insert({ ...payload, created_by: u.user?.id }).select().single();
        if (error) throw error;
        setCurrentId(row.id);
      }
      setCurrentStatus(status);
      toast.success(status === "final" ? "Report finalised" : "Draft saved");
      loadList();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setSaving(false);
  };

  const loadReport = (r: SavedReport) => {
    setCurrentId(r.id); setCurrentStatus(r.status);
    setTitle(r.title); setFrom(r.period_from); setTo(r.period_to);
    setAdvice(r.advice); setData(r.snapshot); setReport(r.markdown);
    setWidows(r.snapshot?.widows ?? []); setWidowsNote("");
    toast.success(`Loaded "${r.title}"`);
  };

  const applyWidows = (list: WidowLine[]) => {
    setWidows(list);
    if (data) {
      const nd = { ...data, widows: list };
      setData(nd); setReport(buildMarkdown(from, to, advice, nd));
    }
  };

  const draftWidows = async () => {
    setDrafting(true); setWidowsNote("");
    try {
      const { data: res, error } = await supabase.functions.invoke("almoner-widow-report", { body: { from, to } });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep default */ }
        throw new Error(msg);
      }
      const lines: WidowLine[] = res?.lines ?? [];
      applyWidows(lines);
      if (lines.length === 0) setWidowsNote(res?.considered ? "Nothing reportable found in the contact notes for this period." : "No widow contacts or gifts logged in this period.");
      else toast.success(`Drafted ${lines.length} widow update${lines.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(`Widow updates not drafted: ${(e as Error).message}`);
    }
    setDrafting(false);
  };

  const removeReport = async (id: string) => {
    if (!confirm("Delete this report permanently?")) return;
    const { error } = await (supabase as any).from("almoner_reports").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (currentId === id) resetForm();
    toast.success("Report deleted");
    loadList();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(report);
    toast.success("Report copied to clipboard");
  };

  const downloadMd = async () => {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    await saveBlob(blob, `almoner-report-${to}.md`);
  };

  const buildPdf = (fromD: string, toD: string, adviceText: string, d: SnapshotData) =>
    buildAlmonerReportPdf({
      fromD, toD, adviceText, d, fmt, stripEmoji,
      nameOf: (id) => memberName(id ? memberMap.get(id) : undefined),
      lifeRows: sortedLifeRows(d),
    });

  const downloadPdf = async () => {
    if (!data) return;
    const doc = await buildPdf(from, to, advice, data);
    await saveJsPdf(doc, `almoner-report-${to}.pdf`);
  };

  const reprint = async (r: SavedReport) => {
    const doc = await buildPdf(r.period_from, r.period_to, r.advice, r.snapshot);
    await saveJsPdf(doc, `almoner-report-${r.period_to}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-serif text-lg text-primary-foreground">Almoner's Report Generator</h3>
          <p className="text-xs text-primary-foreground/80">Pulls contacts, correspondence, referrals, absences and life events into a single report for agenda item 7.</p>
        </div>
        {currentId && (
          <Button size="sm" variant="outline" onClick={resetForm} className="bg-transparent border-gold/30 text-gold hover:bg-gold/10 hover:text-gold">
            <Plus className="w-4 h-4 mr-1" /> New report
          </Button>
        )}
      </div>

      <div className="bg-navy-light/40 border border-gold/20 rounded p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Title</Label>
          <Input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-navy text-primary-foreground border-gold/30" />
        </div>
        <div>
          <Label className="text-xs">From</Label>
          <Input aria-label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-navy text-primary-foreground border-gold/30" />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input aria-label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-navy text-primary-foreground border-gold/30" />
        </div>
        <Button onClick={generate} disabled={busy} className="bg-gold text-navy hover:bg-gold/90">
          <FileText className="w-4 h-4 mr-1" /> {busy ? "Generating…" : "Generate"}
        </Button>
        {currentStatus && (
          <Badge variant={currentStatus === "final" ? "default" : "secondary"} className={currentStatus === "final" ? "bg-gold text-navy" : ""}>
            {currentStatus === "final" ? "Finalised" : "Draft"}
          </Badge>
        )}
      </div>

      <div className="bg-navy-light/40 border border-gold/20 rounded p-4 space-y-2">
        <Label className="text-xs text-primary-foreground/80">Almoner's advice &amp; notes (optional — included as the final section)</Label>
        <Textarea aria-label="Almoner's advice &amp; notes (optional — included as the final section)"
          value={advice}
          onChange={(e) => setAdvice(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Add any advice, recommendations or commentary for the Worshipful Master…"
          className="bg-navy text-primary-foreground border-gold/30"
        />
        <p className="text-[11px] text-primary-foreground/80">Regenerate after editing to refresh the preview. Note: emoji will be removed from the printed PDF.</p>
      </div>

      <section aria-label="Widows and dependants" className="bg-navy-light/40 border border-gold/20 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-serif text-sm text-gold">Widows &amp; Dependants</h4>
            <p className="text-[11px] text-primary-foreground/80">Short lines drafted from the widows' contact log and gifts between the From and To dates. Widows with nothing new are left out.</p>
          </div>
          {canEditAlmoner && (
            <Button onClick={draftWidows} disabled={drafting} variant="outline" className="bg-transparent border-gold/30 text-gold hover:bg-gold/10 min-h-[48px] w-full sm:w-auto hover:text-gold">
              <Sparkles className="w-4 h-4 mr-1" /> {drafting ? "Drafting…" : widows.length ? "Redraft widow updates" : "Draft widow updates"}
            </Button>
          )}
        </div>
        {widows.length === 0 ? (
          <p className="text-xs text-primary-foreground/80 italic">{widowsNote || "No widow updates in this report."}</p>
        ) : (
          <ul className="space-y-2">
            {widows.map((w, i) => (
              <li key={w.widow_id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`widow-line-${i}`} className="text-xs text-primary-foreground/80 break-words">{w.name}</Label>
                  {canEditAlmoner && (
                    <button onClick={() => applyWidows(widows.filter((_, j) => j !== i))} className="min-w-[48px] min-h-[48px] flex items-center justify-center text-primary-foreground/80 hover:text-destructive-foreground" aria-label={`Remove line for ${w.name}`}><X className="w-4 h-4" /></button>
                  )}
                </div>
                <Textarea id={`widow-line-${i}`} value={w.text} readOnly={!canEditAlmoner} rows={2} maxLength={600}
                  onChange={(e) => applyWidows(widows.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  className="bg-navy text-primary-foreground border-gold/30" />
              </li>
            ))}
          </ul>
        )}
        {canEditAlmoner && widows.length > 0 && <p className="text-[11px] text-primary-foreground/80">AI-drafted — check each line before saving. Edits update the report preview below.</p>}
      </section>

      {report && (
        <div className="bg-navy-light/40 border border-gold/20 rounded p-4">
          <div className="flex items-center justify-end gap-2 mb-2 flex-wrap">
            {canEditAlmoner && (<>
            <Button size="sm" variant="outline" onClick={() => persist("draft")} disabled={saving} className="bg-transparent border-gold/30 text-gold hover:bg-gold/10 hover:text-gold">
              <Save className="w-4 h-4 mr-1" /> Save draft
            </Button>
            <Button size="sm" variant="outline" onClick={() => persist("final")} disabled={saving} className="bg-transparent border-gold/30 text-gold hover:bg-gold/10 hover:text-gold">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Finalise
            </Button>
            </>)}
            <Button size="sm" variant="outline" onClick={copy} className="bg-transparent border-gold/30 text-gold hover:bg-gold/10 hover:text-gold">
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="outline" onClick={downloadMd} className="bg-transparent border-gold/30 text-gold hover:bg-gold/10 hover:text-gold">
              Download .md
            </Button>
            <Button size="sm" onClick={downloadPdf} className="bg-gold text-navy hover:bg-gold/90">
              <FileDown className="w-4 h-4 mr-1" /> Download PDF
            </Button>
          </div>
          <pre className="text-xs text-primary-foreground/90 whitespace-pre-wrap font-mono bg-navy/60 p-3 rounded border border-gold/10 max-h-[600px] overflow-auto">{report}</pre>
        </div>
      )}

      <div className="bg-navy-light/40 border border-gold/20 rounded p-4">
        <h4 className="font-serif text-sm text-gold mb-3">Saved reports ({saved.length})</h4>
        {saved.length === 0 ? (
          <p className="text-xs text-primary-foreground/80 italic">No saved reports yet. Save a draft or finalise a report to keep it here.</p>
        ) : (
          <ul className="space-y-2">
            {saved.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 flex-wrap bg-navy/40 border border-gold/10 rounded px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-primary-foreground truncate">{r.title}</span>
                    <Badge variant={r.status === "final" ? "default" : "secondary"} className={r.status === "final" ? "bg-gold text-navy text-[10px]" : "text-[10px]"}>
                      {r.status === "final" ? "Final" : "Draft"}
                    </Badge>
                    {currentId === r.id && <Badge variant="outline" className="text-[10px] border-gold/40 text-gold">Editing</Badge>}
                  </div>
                  <div className="text-[11px] text-primary-foreground/80">
                    {fmt(r.period_from)} → {fmt(r.period_to)} · updated {fmt(r.updated_at)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => loadReport(r)} className="text-gold hover:bg-gold/10 h-8 px-2">
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => reprint(r)} className="text-gold hover:bg-gold/10 h-8 px-2">
                    <Printer className="w-4 h-4" />
                  </Button>
                  {isAdmin && canEditAlmoner && (
                    <Button size="sm" variant="ghost" onClick={() => removeReport(r.id)} className="text-red-400 hover:bg-red-500/10 h-8 px-2">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!isAdmin && saved.length > 0 && (
          <p className="text-[11px] text-primary-foreground/80 mt-2 italic">Only admins can delete saved reports.</p>
        )}
      </div>
    </div>
  );
}
