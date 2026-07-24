import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday,
  startOfMonth, startOfWeek,
} from "date-fns";
import {
  Calendar, ChevronDown, ChevronLeft, ChevronRight, Copy, ExternalLink,
  Info, Loader2, Monitor, Smartphone,
} from "lucide-react";
import MembersLayout from "@/components/members/MembersLayout";
import ProtectedRoute from "@/components/members/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function getPlatformHint(): "apple" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua)) return "apple";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

type CalEvent = {
  id: string;
  title: string;
  kind: "meeting" | "social" | "officers" | "loi" | "other";
  start: Date;
  end?: Date;
  location?: string;
  description?: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const KIND_STYLES: Record<CalEvent["kind"], { dot: string; pill: string; label: string }> = {
  meeting:  { dot: "bg-gold",       pill: "bg-gold/20 text-gold border-gold/40",           label: "Meeting" },
  social:   { dot: "bg-emerald-400",pill: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40", label: "Social" },
  officers: { dot: "bg-purple-400", pill: "bg-purple-500/15 text-purple-200 border-purple-500/40",   label: "Officers Night" },
  loi:      { dot: "bg-sky-400",    pill: "bg-sky-500/15 text-sky-200 border-sky-500/40",   label: "LOI" },
  other:    { dot: "bg-primary-foreground/60", pill: "bg-white/10 text-primary-foreground/80 border-white/20", label: "Other" },
};

function classify(rawTitle: string): { kind: CalEvent["kind"]; clean: string } {
  const t = rawTitle.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith("meeting:")) return { kind: "meeting", clean: t.slice(8).trim() };
  if (lower.startsWith("social:")) return { kind: "social", clean: t.slice(7).trim() };
  if (lower.startsWith("officers night:")) return { kind: "officers", clean: t.slice(15).trim() };
  if (lower.startsWith("loi:")) return { kind: "loi", clean: t.slice(4).trim() };
  return { kind: "other", clean: t };
}

/** Minimal ICS parser sufficient for our feed (VEVENT blocks only). */
function parseICS(ics: string): CalEvent[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const events: CalEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur) {
        const start = parseICSDate(cur.DTSTART);
        const end = cur.DTEND ? parseICSDate(cur.DTEND) : undefined;
        const rawTitle = unescapeICS(cur.SUMMARY ?? "(untitled)");
        const { kind, clean } = classify(rawTitle);
        events.push({
          id: cur.UID ?? `${start.toISOString()}-${rawTitle}`,
          title: clean,
          kind,
          start,
          end,
          location: cur.LOCATION ? unescapeICS(cur.LOCATION) : undefined,
          description: cur.DESCRIPTION ? unescapeICS(cur.DESCRIPTION) : undefined,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const keyRaw = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = keyRaw.split(";")[0];
    cur[key] = value;
  }
  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function parseICSDate(v: string): Date {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return new Date(v);
  const [_, Y, Mo, D, H, Mi, S, Z] = m;
  if (Z === "Z") return new Date(Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S));
  return new Date(+Y, +Mo - 1, +D, +H, +Mi, +S);
}
function unescapeICS(v: string): string {
  return v.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function Inner() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(new Date());

  const tokenQ = useQuery({
    queryKey: ["member-calendar-token", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_calendar_tokens")
        .select("token")
        .eq("member_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as { token: string } | null)?.token ?? null;
    },
  });

  const feedUrl = useMemo(() => {
    if (!tokenQ.data) return null;
    return `${SUPABASE_URL}/functions/v1/member-calendar-feed?token=${tokenQ.data}`;
  }, [tokenQ.data]);
  const webcalUrl = useMemo(() => {
    if (!feedUrl) return null;
    return feedUrl.replace(/^https?:\/\//, "webcal://");
  }, [feedUrl]);

  const eventsQ = useQuery({
    queryKey: ["member-calendar-feed", tokenQ.data],
    enabled: !!feedUrl,
    queryFn: async () => {
      const res = await fetch(feedUrl!, { cache: "no-store" });
      if (!res.ok) throw new Error(`Feed failed: ${res.status}`);
      const text = await res.text();
      return parseICS(text);
    },
  });

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of eventsQ.data ?? []) {
      const key = format(ev.start, "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [eventsQ.data]);

  const selectedEvents = selected
    ? eventsByDay.get(format(selected, "yyyy-MM-dd")) ?? []
    : [];

  const copyUrl = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success("Copied — paste into your calendar app");
    } catch {
      toast.error("Copy failed — long-press to select");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-primary-foreground">Member Calendar</h1>
          <p className="text-xs text-primary-foreground/60 mt-1">
            All lodge meetings, festive boards, ad-hoc socials and Thursday LOIs — live.
          </p>
        </div>
        <SubscribePanel webcalUrl={webcalUrl} feedUrl={feedUrl} onCopy={copyUrl} loading={tokenQ.isLoading} />
      </div>

      <div className="rounded-sm border border-gold/30 bg-navy-dark/60 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gold/40 bg-transparent text-primary-foreground hover:bg-navy hover:text-gold"
              onClick={() => setCursor((c) => addMonths(c, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gold/40 bg-transparent text-primary-foreground hover:bg-navy hover:text-gold"
              onClick={() => { const t = new Date(); setCursor(startOfMonth(t)); setSelected(t); }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gold/40 bg-transparent text-primary-foreground hover:bg-navy hover:text-gold"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h2 className="font-serif text-gold text-lg">{format(cursor, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-3 text-[11px] text-primary-foreground/60">
            {(["meeting", "social", "officers", "loi"] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${KIND_STYLES[k].dot}`} />
                {KIND_STYLES[k].label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gold/10 rounded-sm overflow-hidden">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="bg-navy-dark px-2 py-1.5 text-[11px] uppercase tracking-widest text-primary-foreground/50">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, cursor);
            const today = isToday(day);
            const isSel = selected && isSameDay(selected, day);
            return (
              <button
                key={key}
                onClick={() => setSelected(day)}
                className={`bg-navy-dark min-h-[92px] text-left p-1.5 transition-colors ${
                  inMonth ? "" : "opacity-40"
                } ${isSel ? "ring-1 ring-gold/70 ring-inset" : ""} hover:bg-navy`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${today ? "bg-gold text-navy w-6 h-6 rounded-full inline-flex items-center justify-center" : "text-primary-foreground/80"}`}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-[10px] leading-tight truncate px-1 py-0.5 rounded border ${KIND_STYLES[ev.kind].pill}`}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-primary-foreground/50">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {eventsQ.isLoading && (
          <div className="flex items-center justify-center pt-4 text-primary-foreground/60 text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading events…
          </div>
        )}
        {eventsQ.isError && (
          <p className="text-sm text-red-300 pt-3">Could not load the calendar feed. Please refresh.</p>
        )}
      </div>

      {selected && (
        <div className="rounded-sm border border-gold/20 bg-navy-dark/40 p-4">
          <h3 className="font-serif text-gold mb-3">{format(selected, "EEEE d MMMM yyyy")}</h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-primary-foreground/50 italic">No events on this day.</p>
          ) : (
            <ul className="space-y-3">
              {selectedEvents.map((ev) => (
                <li key={ev.id} className="border-l-2 pl-3" style={{ borderColor: "currentColor" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${KIND_STYLES[ev.kind].pill}`}>
                      {KIND_STYLES[ev.kind].label}
                    </span>
                    <span className="text-primary-foreground font-medium">{ev.title}</span>
                  </div>
                  <p className="text-xs text-primary-foreground/60 mt-1">
                    {format(ev.start, "HH:mm")}{ev.end ? ` – ${format(ev.end, "HH:mm")}` : ""}
                    {ev.location ? ` • ${ev.location}` : ""}
                  </p>
                  {ev.description && (
                    <p className="text-xs text-primary-foreground/70 mt-1 whitespace-pre-wrap">{ev.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SubscribePanel({
  webcalUrl, feedUrl, onCopy, loading,
}: {
  webcalUrl: string | null; feedUrl: string | null;
  onCopy: (v: string) => void; loading: boolean;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const platform = useMemo(getPlatformHint, []);

  if (loading) {
    return <div className="text-xs text-primary-foreground/50"><Loader2 className="w-3 h-3 animate-spin inline mr-1"/>Preparing your subscription…</div>;
  }
  if (!webcalUrl || !feedUrl) return null;

  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;
  const isApple = platform === "apple";

  return (
    <div className="rounded-sm border border-gold/30 bg-navy-dark/60 p-3 max-w-md w-full">
      <p className="text-xs text-primary-foreground/80 mb-3">
        <strong className="text-gold">Subscribe once</strong> — the feed will keep itself up to date on every device.
      </p>

      <div className="flex flex-col gap-2">
        {isApple ? (
          <>
            <Button asChild size="sm" className="bg-gold text-navy hover:bg-gold/90 justify-start">
              <a href={webcalUrl}>
                <Calendar className="w-3.5 h-3.5 mr-2" /> Open in Apple Calendar / Outlook
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-gold/40 bg-transparent text-primary-foreground hover:bg-navy hover:text-gold justify-start">
              <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                <Smartphone className="w-3.5 h-3.5 mr-2" /> Add to Google Calendar
              </a>
            </Button>
          </>
        ) : (
          <>
            <Button asChild size="sm" className="bg-gold text-navy hover:bg-gold/90 justify-start">
              <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                <Smartphone className="w-3.5 h-3.5 mr-2" /> Add to Google Calendar
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-gold/40 bg-transparent text-primary-foreground hover:bg-navy hover:text-gold justify-start">
              <a href={webcalUrl}>
                <Monitor className="w-3.5 h-3.5 mr-2" /> Apple Calendar / Outlook desktop
              </a>
            </Button>
          </>
        )}

        <Button
          size="sm" variant="outline"
          className="border-gold/40 bg-transparent text-primary-foreground hover:bg-navy hover:text-gold justify-start"
          onClick={() => onCopy(feedUrl)}
        >
          <Copy className="w-3.5 h-3.5 mr-2" /> Copy subscription URL
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setShowHelp((s) => !s)}
        className="mt-3 flex items-center text-[11px] text-gold hover:text-gold/80 transition-colors"
        aria-expanded={showHelp}
      >
        <Info className="w-3 h-3 mr-1" />
        How to subscribe manually
        <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showHelp ? "rotate-180" : ""}`} />
      </button>

      {showHelp && (
        <div className="mt-2 rounded-sm border border-gold/20 bg-navy/50 p-3 space-y-3 text-[11px] text-primary-foreground/80">
          <div>
            <p className="font-semibold text-gold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Apple (iPhone / iPad / Mac)</p>
            <p>Copy the link, then open the Calendar app → Calendars → Add Calendar → Add Subscription Calendar, and paste the URL.</p>
          </div>
          <div>
            <p className="font-semibold text-gold mb-1 flex items-center gap-1"><Smartphone className="w-3 h-3" /> Google Calendar (Android / web)</p>
            <p>Tap "Add to Google Calendar" above, or open Google Calendar in a browser → Other calendars → Add by URL, and paste the link.</p>
          </div>
          <div>
            <p className="font-semibold text-gold mb-1 flex items-center gap-1"><Monitor className="w-3 h-3" /> Outlook (web / desktop)</p>
            <p>Add calendar → Subscribe from web → paste the URL. The "Apple Calendar / Outlook desktop" button may also open Outlook directly on Windows.</p>
          </div>
          <p className="text-primary-foreground/50 italic">
            Keep this link private — it's unique to you.
          </p>
        </div>
      )}
    </div>
  );
}

export default function MemberCalendarPage() {
  return (
    <ProtectedRoute>
      <MembersLayout>
        <Inner />
      </MembersLayout>
    </ProtectedRoute>
  );
}
