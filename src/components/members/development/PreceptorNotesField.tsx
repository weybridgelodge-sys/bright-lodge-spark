import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PreceptorNotesField({
  memberId,
  ritualGroup,
  piece,
}: {
  memberId: string;
  ritualGroup: string;
  piece: string;
}) {
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("member_preceptor_notes")
        .select("notes")
        .eq("member_id", memberId)
        .eq("ritual_group", ritualGroup)
        .eq("piece", piece)
        .maybeSingle();
      if (!cancelled) {
        setValue((data?.notes as string) ?? "");
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [memberId, ritualGroup, piece]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("member_preceptor_notes")
      .upsert(
        { member_id: memberId, ritual_group: ritualGroup, piece, notes: value || null },
        { onConflict: "member_id,ritual_group,piece" },
      );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Preceptor's note saved");
  };

  if (!loaded) return null;
  return (
    <div className="mt-2 rounded-sm border border-gold/20 bg-navy-dark/50 p-2">
      <p className="text-[10px] uppercase tracking-wider text-gold/80 mb-1">Preceptor's Note (DC / WM only)</p>
      <Textarea
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Qualitative observations — not visible to the member."
        className="bg-navy-dark text-primary-foreground text-xs"
      />
      <div className="flex justify-end mt-1">
        <Button size="sm" onClick={save} disabled={saving} className="bg-gold text-navy hover:bg-gold/90 h-7 px-3 text-[11px]">
          {saving ? "Saving…" : "Save note"}
        </Button>
      </div>
    </div>
  );
}
