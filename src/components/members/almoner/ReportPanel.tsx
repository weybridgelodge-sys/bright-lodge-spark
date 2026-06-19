import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, FileText, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { firstWmYearForMember } from "@/data/worshipfulMasters";
import logoAsset from "@/assets/weybridge-logo-navy.png.asset.json";
const logoUrl = logoAsset.url;

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

// Strip characters outside the WinAnsi range that jsPDF's built-in fonts can render.
// This removes emoji and other pictographs that would otherwise show as "Ø=Üª" mojibake.
const stripEmoji = (s: string) =>
  s
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/[^\x00-\xFF]/g, "");

// Brand colours (sRGB)
const NAVY: [number, number, number] = [27, 42, 74];   // #1B2A4A
const GOLD: [number, number, number] = [201, 164, 50]; // #C9A432
const INK: [number, number, number] = [30, 30, 35];
const MUTED: [number, number, number] = [110, 110, 120];

type LifeEventRow = { member: string; type: string; date: string; detail: string };

export default function ReportPanel({ members }: { members: Member[] }) {
  const today = new Date();
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [advice, setAdvice] = useState("");
  const [report, setReport] = useState<string>("");
  const [data, setData] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const buildLifeEvents = (toDate: string, wmTerms: { member_id: string; year_started: number }[]): LifeEventRow[] => {
    const horizonDays = 92;
    const now = new Date();
    const horizon = new Date(now.getTime() + horizonDays * 86_400_000);

    // Earliest WM year per member (terms + historical roll)
    const firstWmByMember = new Map<string, number>();
    for (const t of wmTerms) {
      const cur = firstWmByMember.get(t.member_id);
      if (cur == null || t.year_started < cur) firstWmByMember.set(t.member_id, t.year_started);
    }
    for (const m of members) {
      const fromRoll = firstWmYearForMember(m.first_name, m.last_name);
      if (fromRoll != null) {
        const cur = firstWmByMember.get(m.id);
        if (cur == null || fromRoll < cur) firstWmByMember.set(m.id, fromRoll);
      }
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

    return items.sort((a, b) => a.when.getTime() - b.when.getTime()).map((x) => x.row);
  };

  const generate = async () => {
    setBusy(true);
    try {
      const [logs, corr, refs, abs, status, life, wm] = await Promise.all([
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
      ]);

      const concern = status.data ?? [];
      const logRows = logs.data ?? [];
      const corrRows = corr.data ?? [];
      const activeRefs = (refs.data ?? []).filter((r: any) => !["closed", "declined"].includes(r.status));
      const absRows = abs.data ?? [];
      const derivedLife = buildLifeEvents(to, wm.data ?? []);
      const manualLife = (life.data ?? []).filter(
        (e: any) => e.event_type !== "birthday" && e.event_type !== "initiation_anniversary" && e.event_type !== "wm_anniversary",
      );

      // Markdown preview
      const lines: string[] = [];
      lines.push(`# Almoner's Report`);
      lines.push(`**Period:** ${fmt(from)} — ${fmt(to)}`);
      lines.push(`**Generated:** ${fmt(new Date().toISOString())}`);
      lines.push("");

      lines.push(`## 1. Members of Concern`);
      if (concern.length === 0) lines.push(`No members currently flagged amber or red.`);
      else for (const s of concern) {
        lines.push(`- **${memberName(memberMap.get(s.member_id))}** — ${s.status.toUpperCase()}${s.notes ? `: ${s.notes}` : ""}`);
      }
      lines.push("");

      lines.push(`## 2. Welfare Contacts (${logRows.length})`);
      if (logRows.length === 0) lines.push(`No logged contacts in this period.`);
      else for (const l of logRows) {
        lines.push(`- ${fmt(l.contact_date)} · **${memberName(memberMap.get(l.member_id))}** · ${l.contact_type} / ${l.contact_nature}${l.notes ? ` — ${l.notes}` : ""}`);
      }
      lines.push("");

      lines.push(`## 3. Correspondence (${corrRows.length})`);
      if (corrRows.length === 0) lines.push(`No correspondence logged.`);
      else for (const c of corrRows) {
        const name = c.member_id ? memberName(memberMap.get(c.member_id)) : "general";
        lines.push(`- ${fmt(c.correspondence_date)} · ${c.direction === "outgoing" ? "→" : "←"} ${name} · ${c.method} — ${c.subject}`);
      }
      lines.push("");

      lines.push(`## 4. Active MCF / Provincial Referrals (${activeRefs.length})`);
      if (activeRefs.length === 0) lines.push(`No active referrals.`);
      else for (const r of activeRefs) {
        lines.push(`- **${memberName(memberMap.get(r.member_id))}** — ${r.referral_type} · *${r.status}* (referred ${fmt(r.referral_date)})`);
        lines.push(`  ${r.summary}`);
      }
      lines.push("");

      lines.push(`## 5. Known Absences (${absRows.length})`);
      if (absRows.length === 0) lines.push(`No absences recorded for this period.`);
      else for (const a of absRows) {
        lines.push(`- **${memberName(memberMap.get(a.member_id))}** — ${a.reason} · ${fmt(a.period_start)} → ${fmt(a.period_end)}${a.notes ? ` — ${a.notes}` : ""}`);
      }
      lines.push("");

      lines.push(`## 6. Life Events — next 3 months (${derivedLife.length + manualLife.length})`);
      if (derivedLife.length === 0 && manualLife.length === 0) {
        lines.push(`Nothing in the next 3 months.`);
      } else {
        for (const e of derivedLife) {
          lines.push(`- ${e.date} · **${e.member}** · ${e.type} — ${e.detail}`);
        }
        for (const e of manualLife) {
          lines.push(`- ${fmt(e.event_date)} · **${memberName(memberMap.get(e.member_id))}** · ${e.event_type.replace(/_/g, " ")}${e.notes ? ` — ${e.notes}` : ""}`);
        }
      }
      lines.push("");

      if (advice.trim()) {
        lines.push(`## 7. Almoner's Advice & Notes`);
        lines.push(advice.trim());
        lines.push("");
      }

      lines.push(`*This report is confidential — for use by the Almoner and Worshipful Master only.*`);

      setReport(lines.join("\n"));
      setData({
        concern, logRows, corrRows, activeRefs, absRows,
        derivedLife,
        manualLife: manualLife.map((e: any) => ({
          member: memberName(memberMap.get(e.member_id)),
          type: e.event_type.replace(/_/g, " "),
          date: fmt(e.event_date),
          detail: e.notes || "",
        })),
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(report);
    toast.success("Report copied to clipboard");
  };

  const downloadMd = () => {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `almoner-report-${to}.md`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!data) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;

    // Load logo
    let logoData: string | null = null;
    try {
      const res = await fetch(logoUrl);
      const blob = await res.blob();
      logoData = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(blob);
      });
    } catch { /* ignore */ }

    // ----- Cover header band -----
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 110, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 110, pageW, 3, "F");

    if (logoData) {
      try { doc.addImage(logoData, "PNG", margin, 22, 66, 66); } catch { /* ignore */ }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.text("Weybridge Lodge No. 6787", margin + 80, 50);
    doc.setFont("times", "italic");
    doc.setFontSize(13);
    doc.setTextColor(...GOLD);
    doc.text("Almoner's Report", margin + 80, 72);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(230, 230, 235);
    doc.text(`Period: ${fmt(from)} — ${fmt(to)}`, margin + 80, 90);
    doc.text(`Generated: ${fmt(new Date().toISOString())}`, pageW - margin, 90, { align: "right" });

    let y = 140;

    const section = (title: string, count?: number) => {
      if (y > pageH - 100) { doc.addPage(); y = margin; }
      doc.setFillColor(...NAVY);
      doc.rect(margin, y, pageW - margin * 2, 22, "F");
      doc.setTextColor(...GOLD);
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text(`${title}${count != null ? `  (${count})` : ""}`, margin + 10, y + 15);
      y += 32;
    };

    const empty = (msg: string) => {
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text(msg, margin + 4, y);
      y += 18;
    };

    const table = (head: string[][], body: any[][]) => {
      autoTable(doc, {
        head, body, startY: y,
        margin: { left: margin, right: margin },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, lineColor: [220, 215, 200], lineWidth: 0.4 },
        headStyles: { fillColor: GOLD, textColor: NAVY, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 247, 238] },
        theme: "grid",
      });
      y = (doc as any).lastAutoTable.finalY + 18;
    };

    // 1 Members of Concern
    section("1. Members of Concern", data.concern.length);
    if (data.concern.length === 0) empty("No members currently flagged amber or red.");
    else table(
      [["Member", "Status", "Notes"]],
      data.concern.map((s: any) => [memberName(memberMap.get(s.member_id)), s.status.toUpperCase(), s.notes || ""]),
    );

    // 2 Welfare Contacts
    section("2. Welfare Contacts", data.logRows.length);
    if (data.logRows.length === 0) empty("No logged contacts in this period.");
    else table(
      [["Date", "Member", "Type / Nature", "Notes"]],
      data.logRows.map((l: any) => [fmt(l.contact_date), memberName(memberMap.get(l.member_id)), `${l.contact_type} / ${l.contact_nature}`, l.notes || ""]),
    );

    // 3 Correspondence
    section("3. Correspondence", data.corrRows.length);
    if (data.corrRows.length === 0) empty("No correspondence logged.");
    else table(
      [["Date", "Dir.", "Member", "Method", "Subject"]],
      data.corrRows.map((c: any) => [
        fmt(c.correspondence_date),
        c.direction === "outgoing" ? "Out" : "In",
        c.member_id ? memberName(memberMap.get(c.member_id)) : "general",
        c.method, c.subject,
      ]),
    );

    // 4 Referrals
    section("4. Active MCF / Provincial Referrals", data.activeRefs.length);
    if (data.activeRefs.length === 0) empty("No active referrals.");
    else table(
      [["Member", "Type", "Status", "Referred", "Summary"]],
      data.activeRefs.map((r: any) => [memberName(memberMap.get(r.member_id)), r.referral_type, r.status, fmt(r.referral_date), r.summary || ""]),
    );

    // 5 Absences
    section("5. Known Absences", data.absRows.length);
    if (data.absRows.length === 0) empty("No absences recorded for this period.");
    else table(
      [["Member", "Reason", "From", "To", "Notes"]],
      data.absRows.map((a: any) => [memberName(memberMap.get(a.member_id)), a.reason, fmt(a.period_start), fmt(a.period_end), a.notes || ""]),
    );

    // 6 Life Events
    const lifeRows = [
      ...data.derivedLife.map((e: LifeEventRow) => [e.date, e.member, e.type, e.detail]),
      ...data.manualLife.map((e: LifeEventRow) => [e.date, e.member, e.type, e.detail]),
    ];
    section("6. Life Events — next 3 months", lifeRows.length);
    if (lifeRows.length === 0) empty("Nothing in the next 3 months.");
    else table([["Date", "Member", "Event", "Detail"]], lifeRows);

    // 7 Advice
    const cleanAdvice = stripEmoji(advice).trim();
    if (cleanAdvice) {
      section("7. Almoner's Advice & Notes");
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const text = doc.splitTextToSize(cleanAdvice, pageW - margin * 2 - 8);
      for (const line of text) {
        if (y > pageH - margin - 40) { doc.addPage(); y = margin; }
        doc.setFont("helvetica", "normal");
        doc.text(line, margin + 4, y);
        y += 14;
      }
      y += 8;
    }

    // Footer on every page
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.6);
      doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
      doc.setFont("times", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text("Confidential — for use by the Almoner and Worshipful Master only.", margin, pageH - 22);
      doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 22, { align: "right" });
      doc.setTextColor(...NAVY);
      doc.setFont("times", "bold");
      doc.text("Weybridge Lodge No. 6787", pageW / 2, pageH - 22, { align: "center" });
    }

    doc.save(`almoner-report-${to}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif text-lg text-primary-foreground">Almoner's Report Generator</h3>
        <p className="text-xs text-primary-foreground/60">Pulls contacts, correspondence, referrals, absences and life events into a single report for agenda item 7.</p>
      </div>

      <div className="bg-navy-light/40 border border-gold/20 rounded p-4 flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-navy text-primary-foreground border-gold/30" />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-navy text-primary-foreground border-gold/30" />
        </div>
        <Button onClick={generate} disabled={busy} className="bg-gold text-navy hover:bg-gold/90">
          <FileText className="w-4 h-4 mr-1" /> {busy ? "Generating…" : "Generate report"}
        </Button>
      </div>

      <div className="bg-navy-light/40 border border-gold/20 rounded p-4 space-y-2">
        <Label className="text-xs text-primary-foreground/80">Almoner's advice &amp; notes (optional — included as the final section)</Label>
        <Textarea
          value={advice}
          onChange={(e) => setAdvice(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Add any advice, recommendations or commentary for the Worshipful Master…"
          className="bg-navy text-primary-foreground border-gold/30"
        />
        <p className="text-[11px] text-primary-foreground/50">Regenerate after editing to refresh the preview.</p>
      </div>

      {report && (
        <div className="bg-navy-light/40 border border-gold/20 rounded p-4">
          <div className="flex items-center justify-end gap-2 mb-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={copy} className="border-gold/30 text-gold hover:bg-gold/10">
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="outline" onClick={downloadMd} className="border-gold/30 text-gold hover:bg-gold/10">
              Download .md
            </Button>
            <Button size="sm" onClick={downloadPdf} className="bg-gold text-navy hover:bg-gold/90">
              <FileDown className="w-4 h-4 mr-1" /> Download PDF
            </Button>
          </div>
          <pre className="text-xs text-primary-foreground/90 whitespace-pre-wrap font-mono bg-navy/60 p-3 rounded border border-gold/10 max-h-[600px] overflow-auto">{report}</pre>
        </div>
      )}
    </div>
  );
}
