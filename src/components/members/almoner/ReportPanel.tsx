import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, FileText } from "lucide-react";

type Member = { id: string; first_name: string | null; last_name: string | null; preferred_name: string | null; full_name: string | null };

const memberName = (m?: Member) => {
  if (!m) return "—";
  const f = m.preferred_name?.trim() || m.first_name?.trim() || "";
  return [f, m.last_name?.trim() || ""].filter(Boolean).join(" ") || m.full_name || "Unnamed";
};
const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function ReportPanel({ members }: { members: Member[] }) {
  const today = new Date();
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [report, setReport] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const generate = async () => {
    setBusy(true);
    try {
      const [logs, corr, refs, abs, status] = await Promise.all([
        (supabase as any).from("welfare_log_entries").select("*")
          .gte("contact_date", from).lte("contact_date", to).is("deleted_at", null)
          .order("contact_date", { ascending: false }),
        (supabase as any).from("welfare_correspondence").select("*")
          .gte("correspondence_date", from).lte("correspondence_date", to).is("deleted_at", null),
        (supabase as any).from("welfare_rmtgb_referrals").select("*").is("deleted_at", null),
        (supabase as any).from("welfare_absences").select("*").is("deleted_at", null)
          .or(`period_end.is.null,period_end.gte.${from}`),
        (supabase as any).from("welfare_member_status").select("*").in("status", ["amber", "red"]),
      ]);

      const lines: string[] = [];
      lines.push(`# Almoner's Report`);
      lines.push(`**Period:** ${fmt(from)} — ${fmt(to)}`);
      lines.push(`**Generated:** ${fmt(new Date().toISOString())}`);
      lines.push("");

      // 1. Members of concern
      lines.push(`## 1. Members of Concern`);
      const concern = (status.data ?? []);
      if (concern.length === 0) {
        lines.push(`No members currently flagged amber or red.`);
      } else {
        for (const s of concern) {
          const name = memberName(memberMap.get(s.member_id));
          lines.push(`- **${name}** — ${s.status.toUpperCase()}${s.notes ? `: ${s.notes}` : ""}`);
        }
      }
      lines.push("");

      // 2. Welfare contacts this period
      lines.push(`## 2. Welfare Contacts (${(logs.data ?? []).length})`);
      if ((logs.data ?? []).length === 0) {
        lines.push(`No logged contacts in this period.`);
      } else {
        for (const l of logs.data) {
          const name = memberName(memberMap.get(l.member_id));
          lines.push(`- ${fmt(l.contact_date)} · **${name}** · ${l.contact_type} / ${l.contact_nature}${l.notes ? ` — ${l.notes}` : ""}`);
        }
      }
      lines.push("");

      // 3. Correspondence
      lines.push(`## 3. Correspondence (${(corr.data ?? []).length})`);
      if ((corr.data ?? []).length === 0) {
        lines.push(`No correspondence logged.`);
      } else {
        for (const c of corr.data) {
          const name = c.member_id ? memberName(memberMap.get(c.member_id)) : "general";
          lines.push(`- ${fmt(c.correspondence_date)} · ${c.direction === "outgoing" ? "→" : "←"} ${name} · ${c.method} — ${c.subject}`);
        }
      }
      lines.push("");

      // 4. Active referrals
      const activeRefs = (refs.data ?? []).filter((r: any) => !["closed", "declined"].includes(r.status));
      lines.push(`## 4. Active RMTGB / MCF Referrals (${activeRefs.length})`);
      if (activeRefs.length === 0) {
        lines.push(`No active referrals.`);
      } else {
        for (const r of activeRefs) {
          const name = memberName(memberMap.get(r.member_id));
          lines.push(`- **${name}** — ${r.referral_type} · *${r.status}* (referred ${fmt(r.referral_date)})`);
          lines.push(`  ${r.summary}`);
        }
      }
      lines.push("");

      // 5. Known absences
      lines.push(`## 5. Known Absences (${(abs.data ?? []).length})`);
      if ((abs.data ?? []).length === 0) {
        lines.push(`No absences recorded for this period.`);
      } else {
        for (const a of abs.data) {
          const name = memberName(memberMap.get(a.member_id));
          lines.push(`- **${name}** — ${a.reason} · ${fmt(a.period_start)} → ${fmt(a.period_end)}${a.notes ? ` — ${a.notes}` : ""}`);
        }
      }
      lines.push("");
      lines.push(`*This report is confidential — for use by the Almoner and Worshipful Master only.*`);

      setReport(lines.join("\n"));
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(report);
    toast.success("Report copied to clipboard");
  };

  const download = () => {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `almoner-report-${to}.md`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif text-lg text-primary-foreground">Almoner's Report Generator</h3>
        <p className="text-xs text-primary-foreground/60">Pulls contacts, correspondence, referrals and absences into a single report for agenda item 7.</p>
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

      {report && (
        <div className="bg-navy-light/40 border border-gold/20 rounded p-4">
          <div className="flex items-center justify-end gap-2 mb-2">
            <Button size="sm" variant="outline" onClick={copy} className="border-gold/30 text-gold hover:bg-gold/10">
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="outline" onClick={download} className="border-gold/30 text-gold hover:bg-gold/10">
              Download .md
            </Button>
          </div>
          <pre className="text-xs text-primary-foreground/90 whitespace-pre-wrap font-mono bg-navy/60 p-3 rounded border border-gold/10 max-h-[600px] overflow-auto">{report}</pre>
        </div>
      )}
    </div>
  );
}
