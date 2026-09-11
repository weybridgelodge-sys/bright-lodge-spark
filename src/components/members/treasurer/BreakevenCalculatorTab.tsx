import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { fetchReservePots, fetchSubscriptionSettings, type ReservePot } from "@/lib/treasurer/subscriptionSettings";

const money = (pence: number) =>
  `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const toPence = (v: string) => {
  const n = Math.round(parseFloat(v || "0") * 100);
  return Number.isFinite(n) ? n : 0;
};
const fromPence = (p: number) => (p / 100).toFixed(2);

type FixedKey = "wm_guests" | "bank_charges" | "stationery" | "pgm_fund";

const FIXED_DEFAULTS: { key: FixedKey; label: string; value: string }[] = [
  { key: "wm_guests", label: "WM's guests", value: "175.00" },
  { key: "bank_charges", label: "Bank charges", value: "60.00" },
  { key: "stationery", label: "Stationery", value: "90.00" },
  { key: "pgm_fund", label: "PGM's Fund", value: "40.00" },
];

export default function BreakevenCalculatorTab({ canEdit }: { canEdit: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [memberCount, setMemberCount] = useState("0");
  const [excludedNames, setExcludedNames] = useState<string[]>([]);

  const [ugleOver, setUgleOver] = useState("70.00");
  const [ugleUnder, setUgleUnder] = useState("35.00");
  const [pglOver, setPglOver] = useState("25.80");
  const [pglUnder, setPglUnder] = useState("12.90");
  const [spcf, setSpcf] = useState("1.50");
  const [levy, setLevy] = useState("90.00");

  const [fixed, setFixed] = useState(FIXED_DEFAULTS);

  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [subRate, setSubRate] = useState("250.00");
  const [pots, setPots] = useState<ReservePot[]>([]);
  const [potValues, setPotValues] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [settings, potRows, membersRes, officersRes] = await Promise.all([
      fetchSubscriptionSettings(),
      fetchReservePots(),
      supabase.from("profiles").select("id,full_name,first_name,last_name").eq("status", "active").eq("is_honorary_member", false),
      supabase.from("officer_appointments" as any).select("member_id,position_key,lodge_year").in("position_key", ["treasurer", "secretary"]),
    ]);

    if (settings) {
      setSettingsId(settings.id);
      setSubRate(fromPence(settings.annual_rate_pence));
    }
    setPots(potRows);
    setPotValues(Object.fromEntries(potRows.map((p) => [p.fund_code, fromPence(p.annual_pence)])));

    const now = new Date();
    const lodgeYear = now.getUTCMonth() >= 9 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    const exemptIds = new Set(
      ((officersRes.data as any[]) ?? []).filter((o) => o.lodge_year === lodgeYear).map((o) => o.member_id as string),
    );
    const members = ((membersRes.data as any[]) ?? []).filter((m) => !exemptIds.has(m.id));
    const excluded = ((membersRes.data as any[]) ?? [])
      .filter((m) => exemptIds.has(m.id))
      .map((m) => (m.full_name || `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.id) as string);
    setMemberCount(String(members.length));
    setExcludedNames(excluded);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const count = Math.max(0, Math.round(parseFloat(memberCount || "0")) || 0);
  const fixedTotal = fixed.reduce((s, f) => s + toPence(f.value), 0);
  const fixedPerMember = count > 0 ? Math.round(fixedTotal / count) : 0;

  const reserveFull = useMemo(
    () => pots.map((p) => ({ ...p, pence: toPence(potValues[p.fund_code] ?? fromPence(p.annual_pence)) })),
    [pots, potValues],
  );
  const reserveFullTotal = reserveFull.reduce((s, r) => s + r.pence, 0);
  const reserveUnderTotal = reserveFull.reduce((s, r) => s + Math.round(r.pence * 0.5), 0);

  const perMemberFull = toPence(ugleOver) + toPence(pglOver) + toPence(spcf) + toPence(levy);
  const perMemberUnder = toPence(ugleUnder) + toPence(pglUnder) + toPence(spcf) + toPence(levy);

  const subFull = toPence(subRate);
  const subUnder = Math.round(subFull * 0.5);

  const costFull = perMemberFull + fixedPerMember + reserveFullTotal;
  const costUnder = perMemberUnder + fixedPerMember + reserveUnderTotal;
  const resultFull = subFull - costFull;
  const resultUnder = subUnder - costUnder;

  const saveShared = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;

    if (settingsId) {
      const { error } = await supabase
        .from("subscription_settings" as any)
        .update({ annual_rate_pence: subFull, updated_by: uid })
        .eq("id", settingsId);
      if (error) {
        setSaving(false);
        toast({ title: "Could not save subscription rate", description: error.message, variant: "destructive" });
        return;
      }
    }

    for (const r of reserveFull) {
      if (r.pence === r.annual_pence) continue;
      const { error } = await supabase
        .from("subscription_reserve_pots" as any)
        .update({ annual_pence: r.pence, updated_by: uid })
        .eq("id", r.id);
      if (error) {
        setSaving(false);
        toast({ title: `Could not save ${r.label}`, description: error.message, variant: "destructive" });
        return;
      }
    }

    setSaving(false);
    toast({ title: "Subscription settings saved", description: "New Member Fees and Direct Receipt now use these figures." });
    load();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gold/20 bg-primary-foreground/5 p-4">
        <h2 className="font-serif text-lg text-gold mb-1">Membership Breakeven Calculator</h2>
        <p className="text-primary-foreground/60 text-sm mb-4">
          Works out what each member actually costs the Lodge and whether the annual subscription covers it. The
          subscription rate and reserve pot targets saved here are the shared source of truth used by New Member Fees
          and the Direct Receipt subscription toggle.
        </p>

        {loading ? (
          <p className="text-primary-foreground/60"><Loader2 className="w-4 h-4 mr-1 inline animate-spin" /> Loading…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Chargeable members</Label>
                <Input type="number" min="0" value={memberCount} onChange={(e) => setMemberCount(e.target.value)} disabled={!canEdit} />
                <p className="text-primary-foreground/50 text-xs mt-1">
                  Active, non-honorary members, excluding the current Treasurer and Secretary
                  {excludedNames.length ? ` (${excludedNames.join(", ")})` : ""}.
                </p>
              </div>
              <div>
                <Label>Annual subscription rate (£)</Label>
                <Input type="number" step="0.01" min="0" value={subRate} onChange={(e) => setSubRate(e.target.value)} disabled={!canEdit} />
                <p className="text-primary-foreground/50 text-xs mt-1">Under-25 members pay half: {money(subUnder)}.</p>
              </div>
            </div>

            <h3 className="font-serif text-gold mt-6 mb-2">Per-member costs</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>UGLE fee — 25 and over (£)</Label>
                <Input type="number" step="0.01" min="0" value={ugleOver} onChange={(e) => setUgleOver(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label>UGLE fee — under 25 (£)</Label>
                <Input type="number" step="0.01" min="0" value={ugleUnder} onChange={(e) => setUgleUnder(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label>PGL fee — 25 and over (£)</Label>
                <Input type="number" step="0.01" min="0" value={pglOver} onChange={(e) => setPglOver(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label>PGL fee — under 25 (£)</Label>
                <Input type="number" step="0.01" min="0" value={pglUnder} onChange={(e) => setPglUnder(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label>PGL SPCF (£, flat)</Label>
                <Input type="number" step="0.01" min="0" value={spcf} onChange={(e) => setSpcf(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label>Levy (£, flat)</Label>
                <Input type="number" step="0.01" min="0" value={levy} onChange={(e) => setLevy(e.target.value)} disabled={!canEdit} />
              </div>
            </div>

            <h3 className="font-serif text-gold mt-6 mb-2">Fixed lodge costs</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {fixed.map((f) => (
                <div key={f.key}>
                  <Label>{f.label} (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={f.value}
                    onChange={(e) => setFixed((rs) => rs.map((r) => (r.key === f.key ? { ...r, value: e.target.value } : r)))}
                    disabled={!canEdit}
                  />
                </div>
              ))}
            </div>
            <p className="text-primary-foreground/60 text-sm mt-2">
              Fixed costs {money(fixedTotal)} ÷ {count} members = <span className="text-gold">{money(fixedPerMember)}</span> per member.
            </p>

            <h3 className="font-serif text-gold mt-6 mb-2">Designated reserve pots (shared)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {reserveFull.map((r) => (
                <div key={r.fund_code}>
                  <Label>{r.label} (£ per member, per year)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={potValues[r.fund_code] ?? ""}
                    onChange={(e) => setPotValues((v) => ({ ...v, [r.fund_code]: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
              ))}
            </div>
            <p className="text-primary-foreground/60 text-sm mt-2">
              Reserves total {money(reserveFullTotal)} full rate · {money(reserveUnderTotal)} under 25.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-gold/20 p-3">
                <p className="text-primary-foreground/60 text-sm">Full-rate member</p>
                <p className="text-primary-foreground/70 text-xs mt-1">
                  Subscription {money(subFull)} − costs {money(costFull)} (UGLE/PGL/SPCF/Levy {money(perMemberFull)} + fixed share{" "}
                  {money(fixedPerMember)} + reserves {money(reserveFullTotal)})
                </p>
                <p className={`font-semibold text-lg mt-1 ${resultFull >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {resultFull >= 0 ? "Surplus" : "Deficit"} {money(Math.abs(resultFull))}
                </p>
              </div>
              <div className="rounded-md border border-gold/20 p-3">
                <p className="text-primary-foreground/60 text-sm">Under-25 member</p>
                <p className="text-primary-foreground/70 text-xs mt-1">
                  Subscription {money(subUnder)} − costs {money(costUnder)} (UGLE/PGL/SPCF/Levy {money(perMemberUnder)} + fixed share{" "}
                  {money(fixedPerMember)} + reserves {money(reserveUnderTotal)})
                </p>
                <p className={`font-semibold text-lg mt-1 ${resultUnder >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {resultUnder >= 0 ? "Surplus" : "Deficit"} {money(Math.abs(resultUnder))}
                </p>
                <p className="text-primary-foreground/50 text-xs mt-1">
                  Under-25 subsidy compared with a full-rate member: {money(Math.abs(resultFull - resultUnder))}.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <Button className="bg-gold text-navy hover:bg-gold/90" disabled={!canEdit || saving} onClick={saveShared}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save subscription rate &amp; reserve pots
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
