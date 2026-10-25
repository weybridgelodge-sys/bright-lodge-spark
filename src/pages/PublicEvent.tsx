import { useEffect, useMemo, useState } from "react";
import { focusFirstError, invalidProps, validateEventForm } from "@/lib/formErrors";
import { InlineFieldError } from "@/components/bookings/InlineFieldError";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Calendar, Clock, MapPin, Star, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { depositAllowed, depositLineName, depositPence, orderTotalPence, planMethods, quoteBooking } from "@/lib/eventPricing";
import { supabase } from "@/integrations/supabase/client";
import { readFunctionError } from "@/lib/functionError";
import {
  CHILD_MAX_AGE, eventBookingState, fetchPublicEvent, formatEventDate,
  formatGBP, formatTime, isChildAge, seatsLeft, keepPostcodeTogether, type PublicEvent as Ev,
} from "@/lib/publicEvents";
import {
  emptyGuest, FeeAndSummary, GuestRowsFieldset, Honeypot, inputCls, labelClass, PaymentMethodFieldset, PaymentPlanFieldset, PayNowSummary, req,
  resizeGuests as resize, Stepper, type GuestRow, type PayMethod,
} from "@/components/events/booking/BookingCore";
import { CatalogueSteppers, CourseSelects, DECIDE_LATER, eventImageUrl, InfoBlocks, useEventContent } from "@/components/events/booking/ModuleSections";
import { buildEventSeo } from "@/lib/eventSeo";
import { isUnitVenue, useUnitProfile, venueFull, venueShort } from "@/lib/unitProfile";
import { coursesForGuest, orderModules } from "@/lib/eventOrder";

const LODGES = ["Weybridge", "Astolat", "Other", "Guest"] as const;

export const Divider = ({ festive }: { festive: boolean }) => (
  <div className="flex items-center justify-center gap-3 my-6" aria-hidden="true">
    <span className="h-px w-16 bg-gold" />
    {festive ? (
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-gold" fill="currentColor">
        <path d="M12 3c1.5 2.5 4 3 6 2-1 2 0 4.5 2 6-2.5 0-4.5 1.5-5 4-1-2-2-2.5-3-2.5S10 13 9 15c-.5-2.5-2.5-4-5-4 2-1.5 3-4 2-6 2 1 4.5.5 6-2z" />
        <circle cx="10" cy="17.5" r="1.6" /><circle cx="14" cy="17.5" r="1.6" /><circle cx="12" cy="20.5" r="1.6" />
      </svg>
    ) : <Star className="w-5 h-5 text-gold" />}
    <span className="h-px w-16 bg-gold" />
  </div>
);

