import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

export default function HomepageCharityCTA() {
  const [total, setTotal] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("public_charity_totals")
        .select("total_raised, public_feed_start_date")
        .maybeSingle();
      if (data) {
        setTotal(Number(data.total_raised));
        setStartDate(data.public_feed_start_date);
      }
    })();
  }, []);

  if (total === null || total <= 0) return null;
  const sinceYear = startDate ? new Date(startDate).getFullYear() : null;

  return (
    <section className="py-12 sm:py-14 bg-navy-gradient border-y border-gold/20">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6 text-center md:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
          <HeartHandshake className="w-7 h-7 sm:w-8 sm:h-8 text-gold shrink-0 sm:mt-1" aria-hidden="true" />
          <div>
            <h2 className="text-xl sm:text-2xl font-serif text-primary-foreground">
              Weybridge Lodge has raised <span className="text-gold">{gbp(total)}</span> for charity{sinceYear ? ` since ${sinceYear}` : ""}
            </h2>
            <p className="text-primary-foreground/70 font-sans text-sm mt-1">Find out who we support and why charity sits at the heart of Freemasonry.</p>
          </div>
        </div>
        <Link
          to="/our-charities"
          className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-5 sm:px-6 py-3 rounded-sm text-xs sm:text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity shrink-0 w-full md:w-auto"
        >
          Our Charities <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
