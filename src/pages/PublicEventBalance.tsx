import { useEffect, useState } from "react";
import { useUnitProfile } from "@/lib/unitProfile";
import { nameOr } from "@/lib/unitText";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { readFunctionError } from "@/lib/functionError";
import { formatEventDate, formatGBP } from "@/lib/publicEvents";
import { quoteBalance } from "@/lib/eventPricing";
import { focusFirstError, invalidProps, validateBalanceForm, type FieldError } from "@/lib/formErrors";
import { InlineFieldError } from "@/components/bookings/InlineFieldError";
import { FeeAndSummary, Honeypot, inputCls, PaymentMethodFieldset, PayNowSummary, type PayMethod } from "@/components/events/booking/BookingCore";

type Balance = {
  reference: string; name: string; event_title: string; event_date: string; event_slug: string;
  order_pence: number; amount_paid_pence: number; balance_due_pence: number; balance_due_date: string | null;
  overdue: boolean; can_pay: boolean; fee_cover_enabled: boolean;
  undecided: { guest_name: string; is_child: boolean; courses: { choice_id: string; course_name: string; options: { id: string; label: string; description?: string | null }[] }[] }[];
};

export default function PublicEventBalance() {
  const unit = useUnitProfile();
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const [b, setB] = useState<Balance | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod>("card");
  const [coverFee, setCoverFee] = useState(true);
  const [honeypot, setHoneypot] = useState("");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const { data, error: e } = await supabase.functions.invoke("get-event-balance", { body: { token } });
    if (e || data?.error || !data?.reference) { setInvalid(await readFunctionError(e, data, "This link is no longer valid.")); return; }
    setB(data);
  };
  useEffect(() => { window.scrollTo(0, 0); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const feeOn = !!b?.fee_cover_enabled;
  const q = quoteBalance({ balancePence: b?.balance_due_pence ?? 0, method: method === "bank_transfer" ? "card" : method, coverFee: feeOn && coverFee });

  const saveChoices = async () => {
    if (!b) return;
    setError(null);
    const all = b.undecided.flatMap((g) => g.courses);
    const chosen = all.filter((c) => picks[c.choice_id]).map((c) => ({ choice_id: c.choice_id, option_id: picks[c.choice_id] }));
    const fe = validateBalanceForm({ action: "choices", chosenCount: chosen.length, firstChoiceId: all[0]?.choice_id });
    setFieldErrors(fe);
    if (fe.length) { focusFirstError(fe); return; }
    setBusy(true);
    const { data, error: e } = await supabase.functions.invoke("get-event-balance", { body: { token, action: "choices", choices: chosen } });
    setBusy(false);
    if (e || data?.error) { setError(await readFunctionError(e, data, "Sorry, we could not save your choices.")); return; }
    setSaved(true); setPicks({}); load();
  };

  const pay = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (honeypot || !b) return;
    setError(null);
    const fe = validateBalanceForm({ action: "pay", method });
    setFieldErrors(fe);
    if (fe.length) { focusFirstError(fe); return; }
    setBusy(true);
    const { data, error: e } = await supabase.functions.invoke("create-event-balance-checkout", {
      body: { token, method, cover_fee: feeOn && coverFee, origin: window.location.origin, website: "" },
    });
    if (e || data?.error || !data?.url) { setError(await readFunctionError(e, data, "Sorry, we could not start your payment.")); setBusy(false); return; }
    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO title="Your booking balance" description={`Pay the balance for your ${nameOr(unit, "lodge")} event booking.`} noindex />
      <Header />
      <main id="main-content" className="pt-32 pb-20 md:pt-40 bg-background">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl font-sans space-y-6">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground text-center">{invalid ? "Link not valid" : !b ? "Checking your booking…" : b.can_pay ? "Pay your balance" : "Your booking"}</h1>
          {invalid && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">{invalid}</p>
              <Link to="/contact" className="inline-flex items-center justify-center min-h-[48px] px-6 border border-gold-dark text-gold-dark rounded-sm font-semibold">Contact us</Link>
            </div>
          )}
          {b && (
            <section className="border border-border bg-card rounded-sm p-5 sm:p-6 space-y-2" aria-labelledby="bal-summary">
              <h2 id="bal-summary" className="font-serif text-xl text-foreground break-words">{b.event_title}</h2>
              <p className="text-muted-foreground">{formatEventDate(b.event_date)} · Reference {b.reference}</p>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Order total</span><span className="text-foreground tabular-nums">{formatGBP(b.order_pence)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Paid so far</span><span className="text-foreground tabular-nums">{formatGBP(b.amount_paid_pence)}</span></div>
              {b.can_pay && (
                <div className="border-2 border-gold rounded-sm p-3 mt-2">
                  <p className="text-foreground font-bold break-words">Balance due: {formatGBP(b.balance_due_pence)}{b.balance_due_date ? ` by ${formatEventDate(b.balance_due_date)}` : ""}</p>
                  {b.overdue && <p className="text-destructive font-semibold mt-1">This balance is now overdue. Please pay as soon as you can.</p>}
                </div>
              )}
            </section>
          )}
          {params.get("cancelled") && b?.can_pay && <p role="status" className="text-center text-muted-foreground">Payment was cancelled — nothing has been taken. You can try again below.</p>}

          {b && b.undecided.length > 0 && (
            <section className="border border-border bg-card rounded-sm p-5 sm:p-6 space-y-3" aria-labelledby="bal-menu">
              <h2 id="bal-menu" className="font-serif text-xl text-foreground">Choose your menu</h2>
              {saved && <p role="status" className="text-foreground font-semibold">Thank you — your choices have been saved.</p>}
              {b.undecided.map((g, gi) => (
                <div key={gi} className="border border-border bg-background rounded-sm p-3 space-y-2">
                  <p className="text-sm font-semibold text-foreground break-words">{g.guest_name}{g.is_child ? " (child)" : ""}</p>
                  {g.courses.map((c) => (
                    <label key={c.choice_id} className="block"><span className="block text-sm text-foreground mb-1">{c.course_name}</span>
                      <select id={`bal-choice-${c.choice_id}`} {...invalidProps(fieldErrors, `bal-choice-${c.choice_id}`)} className={inputCls} value={picks[c.choice_id] ?? ""} onChange={(e) => setPicks((p) => ({ ...p, [c.choice_id]: e.target.value }))}>
                        <option value="">Choose…</option>
                        {c.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                      <InlineFieldError errors={fieldErrors} id={`bal-choice-${c.choice_id}`} />
                    </label>
                  ))}
                </div>
              ))}
              <button type="button" onClick={saveChoices} disabled={busy} className="w-full inline-flex items-center justify-center min-h-[48px] px-6 border border-gold-dark text-gold-dark rounded-sm font-semibold disabled:opacity-60">Save menu choices</button>
            </section>
          )}

          {b?.can_pay && (
            <form onSubmit={pay} noValidate className="space-y-6">
              <Honeypot value={honeypot} onChange={setHoneypot} />
              <div id="bal-pay" className="scroll-mt-32"><PaymentMethodFieldset method={method} onChange={setMethod} allowed={["card", "pay_by_bank"]} /></div>
              <InlineFieldError errors={fieldErrors} id="bal-pay" />
              {feeOn && <FeeAndSummary subtotal={q.chargePence} feePence={q.feePence} total={q.totalNowPence} method={method} coverFee={coverFee} onCoverFee={setCoverFee} hideSummary />}
              <PayNowSummary rows={[["Balance", q.chargePence], ...(q.feePence > 0 ? [[method === "card" ? "Card fee" : "Processing fee", q.feePence] as [string, number]] : [])]} totalLabel="Pay now" total={q.totalNowPence} />
              {error && <p role="alert" className="text-destructive font-semibold">{error}</p>}
              <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold uppercase tracking-widest min-h-[48px] disabled:opacity-60">
                {busy ? "Please wait…" : `Pay balance · ${formatGBP(q.totalNowPence)}`}
              </button>
            </form>
          )}
          {b && !b.can_pay && error && <p role="alert" className="text-destructive font-semibold">{error}</p>}
          {b && <div className="text-center"><Link to={`/events/${b.event_slug}`} className="inline-flex items-center justify-center min-h-[48px] px-6 border border-gold-dark text-gold-dark font-semibold rounded-sm">Event details</Link></div>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
