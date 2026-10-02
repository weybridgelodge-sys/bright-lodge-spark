import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CalendarDays, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import {
  POSITION_ORDER, POSITION_LABELS, NON_PROGRESSIVE_LABELS, formatMasonicYear,
} from "@/lib/officersProgression";

type Row = {
  position_key: string;
  member_id: string | null;
  lodge_year: number;
  appointed_on: string | null;
  is_projection: boolean;
};

/** Third Wednesday in October, as YYYY-MM-DD (matches officer_year_start fallback). */
export function thirdWednesdayIso(year: number): string {
  const d = new Date(Date.UTC(year, 9, 15));
  while (d.getUTCDay() !== 3) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const fmt = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);

const PROGRESSIVE = new Set<string>(POSITION_ORDER as readonly string[]);
const labelFor = (k: string) =>
  (POSITION_LABELS as Record<string, string>)[k] ?? (NON_PROGRESSIVE_LABELS as Record<string, string>)[k] ?? k;

export type HandOver = { position: string; from: string | null; to: string; effective: string };

/** Offices whose holder changes in officers' year `year` if it starts on `date`. */
export function handoversFor(rows: Row[], year: number, date: string): HandOver[] {
  const confirmed = rows.filter((r) => !r.is_projection && r.member_id);
  const out: HandOver[] = [];
  for (const r of confirmed.filter((x) => x.lodge_year === year)) {
    const prev = confirmed
      .filter((x) => x.position_key === r.position_key && x.lodge_year < year)
      .sort((a, b) => b.lodge_year - a.lodge_year)[0];
    if (prev?.member_id === r.member_id) continue;
    const effective = !PROGRESSIVE.has(r.position_key) && r.appointed_on && r.appointed_on > date ? r.appointed_on : date;
    out.push({ position: r.position_key, from: prev?.member_id ?? null, to: r.member_id!, effective });
  }
  const order = [...(POSITION_ORDER as readonly string[]), ...Object.keys(NON_PROGRESSIVE_LABELS)];
  return out.sort((a, b) => order.indexOf(a.position) - order.indexOf(b.position));
}

export default function InstallationDateCard({
  year: initialYear, rows, nameOf, canEdit, onSaved,
}: {
  year: number;
  rows: Row[];
  nameOf: (id: string | null) => string;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [year, setYear] = useState(initialYear);
  useEffect(() => setYear(initialYear), [initialYear]);
  const [stored, setStored] = useState<Record<number, string>>({});
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDates = async () => {
    const { data } = await supabase.from("officer_installation_dates" as any).select("lodge_year,installation_date");
    const map: Record<number, string> = {};
    for (const r of ((data as any[]) ?? [])) map[r.lodge_year] = r.installation_date;
    setStored(map);
  };
  useEffect(() => { loadDates(); }, []);

  const fallback = thirdWednesdayIso(year);
  const current = stored[year] ?? fallback;
  const isStored = !!stored[year];

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(draft) && !Number.isNaN(Date.parse(draft + "T00:00:00Z"));
  const draftYear = valid ? Number(draft.slice(0, 4)) : NaN;
  const draftMonth = valid ? Number(draft.slice(5, 7)) : NaN;
  const inRange = valid && draftYear === year && draftMonth >= 9 && draftMonth <= 11;
  const drift = valid ? Math.abs(dayDiff(draft, fallback)) : 0;
  const farWarning = inRange && drift > 14;

  const changes = useMemo(() => (inRange ? handoversFor(rows, year, draft) : []), [rows, year, draft, inRange]);

  const startEdit = () => { setDraft(current); setConfirming(false); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("officer_installation_dates" as any)
      .upsert({ lodge_year: year, installation_date: draft } as any, { onConflict: "lodge_year" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Installation date for ${formatMasonicYear(year)} set to ${fmt(draft)}`);
    setOpen(false);
    await loadDates();
    onSaved();
  };

  return (
    <section aria-labelledby="inst-date-h" className="rounded-sm border border-gold/30 bg-navy-dark/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 text-gold shrink-0" aria-hidden />
          <h2 id="inst-date-h" className="font-serif text-gold text-base">Installation date</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11 text-gold" aria-label="Previous officers' year" onClick={() => setYear(year - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-primary-foreground tabular-nums min-w-[4.5rem] text-center">{formatMasonicYear(year)}</span>
          <Button variant="ghost" size="icon" className="h-11 w-11 text-gold" aria-label="Next officers' year" onClick={() => setYear(year + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-primary-foreground text-sm">
          {fmt(current)}{" "}
          <span className="text-primary-foreground/60 text-xs">{isStored ? "(set)" : "(default: third Wednesday in October)"}</span>
        </p>
        {canEdit && (
          <Button size="sm" variant="outline" className="border-gold/50 text-gold bg-transparent hover:bg-gold/10 min-h-[44px]" onClick={startEdit}>
            {isStored ? "Change" : "Set date"}
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-primary-foreground/70">
        Officers change at this date. Financial year (1 Oct to 30 Sep) is separate.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-navy border-gold/30 text-primary-foreground max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-gold">Installation date · {formatMasonicYear(year)}</DialogTitle>
            <DialogDescription className="text-primary-foreground/70">
              Officers change at this date. Financial year (1 Oct to 30 Sep) is separate.
            </DialogDescription>
          </DialogHeader>
          {!confirming ? (
            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-wider text-gold/80">
                Date
                <Input type="date" value={draft} min={`${year}-09-01`} max={`${year}-11-30`}
                  onChange={(e) => setDraft(e.target.value)} className="mt-1 bg-navy-dark text-primary-foreground" />
              </label>
              {!valid && <p role="alert" className="text-sm text-red-300">Enter a real date.</p>}
              {valid && !inRange && (
                <p role="alert" className="text-sm text-red-300">The date must fall between September and November {year}.</p>
              )}
              {farWarning && (
                <p className="text-sm text-amber-300 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  This is {drift} days from the third Wednesday in October ({fmt(fallback)}). Please check it is right.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p>Set the {formatMasonicYear(year)} Installation to <strong className="text-gold">{fmt(draft)}</strong>?</p>
              {changes.length === 0 ? (
                <p className="text-primary-foreground/70">No offices change hands for {formatMasonicYear(year)} (no new confirmed appointments entered yet).</p>
              ) : (
                <>
                  <p className="text-primary-foreground/80">These offices will change hands:</p>
                  <ul className="space-y-1.5">
                    {changes.map((c) => (
                      <li key={c.position} className="border-t border-gold/10 pt-1.5 break-words">
                        <span className="text-gold">{labelFor(c.position)}</span>: {c.from ? nameOf(c.from) : "vacant"} → {nameOf(c.to)}
                        {c.effective !== draft && <span className="block text-xs text-primary-foreground/60">From {fmt(c.effective)} (later appointment date)</span>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            {confirming ? (
              <>
                <Button variant="ghost" className="min-h-[44px]" onClick={() => setConfirming(false)}>Back</Button>
                <Button className="bg-gold text-navy hover:bg-gold/90 min-h-[44px]" disabled={saving} onClick={save}>
                  {saving ? "Saving…" : "Confirm"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="min-h-[44px]" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-gold text-navy hover:bg-gold/90 min-h-[44px]" disabled={!inRange} onClick={() => setConfirming(true)}>
                  Continue
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
