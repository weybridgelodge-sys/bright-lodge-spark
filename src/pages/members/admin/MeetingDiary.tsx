// KPI dashboard / Members — Installation rule and meeting diary (Admin / current Secretary).
// Reuses installation_rule_settings, officer_installation_dates and the
// festive_board_meetings register; every write is audited by DB triggers.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/hooks/useAuth";
import { useInitialLoading } from "@/hooks/useInitialLoading";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fieldCls, fieldLabelCls, fieldHintCls } from "@/lib/fieldStyle";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ruleDateFor, getMasonicYear, localIsoDate, loadInstallationConfig, formatRangeDate,
  type InstallationConfig, type InstallationRule,
} from "@/lib/masonicYear";
import {
  MONTHS, WEEKDAYS, ORDINALS, planMove, inferSchedule, planSchedule, outsideSchedule, oneOffMeetings, SCHEDULED_TYPES, dependencyWarnings, installationEffect,
  type DiaryMeeting, type Dependencies, type MeetingType, type Ordinal, type ScheduleMonth,
} from "@/lib/meetingDiary";

type RuleRow = InstallationRule & {
  id?: string; unit_number: string | null; default_venue: string | null; election_month: number | null;
  ritual: string | null; consecration_date: string | null;
};
type Meeting = DiaryMeeting & { status: string; notes: string | null; cancel_reason: string | null; series_id: string | null };
type Series = { id: string; name: string; meeting_type: MeetingType; ordinal: Ordinal | null; weekday: number | null; months: number[]; active: boolean; schedule: unknown };
type Audit = { id: string; action: string; target_table: string; created_at: string; actor: string | null };

const TYPES: { value: MeetingType; label: string }[] = [
  { value: "regular", label: "Regular" }, { value: "installation", label: "Installation" }, { value: "emergency", label: "Emergency" }, { value: "dispensation", label: "Dispensation" },
];
const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t;
const selectCls = `mt-1 ${fieldCls}`;
const labelCls = fieldLabelCls;
const card = "rounded-sm border border-gold/20 bg-navy-light/30 p-3 sm:p-4 min-w-0";
const fmt = (iso: string) => formatRangeDate(iso);
const tableLabel: Record<string, string> = {
  installation_rule_settings: "Installation rule", officer_installation_dates: "Installation date",
  festive_board_meetings: "Meeting", meeting_series: "Meeting series",
};

const blankRule = (): RuleRow => ({
  mode: "weekday_rule", installation_month: 10, installation_ordinal: "3", installation_weekday: 3, fixed_day: null,
  applies_from_year: null, unit_number: null, default_venue: null, election_month: null, ritual: null, consecration_date: null,
});


function KpiEffect({ cfg, year, date }: { cfg: InstallationConfig; year: number; date: string | null }) {
  const e = installationEffect(cfg, year, date);
  const line = (r: { start: string; end: string | null } | null) => (r ? `${fmt(r.start)} to ${r.end ? fmt(r.end) : "not yet known"}` : "not known");
  return (
    <div className="rounded-sm border border-gold/30 p-3 text-sm space-y-1 break-words" data-testid="kpi-effect">
      <p className="text-gold">Effect on the KPI Masonic year</p>
      <p><span className="text-cream/70">{year - 1}/{year}:</span> {line(e.before.previous)} → <strong>{line(e.after.previous)}</strong></p>
      <p><span className="text-cream/70">{year}/{year + 1}:</span> {line(e.before.next)} → <strong>{line(e.after.next)}</strong></p>
    </div>
  );
}

