// Representatives (Royal Arch, Petitions, Sports, Halls and any the lodge adds).
// Stored as officer_positions with category 'representative' and yearly
// officer_appointments rows. Admin and Secretary edit; everyone else read-only
// (enforced again by database policies).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fieldCls, fieldLabelCls } from "@/lib/fieldStyle";
import { POSITION_SELECT, type PositionRow } from "@/lib/officerPositions";

type Appt = { id: string; position_key: string; member_id: string | null; display_name: string | null; lodge_year: number };
type MemberOpt = { id: string; label: string };

export function repSlugKey(label: string, suffix: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "representative";
  return `rep_${slug}_${suffix}`;
}

export default function RepresentativesBoard({ year, members, canEdit, unitId }: {
  year: number; members: MemberOpt[]; canEdit: boolean; unitId: string | null;
}) {
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [p, a] = await Promise.all([
      (supabase.from as any)("officer_positions").select(POSITION_SELECT).eq("category", "representative").order("order_index"),
      (supabase.from as any)("officer_appointments").select("id,position_key,member_id,display_name,lodge_year").order("lodge_year", { ascending: false }),
    ]);
    const rows = ((p.data ?? []) as PositionRow[]).filter((x) => !x.unit_id || !unitId || x.unit_id === unitId);
    setPositions(rows);
    const keys = new Set(rows.map((r) => r.key));
    setAppts(((a.data ?? []) as Appt[]).filter((x) => keys.has(x.position_key)));
  };
  useEffect(() => { load(); }, [unitId]);

  const nameOf = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.label])), [members]);
  const holderText = (x: Appt) => (x.member_id ? nameOf[x.member_id] ?? "Former member" : x.display_name || "Vacant");

  const run = async (fn: () => Promise<{ error: any }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(ok); load();
  };

  const saveHolder = (key: string, memberId: string | null, displayName: string | null) => {
    const existing = appts.find((x) => x.position_key === key && x.lodge_year === year);
    const payload = { position_key: key, lodge_year: year, member_id: memberId, display_name: memberId ? null : (displayName?.trim() || null), is_projection: false };
    return run(async () => existing
      ? (supabase.from as any)("officer_appointments").update(payload).eq("id", existing.id)
      : (supabase.from as any)("officer_appointments").insert(payload), "Representative saved");
  };

  const addPosition = async () => {
    const label = newLabel.trim();
    if (!label || !unitId) return;
    const { data: mx } = await (supabase.from as any)("officer_positions").select("order_index").order("order_index", { ascending: false }).limit(1);
    const next = ((mx?.[0]?.order_index as number) ?? 0) + 10;
    await run(async () => (supabase.from as any)("officer_positions").insert({
      key: repSlugKey(label, Date.now().toString(36)), label, order_index: next, is_progressive: false,
      category: "representative", unit_id: unitId, include_in: { summons: true, provincial_return: true },
    }), "Representative position added");
    setNewLabel("");
  };

  const shown = positions.filter((p) => p.active !== false || canEdit);

  return (
    <section className="mt-10" aria-labelledby="reps-heading">
      <header className="mb-4">
        <h2 id="reps-heading" className="font-serif text-2xl text-gold">Representatives</h2>
        <p className="font-sans text-sm text-cream mt-1">
          Lodge representatives for {year}. Shown on the Summons and the Provincial return, never on the UGLE return or the progression ladder.
          {!canEdit && " Only the Secretary or an admin can change these."}
        </p>
      </header>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="reps-list">
        {shown.map((p) => {
          const current = appts.find((x) => x.position_key === p.key && x.lodge_year === year);
          const history = appts.filter((x) => x.position_key === p.key && x.lodge_year !== year);
          return (
            <li key={p.key} className="rounded-md border border-gold/30 bg-navy-light/30 p-4 font-sans text-cream min-w-0">
              {canEdit ? (
                <RenameField position={p} onSave={(label) => run(async () => (supabase.from as any)("officer_positions").update({ label }).eq("key", p.key), "Renamed")} />
              ) : (
                <h3 className="font-serif text-base text-cream break-words">{p.label}</h3>
              )}
              {p.active === false && <p className="text-sm text-gold mt-1">Inactive</p>}
              <p className="mt-2 text-sm break-words"><span className="text-gold">{year}: </span>{current ? holderText(current) : "Vacant"}</p>
              {canEdit && p.active !== false && (
                <HolderEditor key={`${p.key}-${current?.id ?? "new"}`} label={p.label} members={members} current={current}
                  disabled={busy} onSave={(mid, name) => saveHolder(p.key, mid, name)} />
              )}
              {history.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer min-h-[44px] flex items-center text-sm text-gold">History</summary>
                  <ul className="text-sm mt-1 space-y-1">
                    {history.map((h) => <li key={h.id} className="break-words">{h.lodge_year}: {holderText(h)}</li>)}
                  </ul>
                </details>
              )}
              {canEdit && (
                <button type="button" disabled={busy}
                  onClick={() => run(async () => (supabase.from as any)("officer_positions").update({ active: p.active === false }).eq("key", p.key), p.active === false ? "Reactivated" : "Deactivated")}
                  className="mt-3 min-h-[44px] rounded-md border border-gold/70 px-3 text-sm text-cream hover:bg-navy-light">
                  {p.active === false ? `Reactivate ${p.label}` : `Deactivate ${p.label}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {canEdit && (
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
          <label className="flex-1 min-w-0">
            <span className={fieldLabelCls}>New representative position</span>
            <input className={fieldCls} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Lodge representative to the Province" />
          </label>
          <button type="button" onClick={addPosition} disabled={busy || !newLabel.trim() || !unitId}
            className="min-h-[44px] rounded-md bg-gold px-4 text-sm font-medium text-navy disabled:opacity-60">Add position</button>
        </div>
      )}
    </section>
  );
}

function RenameField({ position, onSave }: { position: PositionRow; onSave: (label: string) => void }) {
  const [v, setV] = useState(position.label);
  return (
    <div className="flex gap-2 items-end">
      <label className="flex-1 min-w-0">
        <span className={fieldLabelCls}>Position name</span>
        <input className={fieldCls} value={v} onChange={(e) => setV(e.target.value)} />
      </label>
      {v.trim() && v.trim() !== position.label && (
        <button type="button" onClick={() => onSave(v.trim())} className="min-h-[44px] rounded-md border border-gold/70 px-3 text-sm text-cream">Rename</button>
      )}
    </div>
  );
}

function HolderEditor({ label, members, current, disabled, onSave }: {
  label: string; members: MemberOpt[]; current?: Appt; disabled: boolean; onSave: (memberId: string | null, name: string | null) => void;
}) {
  const [mid, setMid] = useState(current?.member_id ?? "");
  const [name, setName] = useState(current?.display_name ?? "");
  return (
    <div className="mt-3 space-y-2">
      <label className="block">
        <span className={fieldLabelCls}>Member</span>
        <select aria-label={`Member holding ${label}`} className={fieldCls} value={mid} onChange={(e) => setMid(e.target.value)}>
          <option value="">Not a member (type a name)</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </label>
      {!mid && (
        <label className="block">
          <span className={fieldLabelCls}>Non-member name</span>
          <input aria-label={`Non-member name for ${label}`} className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      )}
      <button type="button" disabled={disabled} onClick={() => onSave(mid || null, mid ? null : name)}
        className="min-h-[44px] rounded-md bg-gold px-4 text-sm font-medium text-navy disabled:opacity-60">Save holder</button>
    </div>
  );
}
