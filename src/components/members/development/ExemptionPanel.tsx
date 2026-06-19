import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DevelopmentRecord } from "@/lib/development/queries";

export default function ExemptionPanel({
  memberId,
  record,
  canEdit,
  onSaved,
}: {
  memberId: string;
  record: DevelopmentRecord | null;
  canEdit: boolean;
  onSaved: (r: DevelopmentRecord) => void;
}) {
  const [exempt, setExempt] = useState(!!record?.mentoring_exempt);
  const [reason, setReason] = useState<string>(record?.exemption_reason ?? "joining_member");
  const [note, setNote] = useState<string>(record?.exemption_note ?? "");
  const [saving, setSaving] = useState(false);

  if (!canEdit && !record?.mentoring_exempt) return null;
  if (!canEdit && record?.mentoring_exempt) {
    return (
      <div className="rounded-sm border border-gold/30 bg-navy-light/30 p-3 text-xs text-primary-foreground/80">
        <span className="uppercase tracking-wider text-gold text-[10px] mr-2">Mentoring exempt</span>
        {record.exemption_reason === "senior_member" ? "Senior Member" : "Joining Member"}
        {record.exemption_note ? ` — ${record.exemption_note}` : ""}
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("member_development_records")
      .upsert({
        member_id: memberId,
        mentoring_exempt: exempt,
        exemption_reason: exempt ? reason : null,
        exemption_note: exempt ? (note || null) : null,
      }, { onConflict: "member_id" })
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved(data as DevelopmentRecord);
    toast.success("Exemption updated");
  };

  return (
    <div className="rounded-sm border border-gold/20 bg-navy-light/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-gold">Mentoring checklist exemption</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-primary-foreground/70">Exempt</span>
          <Switch checked={exempt} onCheckedChange={setExempt} />
        </div>
      </div>
      {exempt && (
        <div className="grid sm:grid-cols-[200px_1fr] gap-2">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="bg-navy-dark text-primary-foreground text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="joining_member">Joining Member</SelectItem>
              <SelectItem value="senior_member">Senior Member</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            rows={1}
            placeholder="Note (e.g. 'Past Master of another lodge, exempt from checklist.')"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-navy-dark text-primary-foreground text-xs"
          />
        </div>
      )}
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90 h-7 px-3 text-[11px]">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
