import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { highestAwardAchieved } from "@/lib/charity/festivalAwards";

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

type YearRow = { charity_id: string; name: string; website: string | null; year_total: number };
type Totals = { total_raised: number; public_feed_start_date: string | null };
type Festival = { festival_name: string; target_amount: number };
type FeedMetrics = {
  total_raised: number;
  current_year_total: number;
  festival_name: string;
  festival_target_amount: number;
  festival_total: number;
  public_feed_start_date: string | null;
};

export default function OurCharitiesLiveFeed() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [rows, setRows] = useState<YearRow[]>([]);
  const [festival, setFestival] = useState<Festival | null>(null);
  const [festivalCumulative, setFestivalCumulative] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: t }, { data: r }] = await Promise.all([
        (supabase as any).from("charity_public_feed_metrics").select("total_raised,current_year_total,festival_name,festival_target_amount,festival_total,public_feed_start_date").maybeSingle(),
        (supabase as any).from("public_charity_totals").select("total_raised,public_feed_start_date").maybeSingle(),
        (supabase as any).from("public_charity_year_breakdown").select("charity_id,name,website,year_total"),
      ]);
      if (m) {
        const metrics = m as FeedMetrics;
        setTotals({ total_raised: Number(metrics.total_raised), public_feed_start_date: metrics.public_feed_start_date });
        setFestival({ festival_name: metrics.festival_name, target_amount: Number(metrics.festival_target_amount) });
        setFestivalCumulative(Number(metrics.festival_total));
      } else if (t) {
        setTotals({ total_raised: Number((t as any).total_raised), public_feed_start_date: (t as any).public_feed_start_date });
      }
      if (r) {
        const mappedRows = (r as any[]).map((x) => ({ ...x, year_total: Number(x.year_total) }));
        setRows(mappedRows);
        if (!m) {
          setFestivalCumulative(mappedRows.filter((x) => x.name.toLowerCase().includes("surrey 2030") || x.name.toLowerCase().includes("2030 festival")).reduce((a, x) => a + x.year_total, 0));
        }
      }
    })();
  }, []);

  if (!totals && rows.length === 0) return null;

  const yearTotal = rows.reduce((a, r) => a + r.year_total, 0);
  const rawPct = festival && festival.target_amount > 0 ? (festivalCumulative / festival.target_amount) * 100 : 0;
  const barPct = Math.min(100, rawPct);
  const targetReached = festival ? festivalCumulative >= festival.target_amount && festival.target_amount > 0 : false;
  const excess = festival && targetReached ? festivalCumulative - festival.target_amount : 0;
  const award = festival ? highestAwardAchieved(festivalCumulative, festival.target_amount) : null;

  return (
    <section className="py-12 md:py-16 bg-navy-gradient border-y border-gold/15">
      <div className="container mx-auto px-6 max-w-5xl">
        <h2 className="font-serif text-2xl md:text-3xl text-primary-foreground text-center mb-2">Our Charitable Giving</h2>
        <p className="text-primary-foreground/60 font-sans text-center text-sm mb-10">Live totals from the Lodge's charity records</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <div className="p-6 rounded-sm border border-gold/20 bg-navy-light/40 text-center">
            <p className="text-xs uppercase tracking-widest text-gold mb-2">This Masonic Year</p>
            <p className="font-serif text-3xl md:text-4xl text-primary-foreground">{gbp(yearTotal)}</p>
          </div>
          <div className="p-6 rounded-sm border border-gold/20 bg-navy-light/40 text-center">
            <p className="text-xs uppercase tracking-widest text-gold mb-2">All-Time Total</p>
            <p className="font-serif text-3xl md:text-4xl text-primary-foreground">{totals ? gbp(totals.total_raised) : "—"}</p>
          </div>
        </div>

        {festival && festival.target_amount > 0 && (
          <div className="mb-10 p-6 rounded-sm border border-gold/20 bg-navy-light/40">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-serif text-lg text-primary-foreground">{festival.festival_name}</h3>
              <span className="text-sm text-gold tabular-nums">{gbp(festivalCumulative)} of {gbp(festival.target_amount)}</span>
            </div>
            <div className={`h-3 bg-navy-dark rounded-sm overflow-hidden border ${targetReached ? "border-gold shadow-[0_0_12px_rgba(201,164,50,0.4)]" : "border-gold/20"}`}>
              <div className="h-full bg-gold-shimmer" style={{ width: `${barPct}%` }} aria-label={`${Math.round(rawPct)} percent of target`} />
            </div>
            {targetReached ? (
              <p className="text-xs text-gold mt-2 font-semibold">
                {Math.round(rawPct)}% of target reached — {award ? `${award.name} Award achieved` : "Target exceeded"}
                {excess > 0 ? ` · ${gbp(excess)} above target` : ""}.
              </p>
            ) : (
              <p className="text-xs text-primary-foreground/60 mt-2">{Math.round(rawPct)}% of the lodge's Festival target reached.</p>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div>
            <h3 className="font-serif text-lg text-primary-foreground mb-4">Supported this year</h3>
            <ul className="divide-y divide-gold/10 border border-gold/15 rounded-sm bg-navy-light/30">
              {rows.map((r) => (
                <li key={r.charity_id} className="flex items-center justify-between px-4 py-3">
                  {r.website ? (
                    <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-primary-foreground hover:text-gold text-sm">{r.name}</a>
                  ) : (
                    <span className="text-primary-foreground text-sm">{r.name}</span>
                  )}
                  <span className="text-gold tabular-nums text-sm">{gbp(r.year_total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
