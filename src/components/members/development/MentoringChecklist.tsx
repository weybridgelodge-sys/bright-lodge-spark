import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CHECKLIST_STAGES, STATUS_LABELS } from "@/lib/development/catalogues";
import type { ChecklistItem } from "@/lib/development/queries";

export default function MentoringChecklist({
  items,
  canEdit,
  onChange,
}: {
  items: ChecklistItem[];
  canEdit: boolean;
  onChange: (next: ChecklistItem[]) => void;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    CHECKLIST_STAGES.forEach((s) => map.set(s, []));
    for (const it of items) {
      if (!map.has(it.stage)) map.set(it.stage, []);
      map.get(it.stage)!.push(it);
    }
    return map;
  }, [items]);

  const overallPct = Math.round(
    (items.filter((i) => i.status === "complete").length / Math.max(items.length, 1)) * 100,
  );

  const patch = async (id: string, fields: Partial<ChecklistItem>) => {
    setSavingId(id);
    const optimistic = items.map((it) => (it.id === id ? { ...it, ...fields } : it));
    onChange(optimistic);
    const { error } = await supabase.from("member_checklist_items").update(fields).eq("id", id);
    setSavingId(null);
    if (error) { toast.error(error.message); onChange(items); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress value={overallPct} className="h-2 bg-navy-light" />
        </div>
        <p className="text-xs text-gold font-medium tabular-nums">{overallPct}% complete</p>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {CHECKLIST_STAGES.map((stage) => {
          const rows = grouped.get(stage) ?? [];
          const done = rows.filter((r) => r.status === "complete").length;
          const pct = Math.round((done / Math.max(rows.length, 1)) * 100);
          return (
            <AccordionItem key={stage} value={stage} className="border border-gold/20 rounded-sm bg-navy-light/20">
              <AccordionTrigger className="px-3 hover:no-underline">
                <div className="flex-1 flex items-center justify-between gap-3 pr-2">
                  <span className="font-serif text-primary-foreground">{stage}</span>
                  <span className="text-[11px] text-gold/80 tabular-nums">{done}/{rows.length} · {pct}%</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <div className="space-y-2">
                  {rows.map((r) => {
                    const overdue = r.target_date && r.status !== "complete" && new Date(r.target_date) < new Date();
                    return (
                      <div key={r.id} className={`rounded-sm border p-3 ${overdue ? "border-amber-500/50 bg-amber-500/5" : "border-gold/15 bg-navy-dark/40"}`}>
                        <div className="grid gap-2 md:grid-cols-[1fr_140px_140px_150px]">
                          <p className="text-sm text-primary-foreground">{r.topic}</p>
                          <label className="text-[10px] uppercase tracking-wider text-gold/70">Target
                            <Input type="date" disabled={!canEdit} value={r.target_date ?? ""}
                              onChange={(e) => patch(r.id, { target_date: e.target.value || null })}
                              className="mt-1 h-8 bg-navy-dark text-primary-foreground text-xs" />
                          </label>
                          <label className="text-[10px] uppercase tracking-wider text-gold/70">Completed
                            <Input type="date" disabled={!canEdit} value={r.completed_date ?? ""}
                              onChange={(e) => patch(r.id, { completed_date: e.target.value || null })}
                              className="mt-1 h-8 bg-navy-dark text-primary-foreground text-xs" />
                          </label>
                          <label className="text-[10px] uppercase tracking-wider text-gold/70">Status
                            <Select disabled={!canEdit} value={r.status}
                              onValueChange={(v) => patch(r.id, { status: v as ChecklistItem["status"] })}>
                              <SelectTrigger className="mt-1 h-8 bg-navy-dark text-primary-foreground text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                        </div>
                        <Textarea disabled={!canEdit} rows={2} placeholder="Mentor notes"
                          value={r.mentor_notes ?? ""}
                          onChange={(e) => patch(r.id, { mentor_notes: e.target.value })}
                          className="mt-2 bg-navy-dark text-primary-foreground text-xs" />
                        {savingId === r.id && <p className="text-[10px] text-gold/60 mt-1">Saving…</p>}
                      </div>
                    );
                  })}
                  {rows.length === 0 && (
                    <p className="text-xs text-primary-foreground/60 italic">No items in this stage.</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
