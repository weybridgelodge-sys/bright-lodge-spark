import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  ENGAGEMENT_CATEGORY_LABEL,
  addEngagement,
  deleteEngagement,
  loadEngagement,
  lastTouchpoint,
  daysSince,
  type EngagementCategory,
  type EngagementEntry,
} from "@/lib/development/engagement";

const fmt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function EngagementTracker({
  memberId,
  canEdit,
  loggedBy,
}: { memberId: string; canEdit: boolean; loggedBy: string | null }) {
  const [rows, setRows] = useState<EngagementEntry[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    occurred_on: new Date().toISOString().slice(0, 10),
    category: "social" as EngagementCategory,
    summary: "",
  });

  const refresh = async () => {
    const [r, l] = await Promise.all([loadEngagement(memberId), lastTouchpoint(memberId)]);
    setRows(r);
    setLast(l);
  };

  useEffect(() => { refresh(); }, [memberId]);

  const onAdd = async () => {
    if (!form.summary.trim()) { toast.error("Summary is required"); return; }
    setBusy(true);
    try {
      await addEngagement({ ...form, member_id: memberId, logged_by: loggedBy });
      setForm({ ...form, summary: "" });
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed to log"); }
    finally { setBusy(false); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Remove this entry?")) return;
    await deleteEngagement(id);
    await refresh();
  };

  const days = daysSince(last);
  const flagged = days !== null && days > 42;

  return (
    <div className="space-y-4">
      <div className={`rounded-sm border px-3 py-2 text-xs flex items-center gap-2 ${flagged ? "border-amber-400/60 bg-amber-500/10 text-amber-300" : "border-gold/20 bg-navy-dark/30 text-primary-foreground/70"}`}>
        {flagged && <AlertTriangle className="w-3.5 h-3.5" />}
        Last touchpoint: <strong className="text-primary-foreground">{fmt(last)}</strong>
        {days !== null && <span>· {days} day{days === 1 ? "" : "s"} ago</span>}
        {flagged && <span className="ml-2 italic">— retention risk (no contact for 6+ weeks)</span>}
      </div>

      {canEdit && (
        <div className="rounded-sm border border-gold/20 bg-navy-dark/30 p-3 grid grid-cols-1 md:grid-cols-[120px_180px_1fr_auto] gap-2 items-end">
          <div>
            <label className="text-[10px] text-primary-foreground/60 uppercase">Date</label>
            <Input type="date" value={form.occurred_on}
              onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
              className="bg-navy text-primary-foreground" />
          </div>
          <div>
            <label className="text-[10px] text-primary-foreground/60 uppercase">Category</label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as EngagementCategory })}>
              <SelectTrigger className="bg-navy text-primary-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ENGAGEMENT_CATEGORY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] text-primary-foreground/60 uppercase">Summary</label>
            <Textarea rows={1} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="bg-navy text-primary-foreground min-h-[40px]" placeholder="e.g. Attended Topgolf social" />
          </div>
          <Button onClick={onAdd} disabled={busy} className="bg-gold text-navy hover:bg-gold/90">
            <Plus className="w-4 h-4 mr-1" /> Log
          </Button>
        </div>
      )}

      <div className="rounded-sm border border-gold/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-light/40 text-gold/80 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left p-2 w-32">Date</th>
              <th className="text-left p-2 w-40">Category</th>
              <th className="text-left p-2">Summary</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gold/10">
                <td className="p-2 text-primary-foreground/80">{fmt(r.occurred_on)}</td>
                <td className="p-2 text-primary-foreground/80">{ENGAGEMENT_CATEGORY_LABEL[r.category]}</td>
                <td className="p-2 text-primary-foreground">{r.summary}</td>
                {canEdit && (
                  <td className="p-2 text-right">
                    <button onClick={() => onDelete(r.id)} className="text-primary-foreground/50 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={canEdit ? 4 : 3} className="p-4 text-center text-primary-foreground/60 italic">No engagement logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