function Inner() {
  const { isAdmin, isSecretary, isCurrentSecretary } = useAuth();
  const allowed = isAdmin || isSecretary || isCurrentSecretary;
  const [loading, setLoading] = useInitialLoading();
  const [rule, setRule] = useState<RuleRow>(blankRule);
  const [cfg, setCfg] = useState<InstallationConfig>({ rule: null, stored: {} });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [busy, setBusy] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const load = async () => {
    setLoading(true);
    const [r, m, s, a, c] = await Promise.all([
      (supabase.from as any)("installation_rule_settings").select("*").maybeSingle(),
      (supabase.from as any)("festive_board_meetings").select("id,meeting_date,meeting_type,status,notes,cancelled_at,cancel_reason,series_id").order("meeting_date"),
      (supabase.from as any)("meeting_series").select("*").order("created_at"),
      (supabase.from as any)("meeting_diary_audit").select("id,action,target_table,created_at,actor").order("created_at", { ascending: false }).limit(15),
      loadInstallationConfig(),
    ]);
    if (r.data) setRule({ ...blankRule(), ...r.data });
    setMeetings((m.data as Meeting[]) ?? []);
    setSeries((s.data as Series[]) ?? []);
    setAudit((a.data as Audit[]) ?? []);
    setCfg(c);
    setLoading(false);
  };
  useEffect(() => { if (allowed) load(); }, [allowed]);

  // ---- Installation rule ----
  const thisYear = Number(localIsoDate().slice(0, 4));
  const preview = useMemo(() => {
    const draft: InstallationConfig = { rule, stored: cfg.stored };
    const out: { year: number; date: string | null; stored: boolean }[] = [];
    for (let y = thisYear; out.length < 3 && y < thisYear + 6; y++) {
      const d = draft.stored[y] ?? ruleDateFor(y, rule);
      if (d && d >= localIsoDate()) out.push({ year: y, date: d, stored: !!draft.stored[y] });
    }
    return out;
  }, [rule, cfg, thisYear]);

  const saveRule = async () => {
    if (busy) return;
    setBusy(true);
    const { id, ...fields } = rule as RuleRow & { id?: string; unit_id?: string; created_at?: string; updated_at?: string };
    const payload: Record<string, unknown> = {
      mode: fields.mode, installation_month: fields.installation_month,
      installation_ordinal: fields.mode === "weekday_rule" ? fields.installation_ordinal : null,
      installation_weekday: fields.mode === "weekday_rule" ? fields.installation_weekday : null,
      fixed_day: fields.mode === "fixed_date" ? fields.fixed_day : null,
      applies_from_year: fields.applies_from_year || null,
      unit_number: fields.unit_number || null, default_venue: fields.default_venue || null,
      election_month: fields.election_month || null, ritual: fields.ritual || null, consecration_date: fields.consecration_date || null,
      updated_at: new Date().toISOString(),
    };
    const q = id
      ? (supabase.from as any)("installation_rule_settings").update(payload).eq("id", id)
      : (supabase.from as any)("installation_rule_settings").insert(payload);
    const { error } = await q;
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Installation rule saved");
    load();
  };

  // ---- Stored override ----
  const [ovOpen, setOvOpen] = useState(false);
  const [ovYear, setOvYear] = useState(thisYear);
  const [ovDate, setOvDate] = useState("");
  const ovValid = /^\d{4}-\d{2}-\d{2}$/.test(ovDate) && Number(ovDate.slice(0, 4)) === ovYear;
  const saveOverride = async (clear: boolean) => {
    if (busy) return;
    setBusy(true);
    const { error } = clear
      ? await (supabase.from as any)("officer_installation_dates").delete().eq("lodge_year", ovYear)
      : await (supabase.from as any)("officer_installation_dates").upsert({ lodge_year: ovYear, installation_date: ovDate, updated_at: new Date().toISOString() }, { onConflict: "lodge_year" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(clear ? `Stored date for ${ovYear} cleared` : `Installation ${ovYear} set to ${fmt(ovDate)}`);
    setOvOpen(false);
    load();
  };

  // ---- Meeting actions ----
  const [action, setAction] = useState<null | { kind: "move" | "drop" | "add"; meeting?: Meeting }>(null);
  const [deps, setDeps] = useState<Dependencies | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState<MeetingType>("regular");
  const [notes, setNotes] = useState("");
  const openAction = async (kind: "move" | "drop" | "add", meeting?: Meeting) => {
    setAction({ kind, meeting }); setDeps(null); setNotes("");
    setNewDate(meeting?.meeting_date ?? ""); setNewType("regular");
    if (meeting) {
      const { data } = await supabase.rpc("meeting_dependencies" as any, { _meeting_id: meeting.id } as any);
      setDeps((data as Dependencies) ?? null);
    }
  };
  const warnings = dependencyWarnings(deps);
  const movePlan = action?.kind === "move" && action.meeting ? planMove(meetings, action.meeting.id, newDate) : null;
  const addClash = action?.kind === "add" && meetings.some((m) => !m.cancelled_at && m.meeting_date === newDate);
  const effectFor = action?.kind === "move" && action.meeting?.meeting_type === "installation" && movePlan?.ok
    ? { year: Number(newDate.slice(0, 4)), date: newDate }
    : action?.kind === "add" && newType === "installation" && /^\d{4}-\d{2}-\d{2}$/.test(newDate)
      ? { year: Number(newDate.slice(0, 4)), date: newDate } : null;

  const runAction = async () => {
    if (!action || busy) return;
    setBusy(true);
    let error: any = null;
    if (action.kind === "move" && action.meeting) {
      ({ error } = await supabase.rpc("diary_move_meeting" as any, { _meeting_id: action.meeting.id, _new_date: newDate } as any));
    } else if (action.kind === "drop" && action.meeting) {
      ({ error } = await supabase.rpc("diary_cancel_meeting" as any, { _meeting_id: action.meeting.id, _reason: notes } as any));
    } else if (action.kind === "add") {
      ({ error } = await supabase.rpc("diary_add_meeting" as any, { _date: newDate, _type: newType, _series_id: null, _notes: notes || null } as any));
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(action.kind === "move" ? "Meeting moved" : action.kind === "drop" ? "Meeting cancelled (history kept)" : "Meeting added");
    setAction(null);
    load();
  };
  const restore = async (m: Meeting) => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("diary_restore_meeting" as any, { _meeting_id: m.id } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Meeting restored as a draft");
    load();
  };

  // ---- Per-month schedule ----
  const saved = series.find((x) => x.active && Array.isArray(x.schedule) && x.schedule.length);
  const [sched, setSched] = useState<ScheduleMonth[] | null>(null);
  const schedule = sched ?? (saved?.schedule as ScheduleMonth[] | undefined) ?? inferSchedule(meetings);
  const inferred = !sched && !saved && schedule.length > 0;
  const [sYear, setSYear] = useState(thisYear);
  const startMonth = rule.installation_month || 1;
  const plan = planSchedule(schedule, sYear, startMonth, meetings);
  const toAdd = plan.filter((r) => r.status === "new");
  const outside = outsideSchedule(schedule, meetings);
  const oneOffs = oneOffMeetings(meetings);
  const editMonth = (month: number, p: Partial<ScheduleMonth> | null) => {
    const cur = schedule.filter((x) => x.month !== month);
    const old = schedule.find((x) => x.month === month);
    const next = p === null ? cur : [...cur, { month, ordinal: schedule[0]?.ordinal ?? "1", weekday: schedule[0]?.weekday ?? 1, meeting_type: month === rule.installation_month ? "installation" : "regular", ...old, ...p } as ScheduleMonth];
    setSched(next.sort((x, y) => x.month - y.month));
  };
  const saveSchedule = async () => {
    setBusy(true);
    const payload = { name: "Meeting schedule", schedule, ordinal: schedule[0]?.ordinal ?? "1", weekday: schedule[0]?.weekday ?? 1, months: schedule.map((x) => x.month), active: true };
    const { error } = saved
      ? await (supabase.from as any)("meeting_series").update(payload).eq("id", saved.id)
      : await (supabase.from as any)("meeting_series").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Schedule saved"); setSched(null); load();
  };
  const generate = async () => {
    if (busy || !toAdd.length) return;
    setBusy(true);
    let added = 0;
    for (const r of toAdd) {
      const { error: e } = await supabase.rpc("diary_add_meeting" as any, { _date: r.date, _type: r.meeting_type, _series_id: saved?.id ?? null, _notes: null } as any);
      if (e) { toast.error(`${fmt(r.date)}: ${e.message}`); break; }
      added++;
    }
    setBusy(false);
    toast.success(`${added} meeting${added === 1 ? "" : "s"} added`);
    load();
  };

  if (!allowed) return <MembersLayout><p className="text-cream/70">Only the Secretary and administrators can manage the meeting diary.</p></MembersLayout>;

  const today = localIsoDate();
  const shown = meetings.filter((m) => showPast || m.meeting_date >= today);
  const cur = getMasonicYear(today, cfg);
  const set = (p: Partial<RuleRow>) => setRule((r) => ({ ...r, ...p }));
  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <MembersLayout>
      <header className="mb-4 min-w-0">
        <h1 className="font-serif text-2xl md:text-3xl text-gold break-words">Installation rule and meeting diary</h1>
        <p className="text-cream/70 text-sm">
          The installation rule sets when officers change and the Masonic year used by KPIs. The financial year (1 Oct to 30 Sep) is separate.
          {cur && <> Current Masonic year: <strong className="text-gold">{cur.label}</strong> ({fmt(cur.start)} to {cur.end ? fmt(cur.end) : "next Installation"}).</>}
        </p>
      </header>
      {loading ? <p className="text-cream/70">Loading…</p> : (
      <div className="space-y-5 min-w-0">
        <section className={card} aria-labelledby="rule-h">
          <h2 id="rule-h" className="font-serif text-gold text-lg mb-3">Installation rule</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelCls}>Rule type
              <select className={selectCls} value={rule.mode} onChange={(e) => set({ mode: e.target.value as RuleRow["mode"] })}>
                <option value="weekday_rule">Weekday of the month (e.g. 3rd Wednesday)</option>
                <option value="fixed_date">Fixed date</option>
              </select>
            </label>
            <label className={labelCls}>Month
              <select className={selectCls} value={rule.installation_month} onChange={(e) => set({ installation_month: Number(e.target.value) })}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
            {rule.mode === "weekday_rule" ? (<>
              <label className={labelCls}>Which week
                <select className={selectCls} value={rule.installation_ordinal ?? "3"} onChange={(e) => set({ installation_ordinal: e.target.value as Ordinal })}>
                  {ORDINALS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className={labelCls}>Weekday
                <select className={selectCls} value={rule.installation_weekday ?? 3} onChange={(e) => set({ installation_weekday: Number(e.target.value) })}>
                  {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
                </select>
              </label>
            </>) : (
              <label className={labelCls}>Day of month
                <Input type="number" min={1} max={31} className={`mt-1 ${fieldCls}`} value={rule.fixed_day ?? ""} onChange={(e) => set({ fixed_day: num(e.target.value) })} />
              </label>
            )}
            <label className={labelCls}>Applies from year (optional)
              <Input type="number" className={`mt-1 ${fieldCls}`} value={rule.applies_from_year ?? ""} onChange={(e) => set({ applies_from_year: num(e.target.value) })} />
            </label>
          </div>
          <div className="mt-3 text-sm" aria-live="polite">
            <p className="text-gold/90">Next three Installations</p>
            <ul className="mt-1 space-y-1" data-testid="rule-preview">
              {preview.length ? preview.map((p) => (
                <li key={p.year} className="break-words">{p.year}: {p.date ? fmt(p.date) : "no date"}{p.stored && <span className="text-cream/60 text-xs"> (stored date)</span>}</li>
              )) : <li className="text-cream/70">No dates — check the rule.</li>}
            </ul>
          </div>

          <h3 className="font-serif text-gold mt-4 mb-2">Unit details (Year Book)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelCls}>Unit number
              <Input className={`mt-1 ${fieldCls}`} placeholder="e.g. 6787" value={rule.unit_number ?? ""} onChange={(e) => set({ unit_number: e.target.value })} />
            </label>
            <label className={labelCls}>Usual venue
              <Input className={`mt-1 ${fieldCls}`} placeholder="e.g. South West Surrey Masonic Centre" value={rule.default_venue ?? ""} onChange={(e) => set({ default_venue: e.target.value })} />
            </label>
            <label className={labelCls}>Election month
              <select className={selectCls} value={rule.election_month ?? ""} onChange={(e) => set({ election_month: num(e.target.value) })}>
                <option value="">Not set</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <label className={labelCls}>Ritual
              <Input className={`mt-1 ${fieldCls}`} placeholder="e.g. Emulation" value={rule.ritual ?? ""} onChange={(e) => set({ ritual: e.target.value })} />
            </label>
            <label className={labelCls}>Consecration date
              <Input type="date" aria-describedby="consecration-hint" className={`mt-1 ${fieldCls}`} value={rule.consecration_date ?? ""} onChange={(e) => set({ consecration_date: e.target.value || null })} />
              <span id="consecration-hint" className={fieldHintCls}>Format dd/mm/yyyy</span>
            </label>
          </div>
          <Button className="mt-4 min-h-[44px] bg-gold text-navy hover:bg-gold/90" disabled={busy} onClick={saveRule}>Save rule and details</Button>
        </section>

        <section className={card} aria-labelledby="ov-h">
          <h2 id="ov-h" className="font-serif text-gold text-lg mb-2">Stored Installation dates</h2>
          <p className="text-sm text-cream/70 mb-2">A stored date overrides the rule for that year.</p>
          <ul className="space-y-1 text-sm mb-3">
            {Object.entries(cfg.stored).sort().map(([y, d]) => <li key={y} className="break-words">{y}: {fmt(d)}</li>)}
            {!Object.keys(cfg.stored).length && <li className="text-cream/70">None stored.</li>}
          </ul>
          <Button variant="outline" className="min-h-[44px] border-gold/50 text-gold bg-transparent hover:bg-gold/10"
            onClick={() => { setOvYear(thisYear); setOvDate(cfg.stored[thisYear] ?? ruleDateFor(thisYear, cfg.rule) ?? ""); setOvOpen(true); }}>
            Set or clear a stored date
          </Button>
        </section>

        <section className={card} aria-labelledby="mt-h">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 id="mt-h" className="font-serif text-gold text-lg">Meetings</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="min-h-[44px] border-gold/50 text-gold bg-transparent hover:bg-gold/10" onClick={() => setShowPast((v) => !v)}>
                {showPast ? "Hide past" : "Show past"}
              </Button>
              <Button className="min-h-[44px] bg-gold text-navy hover:bg-gold/90" onClick={() => openAction("add")}>Add meeting</Button>
            </div>
          </div>
          <ul className="space-y-2" data-testid="diary-meetings">
            {shown.map((m) => (
              <li key={m.id} className="rounded-sm border border-gold/15 p-3 flex flex-wrap items-center gap-2 justify-between min-w-0">
                <div className="min-w-0">
                  <p className={`text-cream break-words ${m.cancelled_at ? "line-through opacity-70" : ""}`}>{fmt(m.meeting_date)}</p>
                  <p className="text-xs text-cream/70 break-words">
                    {typeLabel(m.meeting_type)} · {m.cancelled_at ? `Cancelled${m.cancel_reason ? `: ${m.cancel_reason}` : ""}` : m.status}
                    {m.series_id && " · series"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.cancelled_at ? (
                    <Button variant="outline" className="min-h-[44px] border-gold/50 text-gold bg-transparent hover:bg-gold/10" disabled={busy} onClick={() => restore(m)}>Restore</Button>
                  ) : (<>
                    <Button variant="outline" className="min-h-[44px] border-gold/50 text-gold bg-transparent hover:bg-gold/10" onClick={() => openAction("move", m)}>Move</Button>
                    <Button variant="outline" className="min-h-[44px] border-destructive/60 text-destructive-foreground bg-transparent hover:bg-destructive/20" onClick={() => openAction("drop", m)}>Drop</Button>
                  </>)}
                </div>
              </li>
            ))}
            {!shown.length && <li className="text-sm text-cream/70">No meetings in the diary.</li>}
          </ul>
        </section>

        <section className={card} aria-labelledby="sr-h">
          <h2 id="sr-h" className="font-serif text-gold text-lg mb-2">Meeting schedule by month</h2>
          <p className="text-sm text-cream/80 mb-3">
            {inferred ? "Read from the meetings already in the diary. Check it, then save." : schedule.length ? "Tick each month the unit meets and choose its week and weekday." : "Nothing ticked yet. Tick each month the unit meets."}
            {" "}Dated meetings can still be moved or dropped one by one.
          </p>
          <fieldset>
            <legend className="sr-only">Months the unit meets</legend>
            <ul className="space-y-2">
              {MONTHS.map((name, i) => {
                const month = i + 1; const row = schedule.find((x) => x.month === month); const id = `meets-${month}`;
                return (
                  <li key={name} className="rounded-sm border border-gold/20 p-2 min-w-0">
                    <label htmlFor={id} className="flex min-h-[44px] items-center gap-3 text-cream text-sm">
                      <input id={id} type="checkbox" className="h-5 w-5 accent-gold" checked={!!row} onChange={(e) => editMonth(month, e.target.checked ? {} : null)} />
                      <span>{name}{month === rule.installation_month && <span className="text-gold"> (Installation month)</span>}</span>
                    </label>
                    {row && (
                      <div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-3">
                        <label className={labelCls}>Week
                          <select aria-label={`${name} week`} className={selectCls} value={row.ordinal} onChange={(e) => editMonth(month, { ordinal: e.target.value as Ordinal })}>
                            {ORDINALS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </label>
                        <label className={labelCls}>Weekday
                          <select aria-label={`${name} weekday`} className={selectCls} value={row.weekday} onChange={(e) => editMonth(month, { weekday: Number(e.target.value) })}>
                            {WEEKDAYS.map((w, j) => <option key={w} value={j}>{w}</option>)}
                          </select>
                        </label>
                        <label className={labelCls}>Type
                          <select aria-label={`${name} meeting type`} className={selectCls} value={row.meeting_type} onChange={(e) => editMonth(month, { meeting_type: e.target.value as MeetingType })}>
                            {TYPES.filter((t) => SCHEDULED_TYPES.includes(t.value)).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </label>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <Button variant="outline" className="mt-3 min-h-[44px] border-gold/70 text-gold bg-transparent hover:bg-gold/10" disabled={busy || (!sched && !!saved)} onClick={saveSchedule}>Save schedule</Button>

          <label className={`${labelCls} mt-4`}>Season starting in
            <Input type="number" className={`mt-1 ${fieldCls}`} value={sYear} onChange={(e) => setSYear(Number(e.target.value) || thisYear)} />
            <span className={fieldHintCls}>Season runs from {MONTHS[startMonth - 1]} {sYear} to the month before {MONTHS[startMonth - 1]} {sYear + 1}.</span>
          </label>
          <ul className="mt-3 text-sm space-y-1" data-testid="series-preview" aria-live="polite">
            {!plan.length && <li className="text-cream/80">No months ticked, so no dates.</li>}
            {plan.map((r) => (
              <li key={r.date} className="break-words text-cream">
                {fmt(r.date)} · {typeLabel(r.meeting_type)} · <strong>{r.status === "existing" ? "Already in diary (skipped)" : r.status === "moved" ? `Moved from rule: diary has ${fmt(r.existingDate!)} (skipped)` : "New"}</strong>
                {r.warning && <span className="block text-gold">Warning: {r.warning}</span>}
              </li>
            ))}
          </ul>
          {!!outside.length && (
            <div className="mt-3 text-sm" data-testid="outside-schedule">
              <p className="text-gold">Outside schedule (kept as they are):</p>
              <ul className="space-y-1">{outside.map((o) => <li key={o.id} className="text-cream break-words">{fmt(o.meeting_date)} · {typeLabel(o.meeting_type)} · {(o as Meeting).status}</li>)}</ul>
            </div>
          )}
          {!!oneOffs.length && (
            <div className="mt-3 text-sm" data-testid="one-off-meetings">
              <p className="text-gold">One-off meetings (not part of the schedule):</p>
              <ul className="space-y-1">{oneOffs.map((o) => <li key={o.id} className="text-cream break-words">{fmt(o.meeting_date)} · {typeLabel(o.meeting_type)} · One-off{(o as Meeting).notes ? ` · ${(o as Meeting).notes}` : ""}</li>)}</ul>
            </div>
          )}
          <Button className="mt-3 min-h-[44px] bg-gold text-navy hover:bg-gold/90" disabled={busy || !toAdd.length} onClick={generate}>
            {toAdd.length ? `Add ${toAdd.length} new meeting${toAdd.length === 1 ? "" : "s"}` : "No new meetings to add"}
          </Button>
        </section>

        <section className={card} aria-labelledby="au-h">
          <h2 id="au-h" className="font-serif text-gold text-lg mb-2">Recent changes</h2>
          <ul className="text-sm space-y-1">
            {audit.map((a) => (
              <li key={a.id} className="break-words">{new Date(a.created_at).toLocaleString("en-GB")}: {tableLabel[a.target_table] ?? a.target_table} {a.action === "insert" ? "added" : a.action === "delete" ? "removed" : "changed"}</li>
            ))}
            {!audit.length && <li className="text-cream/70">No changes yet.</li>}
          </ul>
        </section>
      </div>)}

      <Dialog open={ovOpen} onOpenChange={(o) => !busy && setOvOpen(o)}>
        <DialogContent className="bg-navy border-gold/30 text-cream max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-gold">Stored Installation date</DialogTitle>
            <DialogDescription className="text-cream/70">Officers change on this date; it also sets the KPI Masonic year.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className={labelCls}>Year
              <Input type="number" className={`mt-1 ${fieldCls}`} value={ovYear} onChange={(e) => setOvYear(Number(e.target.value) || thisYear)} />
            </label>
            <label className={labelCls}>Date
              <Input type="date" className={`mt-1 ${fieldCls}`} value={ovDate} onChange={(e) => setOvDate(e.target.value)} />
            </label>
            {ovDate && !ovValid && <p role="alert" className="text-sm text-destructive-foreground">The date must be in {ovYear}.</p>}
            {ovValid && <KpiEffect cfg={cfg} year={ovYear} date={ovDate} />}
          </div>
          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            {cfg.stored[ovYear] && <Button variant="ghost" className="min-h-[44px]" disabled={busy} onClick={() => saveOverride(true)}>Clear stored date</Button>}
            <Button className="min-h-[44px] bg-gold text-navy hover:bg-gold/90" disabled={busy || !ovValid} onClick={() => saveOverride(false)}>Save date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!action} onOpenChange={(o) => !busy && !o && setAction(null)}>
        <DialogContent className="bg-navy border-gold/30 text-cream max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-gold">
              {action?.kind === "add" ? "Add meeting" : action?.kind === "move" ? "Move meeting" : "Drop meeting"}
            </DialogTitle>
            <DialogDescription className="text-cream/70">
              {action?.meeting ? `${typeLabel(action.meeting.meeting_type)} meeting on ${fmt(action.meeting.meeting_date)}` : "Adds a draft meeting to the diary."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {action?.kind !== "drop" && (
              <label className={labelCls}>{action?.kind === "move" ? "New date" : "Date"}
                <Input type="date" className={`mt-1 ${fieldCls}`} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </label>
            )}
            {action?.kind === "add" && (
              <label className={labelCls}>Meeting type
                <select className={selectCls} value={newType} onChange={(e) => setNewType(e.target.value as MeetingType)}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
            )}
            {action?.kind !== "move" && (
              <label className={labelCls}>{action?.kind === "drop" ? "Reason (optional)" : newType === "dispensation" ? "Dispensation reason or reference (optional)" : "Notes (optional)"}
                <Textarea className={`mt-1 ${fieldCls}`} rows={2} placeholder={newType === "dispensation" ? "Reason or dispensation reference" : undefined} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            )}
            {movePlan && movePlan.ok === false && newDate !== action?.meeting?.meeting_date && <p role="alert" className="text-sm text-destructive-foreground">{movePlan.error}</p>}
            {addClash && <p role="alert" className="text-sm text-destructive-foreground">Another meeting is already on that date.</p>}
            {!!warnings.length && (
              <div role="alert" className="rounded-sm border border-destructive/60 p-3 text-sm break-words">
                This meeting has {warnings.join(", ")}. {action?.kind === "drop"
                  ? "It will be marked cancelled and hidden from calendars and bookings; nothing is deleted."
                  : "Records stay attached. The booking page date moves with it; summonses already sent keep their old date."}
              </div>
            )}
            {effectFor && <KpiEffect cfg={cfg} year={effectFor.year} date={effectFor.date} />}
          </div>
          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button variant="ghost" className="min-h-[44px]" disabled={busy} onClick={() => setAction(null)}>Back</Button>
            <Button className="min-h-[44px] bg-gold text-navy hover:bg-gold/90"
              disabled={busy || (action?.kind === "move" && !movePlan?.ok) || (action?.kind === "add" && (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || addClash))}
              onClick={runAction}>
              {busy ? "Saving…" : action?.kind === "drop" ? "Cancel meeting" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MembersLayout>
  );
}

export default function MeetingDiary() {
  return <Inner />;
}
