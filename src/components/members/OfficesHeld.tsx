import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  position_key: string;
  label: string;
  from_date: string;
  to_date: string | null;
  is_current: boolean;
  is_upcoming: boolean;
};

const fmt = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Read-only offices-held history. Visibility is enforced by get_member_offices_held. */
export default function OfficesHeld({ memberId, compact = false }: { memberId: string; compact?: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let live = true;
    (supabase as any).rpc("get_member_offices_held", { _member: memberId }).then(({ data, error }: { data: Row[] | null; error: unknown }) => {
      if (!live) return;
      if (error) console.error("Offices held lookup failed:", error);
      setRows(data ?? []);
    });
    return () => { live = false; };
  }, [memberId]);

  if (rows === null) return <p className="text-xs text-primary-foreground/50">Loading…</p>;
  if (rows.length === 0) return <p className="text-xs text-primary-foreground/50">No offices on record.</p>;

  return (
    <div>
      <ul className={compact ? "space-y-1.5" : "divide-y divide-gold/10"}>
        {rows.map((r) => (
          <li key={`${r.position_key}-${r.from_date}`} className={compact ? "text-xs" : "py-2 text-sm"}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
              <span className="text-primary-foreground/90 break-words">{r.label}</span>
              {r.is_current && <span className="text-[10px] uppercase tracking-wider text-gold">Current</span>}
              {r.is_upcoming && <span className="text-[10px] uppercase tracking-wider text-gold/70">From Installation</span>}
            </div>
            <div className="text-xs text-primary-foreground/60">
              {fmt(r.from_date)} – {r.to_date ? fmt(r.to_date) : r.is_upcoming ? "" : "present"}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-primary-foreground/40 mt-2">Earlier years: no record.</p>
    </div>
  );
}
