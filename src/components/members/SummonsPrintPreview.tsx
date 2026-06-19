// Browser preview for the lodge summons.
//
// Earlier versions of this component re-implemented the PDF layout in HTML
// so it could be rendered inline. That mirror inevitably drifted from the
// canonical PDF generator (src/lib/summonsPdf.tsx) and required parallel
// maintenance for every template change.
//
// This version renders the REAL PDF — the exact same blob that downloads and
// is emailed to members — inside an <iframe>. Preview can never disagree
// with the printed/sent document again.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Loader2 } from "lucide-react";
import { formatDateShort, MemberRow } from "@/lib/summons";
import {
  LodgeTemplate,
  OfficerRollRow,
  SummonsData,
  generateSummonsBlob,
} from "@/lib/summonsPdf";

type Props = {
  template: LodgeTemplate;
  officers: OfficerRollRow[];
  members: MemberRow[];
};

type SummonsRow = SummonsData & { id: string };

export default function SummonsPrintPreview({ template, officers, members }: Props) {
  const [list, setList] = useState<SummonsRow[]>([]);
  const [pickedId, setPickedId] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("summonses")
        .select("*")
        .order("meeting_number", { ascending: false })
        .limit(20);
      const rows = (data ?? []) as any[];
      setList(rows.map(rowToSummons));
      if (rows.length) setPickedId(rows[0].id);
    })();
  }, []);

  const current = useMemo(
    () => list.find((s) => s.id === pickedId) ?? null,
    [list, pickedId],
  );

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    if (!current || !template.lodge_name || !members.length) {
      return;
    }
    setBuilding(true);
    (async () => {
      try {
        const blob = await generateSummonsBlob({
          template,
          officers,
          members,
          summons: current,
        });
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return createdUrl;
        });
      } finally {
        if (!cancelled) setBuilding(false);
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [current, template, officers, members]);

  const handlePrint = () => {
    if (!pdfUrl) return;
    const w = window.open(pdfUrl, "_blank");
    if (w) {
      w.addEventListener("load", () => {
        try { w.focus(); w.print(); } catch { /* noop */ }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-navy-light/40 border border-gold/20 rounded p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs text-primary-foreground/70 block mb-1">Pick a saved summons</label>
          <Select value={pickedId} onValueChange={setPickedId}>
            <SelectTrigger><SelectValue placeholder="Pick a summons…" /></SelectTrigger>
            <SelectContent>
              {list.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  #{s.meeting_number} — {formatDateShort(s.meeting_date)} ({s.meeting_type || "Regular"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handlePrint}
          disabled={!pdfUrl || building}
          className="bg-gold text-navy hover:bg-gold/90"
        >
          {building ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
          Print
        </Button>
      </div>

      {!current ? (
        <p className="text-sm text-primary-foreground/60">
          Save a summons from the New Summons tab to print-preview it here.
        </p>
      ) : (
        <div className="bg-white rounded shadow-xl overflow-hidden" style={{ height: "85vh" }}>
          {pdfUrl ? (
            <iframe
              key={pdfUrl}
              src={pdfUrl}
              title="Summons PDF preview"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Rendering summons…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function rowToSummons(r: any): SummonsRow {
  return {
    id: r.id,
    meeting_number: r.meeting_number,
    meeting_date: r.meeting_date,
    meeting_time: r.meeting_time,
    meeting_type: r.meeting_type,
    dress_code: r.dress_code,
    minutes_confirmation_date: r.minutes_confirmation_date,
    next_meeting_date: r.next_meeting_date,
    officer_night_date: r.officer_night_date,
    agenda: r.agenda ?? [],
    candidates: r.candidates ?? [],
    dining_enquiry_name: r.dining_enquiry_name,
    dining_enquiry_email: r.dining_enquiry_email,
    dining_menu: r.dining_menu ?? null,
    dining_price: r.dining_price ?? null,
    dining_deadline: r.dining_deadline ?? null,
  };
}