export default function PublicEvent() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const [ev, setEv] = useState<Ev | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [lodge, setLodge] = useState<(typeof LODGES)[number]>("Weybridge");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [adultRows, setAdultRows] = useState<GuestRow[]>([emptyGuest()]);
  const [childRows, setChildRows] = useState<GuestRow[]>([]);
  const [method, setMethod] = useState<PayMethod>("card");
  const [coverFee, setCoverFee] = useState(true);
  const [plan, setPlan] = useState<"full" | "deposit">("full");
  const [honeypot, setHoneypot] = useState("");
  const [courseSel, setCourseSel] = useState<Record<string, Record<string, string>>>({});
  const [itemQty, setItemQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPublicEvent(slug).then((e) => { setEv(e); setLoading(false); });
  }, [slug]);

  useEffect(() => setAdultRows((r) => resize(r, adults)), [adults]);
  useEffect(() => setChildRows((r) => resize(r, children)), [children]);

  const content = useEventContent(ev?.id, ev?.event_type, ev?.modules);
  const isSimple = !ev?.event_type || ev.event_type === "simple";
  const mods = orderModules(ev?.modules, ev?.event_type);
  const sections = (ev?.modules as any)?.sections ?? {};
  const showSection = (k: string) => isSimple || sections[k] !== false;
  const feeEnabled = ev?.fee_cover_enabled !== false;
  const itemsPence = content ? content.items.reduce((s, i) => s + (itemQty[i.id] ?? 0) * i.price_pence, 0) : 0;
  // Simple events always pay in full; the shared rule gives subtotal + optional fee.
  // Deposit-enabled events may pay a deposit (on the whole order) before the balance due date.
  const londonToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const canDeposit = !!ev && depositAllowed(ev, londonToday);
  const activePlan = canDeposit ? plan : "full";
  const orderPence = ev ? orderTotalPence(adults, children, ev.adult_price_pence, ev.child_price_pence) + itemsPence : 0;
  const quote = quoteBooking({
    orderPence, plan: activePlan, depositPercent: ev?.deposit_percent ?? null, method, coverFee: feeEnabled && coverFee,
  });
  const isDepositNow = activePlan === "deposit" && quote.kind === "deposit";
  const subtotal = orderPence;
  const feePence = quote.feePence;
  const total = quote.totalNowPence;
  const dueLabel = ev?.balance_due_date ? formatEventDate(ev.balance_due_date) : "";
  useEffect(() => { if (activePlan === "deposit" && method === "bank_transfer") setMethod("card"); }, [activePlan, method]);
  const state = ev ? eventBookingState(ev) : "closed";
  const left = ev ? seatsLeft(ev) : null;
  const festive = ev?.theme === "christmas";
  const unit = useUnitProfile();
  const venue = ev?.venue?.trim() || venueFull(unit);
  // Short hero line: the lodge venue as "<name>, <postcode>", or the event's own venue.
  const venueLine = !ev?.venue?.trim() || isUnitVenue(ev.venue, unit) ? venueShort(unit) : ev.venue.trim();
  const venueName = !ev?.venue?.trim() || isUnitVenue(ev.venue, unit) ? unit.venueName : ev.venue.split(",")[0].trim();
  const title = ev?.public_title || "";
  const time = ev ? [formatTime(ev.start_time), formatTime(ev.end_time)].filter(Boolean).join(" – ") : "";

  const ogImage = ev?.og_image_url ? (/^https:\/\//.test(ev.og_image_url) ? ev.og_image_url : eventImageUrl(ev.slug, "og")) : undefined;
  const seo = useMemo(() => (ev ? buildEventSeo(ev, { open: state === "open", imageUrl: ogImage }) : null), [ev, state, ogImage]);
  const schema = useMemo(() => {
    if (!ev || !seo) return [];
    return [seo.jsonLd, breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Events", url: "/events" }, { name: title, url: `/events/${ev.slug}` }])];
  }, [ev, seo, title]);

  const fieldErrorsAll = validateEventForm({ name, email, phone, adultRows, childRows });
  const fieldErrors = attempted ? fieldErrorsAll : fieldErrorsAll.filter((x) => x.id === "pev-phone" && phoneTouched);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (honeypot) return;
    if (!ev) return;
    setAttempted(true);
    if (fieldErrorsAll.length) { focusFirstError(fieldErrorsAll); return; }
    if (adults + children < 1) { setError("Please add at least one guest."); return; }
    if (content && mods.courses) {
      const missing = [...adultRows.map((_, i) => ({ k: `a-${i}`, child: false })), ...childRows.map((_, i) => ({ k: `c-${i}`, child: true }))]
        .some(({ k, child }) => coursesForGuest(content, mods, child).some((c) => !courseSel[k]?.[c.id]));
      if (missing) { setError("Please choose a dish for every course for each guest."); return; }
    }
    if (eventBookingState(ev, new Date(), adults + children) !== "open") { setError("Sorry, there are not enough places left for your party."); return; }
    setSubmitting(true);
    const coursesFor = (k: string, child: boolean) => (content && mods.courses)
      ? { courses: coursesForGuest(content, mods, child).map((c) => {
          const v = courseSel[k]?.[c.id];
          return v === DECIDE_LATER ? { course_id: c.id, option_id: null, decide_later: true } : { course_id: c.id, option_id: v };
        }) }
      : {};
    const guests = [
      ...adultRows.map((g, i) => ({ name: g.name.trim(), age: g.age ? Number(g.age) : null, is_child: false, dietary: g.dietary.trim(), dietary_choice: g.choice || null, ...coursesFor(`a-${i}`, false) })),
      ...childRows.map((g, i) => ({ name: g.name.trim(), age: Number(g.age), is_child: true, dietary: g.dietary.trim(), dietary_choice: g.choice || null, ...coursesFor(`c-${i}`, true) })),
    ];
    const items = Object.entries(itemQty).filter(([, q]) => q > 0).map(([item_id, qty]) => ({ item_id, qty }));
    const { data, error: fnErr } = await supabase.functions.invoke("create-event-checkout", {
      body: { slug, contact_name: name.trim(), contact_email: email.trim(), contact_phone: phone.trim(), lodge_label: lodge, adults, children, guests, payment_method: method, cover_fee: feeEnabled && coverFee, ...(items.length && { items }), ...(canDeposit && { plan: activePlan }), origin: window.location.origin, website: "" },
    });
    if (fnErr || data?.error) {
      setError(await readFunctionError(fnErr, data, "Sorry, we could not start your booking."));
      setSubmitting(false);
      return;
    }
    window.location.href = data.url || data.confirm_url;
  };

  if (loading) return <div className="min-h-screen"><Header /><main className="pt-40 text-center text-muted-foreground">Loading…</main></div>;

  if (!ev) {
    return (
      <div className="min-h-screen">
        <SEO title="Event not found" description="This event is not available." noindex />
        <Header />
        <main id="main-content" className="pt-40 pb-24 container mx-auto px-4 text-center">
          <h1 className="font-serif text-3xl text-foreground mb-4">Event not found</h1>
          <p className="text-muted-foreground mb-8">This event may have finished or is not yet published.</p>
          <Link to="/events" className="inline-flex items-center min-h-[48px] px-6 bg-gold-shimmer text-accent-foreground font-semibold rounded-sm">See all events</Link>
        </main>
        <Footer />
      </div>
    );
  }



  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO title={seo!.title} description={seo!.description}{...(ogImage && { image: ogImage })} canonical={`/events/${ev.slug}`} type="website" schema={schema} />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <article>
          <header className="relative bg-navy pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
            {festive && <><div className="snowfall" aria-hidden="true" /><div className="snowfall snowfall-slow" aria-hidden="true" /></>}
            <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center max-w-4xl">
              {festive && <p className="text-gold font-sans uppercase tracking-wider text-sm mb-4">A festive celebration</p>}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-background leading-tight break-words">{title}</h1>
              {ev.hosting_lodges.length > 0 && (
                <p className="text-background/90 font-sans mt-4 text-lg">Hosted jointly by {ev.hosting_lodges.join(" and ")}</p>
              )}
              <Divider festive={festive} />
              <ul className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-6 text-background/90 font-sans">
                <li className="flex items-center justify-center gap-2"><Calendar className="w-4 h-4 text-gold" aria-hidden="true" />{formatEventDate(ev.event_date)}</li>
                {time && <li className="flex items-center justify-center gap-2"><Clock className="w-4 h-4 text-gold" aria-hidden="true" />{time}</li>}
                {venueLine && <li className="inline-flex self-center sm:self-auto items-start justify-center gap-2 max-w-full"><MapPin className="w-4 h-4 text-gold shrink-0 mt-1" aria-hidden="true" /><span className="min-w-0">{keepPostcodeTogether(venueLine)}</span></li>}
              </ul>
              <a href="#book" className="mt-8 inline-flex items-center justify-center min-h-[48px] px-8 bg-gold-shimmer text-accent-foreground font-semibold rounded-sm">
                Book your places <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </a>
            </div>
          </header>

          <section className="py-20 md:py-28 bg-background" aria-labelledby="about-heading">
            <div className="container mx-auto px-4 sm:px-6 max-w-3xl font-sans text-foreground space-y-4">
              <h2 id="about-heading" className="font-serif text-3xl text-foreground text-center">{festive ? "Join us for a festive evening" : "About the event"}</h2>
              {ev.tagline && <p className="text-lg text-center text-muted-foreground">{ev.tagline}</p>}
              {(ev.intro_copy || "").split(/\n{2,}/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
              {!ev.intro_copy && (
                <p>
                  {festive
                    ? `Celebrate the season with friends and family${venueName ? ` at ${venueName}` : ""}. ${ev.hosting_lodges.join(" and ") || unit.lodgeName || "We"} warmly invite members, families and guests — you do not need to be a Freemason to come along. It is a relaxed way to meet a friendly Masonic Lodge in Surrey and the Freemasons in Guildford.`
                    : "Members, families and guests are all welcome — you do not need to be a Freemason to attend. It is a relaxed way to meet a friendly Masonic Lodge in Surrey and the Freemasons in Guildford."}
                </p>
              )}
              <p className="text-muted-foreground"><MapPin className="inline w-4 h-4 mr-1 text-gold-dark" aria-hidden="true" />{keepPostcodeTogether(venue)}</p>
            </div>
          </section>

          {showSection("info") && (ev.useful_stuff.parking || ev.useful_stuff.timings || ev.useful_stuff.access || ev.dress_code) && (
            <section className="py-20 md:py-28 bg-card border-t border-border" aria-labelledby="useful-heading">
              <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
                <h2 id="useful-heading" className="font-serif text-3xl text-foreground text-center">The Useful Stuff</h2>
                <Divider festive={festive} />
                <dl className="grid sm:grid-cols-2 gap-4 font-sans">
                  {([["Timings", ev.useful_stuff.timings], ["Dress code", ev.dress_code], ["Parking", ev.useful_stuff.parking], ["Access", ev.useful_stuff.access]] as const)
                    .filter(([, v]) => !!v).map(([k, v]) => (
                      <div key={k} className="border border-border bg-background rounded-sm p-4">
                        <dt className="font-semibold text-foreground">{k}</dt><dd className={`text-muted-foreground ${k === "Timings" ? "whitespace-pre-line break-words" : ""}`}>{v}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            </section>
          )}

          {showSection("menu") && ev.menu_items.length > 0 && (
            <section className="py-20 md:py-28 bg-background border-t border-border" aria-labelledby="menu-heading">
              <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center font-sans">
                <h2 id="menu-heading" className="font-serif text-3xl text-foreground">Menu &amp; Dining</h2>
                <Divider festive={festive} />
                <ul className="space-y-2 text-lg text-foreground">{ev.menu_items.map((m) => <li key={m}>{m}</li>)}</ul>
                <p className="mt-4 text-muted-foreground">
                  {ev.dietary_choices.length > 0 ? `Dietary options: ${ev.dietary_choices.join(", ")}. ` : ""}Let us know any dietary needs for each guest when you book.
                </p>
              </div>
            </section>
          )}

          {content && <InfoBlocks content={content} slug={ev.slug} />}

          {showSection("highlights") && ev.highlights.length > 0 && (
            <section className="py-20 md:py-28 bg-card border-y border-border" aria-labelledby="highlights-heading">
              <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
                <h2 id="highlights-heading" className="font-serif text-3xl text-foreground text-center">Highlights</h2>
                <Divider festive={festive} />
                <ul className="grid sm:grid-cols-2 gap-4">
                  {ev.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3 border border-border bg-background rounded-sm p-4 font-sans text-foreground">
                      <Star className="w-5 h-5 text-gold shrink-0 mt-0.5" aria-hidden="true" />{h}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="py-20 md:py-28 bg-background" aria-labelledby="pricing-heading">
            <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
              <h2 id="pricing-heading" className="font-serif text-3xl text-foreground">Tickets</h2>
              <Divider festive={festive} />
              {ev.adult_price_pence == null || ev.child_price_pence == null ? (
                <p className="font-sans text-muted-foreground">Ticket prices will be announced shortly.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="border border-border bg-card rounded-sm p-6"><p className="font-serif text-3xl text-foreground">{formatGBP(ev.adult_price_pence)}</p><p className="font-sans text-muted-foreground">per adult</p></div>
                  <div className="border border-border bg-card rounded-sm p-6"><p className="font-serif text-3xl text-foreground">{formatGBP(ev.child_price_pence)}</p><p className="font-sans text-muted-foreground">per child aged {CHILD_MAX_AGE} and under</p></div>
                </div>
              )}
              {left != null && state === "open" && <p className="mt-4 font-sans text-sm text-muted-foreground">{left} places remaining</p>}
            </div>
          </section>

          <section id="book" className="py-20 md:py-28 bg-card border-y border-border scroll-mt-24" aria-labelledby="book-heading">
            <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
              <h2 id="book-heading" className="font-serif text-3xl text-foreground text-center mb-6">Book your places</h2>
              {params.get("cancelled") && <p role="status" className="mb-4 text-center font-sans text-muted-foreground">Payment was cancelled — your booking has not been paid. You can try again below.</p>}
              {state !== "open" ? (
                <div className="bg-background rounded-sm border border-border p-5 sm:p-8 text-center font-sans">
                  <p className="font-serif text-xl text-foreground mb-2">
                    {state === "sold_out" ? "Sold out" : state === "closed" ? "Booking closed" : "Booking opens soon"}
                  </p>
                  <p className="text-muted-foreground">
                    {state === "prices_pending" ? "Booking will open once ticket prices are confirmed." : "Please get in touch if you would like to join a waiting list."}
                  </p>
                  <Link to="/contact" className="mt-4 inline-flex items-center justify-center min-h-[48px] px-6 border border-gold-dark text-gold-dark rounded-sm font-semibold">Contact us</Link>
                </div>
              ) : (
                <form onSubmit={submit} noValidate className="space-y-6 font-sans">
                  <Honeypot value={honeypot} onChange={setHoneypot} />
                  <fieldset className="space-y-3">
                    <legend className="font-serif text-xl text-foreground mb-2">Your details</legend>
                    <label className="block" htmlFor="pev-name"><span className={labelClass}>Full name{req}</span><input id="pev-name" className={inputCls} required aria-required="true" {...invalidProps(fieldErrors, "pev-name")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
                    <InlineFieldError errors={fieldErrors} id="pev-name" />
                    <label className="block" htmlFor="pev-email"><span className={labelClass}>Email{req}</span><input id="pev-email" className={inputCls} type="email" required aria-required="true" {...invalidProps(fieldErrors, "pev-email")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
                    <InlineFieldError errors={fieldErrors} id="pev-email" />
                    <label className="block" htmlFor="pev-phone"><span className={labelClass}>Phone{req}</span><input id="pev-phone" className={inputCls} type="tel" inputMode="tel" required aria-required="true" {...invalidProps(fieldErrors, "pev-phone")} value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhoneTouched(true)} autoComplete="tel" /></label>
                    <InlineFieldError errors={fieldErrors} id="pev-phone" />
                    <label className="block" htmlFor="pev-lodge"><span className={labelClass}>Lodge</span>
                      <select id="pev-lodge" className={inputCls} value={lodge} onChange={(e) => setLodge(e.target.value as any)}>
                        <option value="Weybridge">Weybridge Lodge</option><option value="Astolat">Astolat Lodge</option><option value="Other">Another lodge</option><option value="Guest">Guest / not a Freemason</option>
                      </select>
                    </label>
                  </fieldset>

                  <fieldset className="space-y-3">
                    <legend className="font-serif text-xl text-foreground mb-2">Tickets</legend>
                    <Stepper label="Adults" value={adults} onChange={setAdults} hint={formatGBP(ev.adult_price_pence!)} />
                    <Stepper label="Children" value={children} onChange={setChildren} hint={`${formatGBP(ev.child_price_pence!)} · aged ${CHILD_MAX_AGE} and under`} />
                    <p className="text-right text-lg text-foreground" aria-live="polite"><Users className="inline w-4 h-4 mr-1 text-gold-dark" aria-hidden="true" />Total: <strong>{formatGBP(subtotal)}</strong></p>
                  </fieldset>

                  {(adults + children) > 0 && (
                    <GuestRowsFieldset errors={fieldErrors} adultRows={adultRows} childRows={childRows} setAdultRows={setAdultRows} setChildRows={setChildRows} dietaryChoices={ev.dietary_choices}
                      {...(content && mods.courses && { renderExtra: (child: boolean, i: number) => {
                        const k = `${child ? "c" : "a"}-${i}`;
                        return <CourseSelects content={content} modules={ev.modules} eventType={ev.event_type!} isChild={child} guestLabel={child ? `Child ${i + 1}` : `Adult ${i + 1}`}
                          value={courseSel[k] ?? {}} onChange={(v) => setCourseSel((s) => ({ ...s, [k]: v }))} />;
                      } })} />
                  )}

                  {content && mods.catalogue && showSection("drinks") && <CatalogueSteppers content={content} qty={itemQty} onChange={setItemQty} />}

                  {canDeposit && (
                    <PaymentPlanFieldset plan={activePlan} onChange={setPlan} dueDateLabel={dueLabel}
                      depositLabel={orderPence > 0 ? `${depositLineName(Number(ev.deposit_percent), orderPence)}: ${formatGBP(depositPence(orderPence, Number(ev.deposit_percent)))}` : "Deposit"} />
                  )}

                  <PaymentMethodFieldset method={method} onChange={setMethod} {...(activePlan === "deposit" && { allowed: planMethods("deposit") })} />

                  {feeEnabled && <FeeAndSummary subtotal={quote.chargePence} feePence={feePence} total={total} method={method} coverFee={coverFee} onCoverFee={setCoverFee} hideSummary={isDepositNow} />}
                  {isDepositNow && (
                    <PayNowSummary
                      rows={[["Order total", orderPence], ["Deposit now", quote.chargePence], ...(feePence > 0 ? [[method === "card" ? "Card fee" : "Processing fee", feePence] as [string, number]] : [])]}
                      totalLabel="Pay now" total={total}
                      note={`Balance of ${formatGBP(quote.balanceAfterPence)} due by ${dueLabel}. We will email you a secure link to pay it.`} />
                  )}

                  {error && <p role="alert" className="text-destructive font-semibold">{error}</p>}
                  <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] disabled:opacity-60">
                    {submitting ? "Please wait…" : method === "bank_transfer" ? `Reserve and get bank details · ${formatGBP(total)}` : `Continue to payment · ${formatGBP(total)}`}
                  </button>
                </form>
              )}
            </div>
          </section>

          <section className="py-20 md:py-28 bg-navy" aria-labelledby="next-heading">
            <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
              <h2 id="next-heading" className="font-serif text-3xl text-gold">Curious about Freemasonry?</h2>
              <p className="mt-4 font-sans text-background/90">Weybridge Lodge is a friendly Masonic Lodge in Surrey. If you are not yet a member, see what a first visit is like or take our 2-minute quiz.</p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/freemason-initiation-night" className="inline-flex items-center justify-center min-h-[48px] px-6 bg-gold-shimmer text-accent-foreground font-semibold rounded-sm">First Visit Guide <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" /></Link>
                <Link to="/quiz" className="inline-flex items-center justify-center min-h-[48px] px-6 border border-gold text-gold font-semibold rounded-sm">Take the 2-Min Quiz</Link>
                <Link to="/events" className="inline-flex items-center justify-center min-h-[48px] px-6 border border-gold text-gold font-semibold rounded-sm">All events</Link>
              </div>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
