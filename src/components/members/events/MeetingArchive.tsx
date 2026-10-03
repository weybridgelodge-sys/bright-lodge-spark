import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArchiveRestore, CalendarDays, Copy, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchEventBundle, type EventBundle, type LodgeEvent } from "@/lib/lodgeEvents";

export type ArchiveTarget = { event: LodgeEvent; mode: "archive" | "restore" | "delete"; bookings: number };

const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" });

export function ArchiveConfirmDialog({ target, busy, onCancel, onConfirm }: {
  target: ArchiveTarget | null; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const e = target?.event;
  const isFuture = !!e && new Date(e.event_date).getTime() >= Date.now();
  const risky = !!e && target!.mode !== "restore" && (e.published || isFuture || target!.bookings > 0);
  const verb = target?.mode === "delete" ? "Delete" : target?.mode === "archive" ? "Archive" : "Restore";

  return (
    <AlertDialog open={!!target} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <AlertDialogContent className="bg-navy border-gold/30 text-cream max-w-[calc(100vw-1.5rem)] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gold font-serif">{verb} this meeting?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-cream/80 break-words">
              <p><strong className="text-cream">{e?.title}</strong>{e ? ` — ${fmtDate(e.event_date)}` : ""}</p>
              {target?.mode === "archive" && (
                <p>Nothing about the meeting is changed or deleted. Its text, menu and dining options stay available in the Archived section, and its bookings, attendance and accounts stay where they are.</p>
              )}
              {target?.mode === "restore" && (
                <p>The meeting returns to the main list with its previous Draft or Published setting. If it is published and upcoming, it will reappear on the public site.</p>
              )}
              {target?.mode === "delete" && <p>This cannot be undone.</p>}
              {risky && (
                <div role="alert" className="border border-gold/50 bg-gold/10 rounded-sm p-3 text-cream">
                  <p className="font-semibold text-gold mb-1">Please check before continuing</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {e!.published && <li>It is <strong>published</strong>: it will disappear from the public Bookings page, the public events pages and calendar, and the members' calendar feed.</li>}
                    {isFuture && <li>It is <strong>in the future</strong>: it will stop counting as the next meeting and no booking-deadline reminders will be sent.</li>}
                    <li>{target!.bookings} booking{target!.bookings === 1 ? "" : "s"} recorded for it{target!.mode === "archive" ? " (these are kept)" : ""}.</li>
                  </ul>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={busy} className="min-h-11 bg-transparent border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={(ev) => { ev.preventDefault(); onConfirm(); }}
            className={`min-h-11 ${target?.mode === "delete" ? "bg-red-600 hover:bg-red-700 text-cream" : "bg-gold text-navy-dark hover:bg-gold/90"}`}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{verb}{risky && target?.mode !== "delete" ? " anyway" : ""}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch { toast.error("Could not copy — select the text instead"); }
  };
  return (
    <div className="border border-gold/15 rounded-sm bg-navy-dark/40">
      <div className="flex items-center justify-between gap-2 px-3 pt-1">
        <h3 className="text-xs uppercase tracking-wider text-gold">{label}</h3>
        <button type="button" onClick={copy} disabled={!text} className="inline-flex items-center gap-1 min-h-11 min-w-11 px-2 text-xs text-gold hover:underline disabled:opacity-40" aria-label={`Copy ${label}`}>
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>
      </div>
      <pre className="px-3 pb-3 font-sans text-sm text-cream/90 whitespace-pre-wrap break-words select-text">{text || "—"}</pre>
    </div>
  );
}

export function ArchivedMeetingCard({ event, onRestore, onDelete }: { event: LodgeEvent; onRestore: () => void; onDelete: () => void }) {
  const [bundle, setBundle] = useState<EventBundle | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || bundle) return;
    fetchEventBundle(event.id).then(setBundle);
  }, [open, bundle, event.id]);

  const useful = bundle ? [
    ["Tyling", bundle.event.tyling_time], ["Dining", bundle.event.dining_time],
    ["Location", bundle.event.location], ["Dress code", bundle.event.dress_code],
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n") : "";
  const menu = bundle?.courses.map((c) => [c.course_label, c.dish].filter(Boolean).join(": ") + (c.description ? `\n  ${c.description}` : "")).join("\n") ?? "";
  const dining = bundle?.diningOptions.map((o) => `${o.label} — £${(o.price_pence / 100).toFixed(2)}${o.is_default ? " (default)" : ""}`).join("\n") ?? "";

  const btn = "inline-flex items-center justify-center gap-1.5 min-h-[48px] min-w-11 px-3 rounded-sm border text-sm";
  return (
    <article className="bg-navy-dark/60 border border-gold/15 rounded-sm p-4 space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base text-cream break-words">{event.title}</p>
          <p className="text-xs text-gold flex items-center gap-1.5 mt-1"><CalendarDays className="w-3 h-3 shrink-0" />{fmtDate(event.event_date)}</p>
          {event.archived_at && <p className="text-[11px] text-cream/50 mt-1">Archived {new Date(event.archived_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}</p>}
        </div>
        <div className="flex w-full gap-3 sm:w-auto sm:shrink-0">
          <button type="button" onClick={onRestore} className={`${btn} flex-1 border-gold/40 text-gold hover:bg-gold/15 sm:flex-none`} aria-label={`Restore ${event.title}`}>
            <ArchiveRestore className="w-4 h-4" /> Restore
          </button>
          <button type="button" onClick={onDelete} className={`${btn} flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 sm:flex-none`} aria-label={`Delete ${event.title}`}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="min-h-11 text-sm text-gold hover:underline">
        {open ? "Hide content" : "Show content (intro, useful stuff, menu, dining options)"}
      </button>
      {open && (!bundle ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-gold animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          <CopyBlock label="Heading" text={bundle.event.intro_heading || bundle.event.title} />
          <CopyBlock label="Intro" text={bundle.event.intro} />
          <CopyBlock label="The useful stuff" text={useful} />
          <CopyBlock label="Festive Board menu" text={menu} />
          <CopyBlock label="Dining options" text={dining} />
        </div>
      ))}
    </article>
  );
}
