import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RITUAL_GROUPS } from "@/lib/development/catalogues";
import type { RitualRow } from "@/lib/development/queries";
import PreceptorNotesField from "./PreceptorNotesField";

export default function RitualRecord({
  rows,
  canEdit,
  memberId,
  showPreceptorNotes,
  onChange,
}: {
  rows: RitualRow[];
  canEdit: boolean;
  memberId: string;
  showPreceptorNotes: boolean;
  onChange: (next: RitualRow[]) => void;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const map = new Map<string, RitualRow[]>();
    RITUAL_GROUPS.forEach((g) => map.set(g, []));
    for (const r of rows) {
      if (!map.has(r.ritual_group)) map.set(r.ritual_group, []);
      map.get(r.ritual_group)!.push(r);
    }
    return map;
  }, [rows]);

  const patch = async (id: string, fields: Partial<RitualRow>) => {
    setSavingId(id);
    const optimistic = rows.map((r) => (r.id === id ? { ...r, ...fields } : r));
    onChange(optimistic);
    const { error } = await supabase.from("member_ritual_records").update(fields).eq("id", id);
    setSavingId(null);
    if (error) { toast.error(error.message); onChange(rows); }
  };

  return (
    <div className="space-y-6">
      {RITUAL_GROUPS.map((group) => {
        const list = grouped.get(group) ?? [];
        if (list.length === 0) return null;
        return (
          <div key={group}>
            <h3 className="font-serif text-gold text-sm mb-2">{group}</h3>
            <div className="overflow-x-auto rounded-sm border border-gold/20">
              <table className="w-full text-xs">
                <thead className="bg-navy-light/40 text-gold/80 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="text-left p-2">Ritual / Part</th>
                    <th className="text-left p-2 w-32">Learned</th>
                    <th className="text-left p-2 w-32">Assessed</th>
                    <th className="text-left p-2 w-32">LoI</th>
                    <th className="text-left p-2 w-32">In Lodge</th>
                    <th className="text-left p-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="border-t border-gold/10 align-top">
                      <td className="p-2 text-primary-foreground">{r.piece}</td>
                      <td className="p-2"><Input type="date" disabled={!canEdit} value={r.date_first_learned ?? ""}
                        onChange={(e) => patch(r.id, { date_first_learned: e.target.value || null })}
                        className="h-7 bg-navy-dark text-primary-foreground text-xs" /></td>
                      <td className="p-2"><Input type="date" disabled={!canEdit} value={r.date_assessed ?? ""}
                        onChange={(e) => patch(r.id, { date_assessed: e.target.value || null })}
                        className="h-7 bg-navy-dark text-primary-foreground text-xs" /></td>
                      <td className="p-2"><Input type="date" disabled={!canEdit} value={r.date_delivered_loi ?? ""}
                        onChange={(e) => patch(r.id, { date_delivered_loi: e.target.value || null })}
                        className="h-7 bg-navy-dark text-primary-foreground text-xs" /></td>
                      <td className="p-2"><Input type="date" disabled={!canEdit} value={r.date_delivered_lodge ?? ""}
                        onChange={(e) => patch(r.id, { date_delivered_lodge: e.target.value || null })}
                        className="h-7 bg-navy-dark text-primary-foreground text-xs" /></td>
                      <td className="p-2"><Input disabled={!canEdit} value={r.notes ?? ""}
                        onChange={(e) => patch(r.id, { notes: e.target.value })}
                        className="h-7 bg-navy-dark text-primary-foreground text-xs" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {savingId && list.some((r) => r.id === savingId) && (
              <p className="text-[10px] text-gold/60 mt-1">Saving…</p>
            )}
          </div>
        );
      })}
      {!canEdit && (
        <p className="text-[11px] text-primary-foreground/60 italic">Read-only. The Director of Ceremonies or your Mentor fills in dates as you learn and deliver each piece.</p>
      )}
    </div>
  );
}
