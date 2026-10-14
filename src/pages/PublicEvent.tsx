import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Calendar, Clock, MapPin, Minus, Plus, Star, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { calcCardFeePence, eventFeePence } from "@/lib/cardFee";
import { supabase } from "@/integrations/supabase/client";
import { readFunctionError } from "@/lib/functionError";
import {
  calcEventTotalPence, CHILD_MAX_AGE, DEFAULT_VENUE, eventBookingState, fetchPublicEvent, formatEventDate,
  formatGBP, formatTime, isChildAge, seatsLeft, type PublicEvent as Ev,
} from "@/lib/publicEvents";

type GuestRow = { name: string; age: string; dietary: string; choice: string };
type PayMethod = "card" | "pay_by_bank" | "bank_transfer";
const LODGES = ["Weybridge", "Astolat", "Other", "Guest"] as const;

const inputCls = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-sans ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[48px]";
const labelClass = "block text-sm font-sans font-medium text-foreground mb-1";
const req = <span className="text-destructive"> *</span>;

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

function Stepper({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-border bg-card rounded-sm p-3">
      <div>
        <p className="font-sans font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} onClick={() => onChange(Math.max(0, value - 1))}
          className="w-12 h-12 inline-flex items-center justify-center rounded-sm border border-border text-foreground"><Minus className="w-4 h-4" aria-hidden="true" /></button>
        <span className="w-8 text-center font-semibold text-foreground" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(20, value + 1))}
          className="w-12 h-12 inline-flex items-center justify-center rounded-sm border border-border text-foreground"><Plus className="w-4 h-4" aria-hidden="true" /></button>
      </div>
    </div>
  );
}

const resize = (rows: GuestRow[], n: number) =>
  n <= rows.length ? rows.slice(0, n) : [...rows, ...Array.from({ length: n - rows.length }, () => ({ name: "", age: "", dietary: "", choice: "" }))];

export default function PublicEvent() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const [ev, setEv] = useState<Ev | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lodge, setLodge] = useState<(typeof LODGES)[number]>("Weybridge");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [adultRows, setAdultRows] = useState<GuestRow[]>([{ name: "", age: "", dietary: "", choice: "" }]);
  const [childRows, setChildRows] = useState<GuestRow[]>([]);
  const [method, setMethod] = useState<PayMethod>("card");
  const [coverFee, setCoverFee] = useState(true);
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPublicEvent(slug).then((e) => { setEv(e); setLoading(false); });
  }, [slug]);

  useEffect(() => setAdultRows((r) => resize(r, adults)), [adults]);
  useEffect(() => setChildRows((r) => resize(r, children)), [children]);

  const subtotal = ev ? calcEventTotalPence(adults, children, ev.adult_price_pence, ev.child_price_pence) : 0;
  const feePence = eventFeePence(subtotal, method, coverFee);
  const total = subtotal + feePence;
  const state = ev ? eventBookingState(ev) : "closed";
  const left = ev ? seatsLeft(ev) : null;
  const festive = ev?.theme === "christmas";
  const venue = ev?.venue || DEFAULT_VENUE;
  const title = ev?.public_title || "";
  const time = ev ? [formatTime(ev.start_time), formatTime(ev.end_time)].filter(Boolean).join(" – ") : "";

  const schema = useMemo(() => {
    if (!ev) return [];
    const offers = [
      ev.adult_price_pence != null && { "@type": "Offer", name: "Adult", price: (ev.adult_price_pence / 100).toFixed(2), priceCurrency: "GBP", availability: state === "open" ? "https://schema.org/InStock" : "https://schema.org/SoldOut", url: `https://weybridgelodge.org.uk/events/${ev.slug}` },
      ev.child_price_pence != null && { "@type": "Offer", name: `Child (aged ${CHILD_MAX_AGE} and under)`, price: (ev.child_price_pence / 100).toFixed(2), priceCurrency: "GBP", url: `https://weybridgelodge.org.uk/events/${ev.slug}` },
    ].filter(Boolean);
    return [
      {
        "@context": "https://schema.org", "@type": "Event", name: title,
        startDate: ev.start_time ? `${ev.event_date}T${ev.start_time.slice(0, 5)}` : ev.event_date,
        ...(ev.end_time && { endDate: `${ev.event_date}T${ev.end_time.slice(0, 5)}` }),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        description: ev.tagline || ev.intro_copy || title,
        location: { "@type": "Place", name: "Guildford Masonic Centre", address: { "@type": "PostalAddress", streetAddress: "Weybourne House, Hitherbury Close", addressLocality: "Guildford", addressRegion: "Surrey", postalCode: "GU2 4DR", addressCountry: "GB" } },
        organizer: ev.hosting_lodges.map((n) => ({ "@type": "Organization", name: n })),
        ...(offers.length && { offers }),
      },
      breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Events", url: "/events" }, { name: title, url: `/events/${ev.slug}` }]),
    ];
  }, [ev, state, title]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (honeypot) return;
    if (!ev) return;
    if (!name.trim() || !email.trim()) { setError("Please enter your name and email."); return; }
    if (adults + children < 1) { setError("Please add at least one guest."); return; }
    if ([...adultRows, ...childRows].some((g) => !g.name.trim())) { setError("Please give a name for every guest."); return; }
    if (childRows.some((g) => !isChildAge(g.age === "" ? null : Number(g.age)))) { setError(`Please give each child's age (${CHILD_MAX_AGE} and under).`); return; }
    if (eventBookingState(ev, new Date(), adults + children) !== "open") { setError("Sorry, there are not enough places left for your party."); return; }
    setSubmitting(true);
    const guests = [
      ...adultRows.map((g) => ({ name: g.name.trim(), age: g.age ? Number(g.age) : null, is_child: false, dietary: g.dietary.trim(), dietary_choice: g.choice || null })),
      ...childRows.map((g) => ({ name: g.name.trim(), age: Number(g.age), is_child: true, dietary: g.dietary.trim(), dietary_choice: g.choice || null })),
    ];
    const { data, error: fnErr } = await supabase.functions.invoke("create-event-checkout", {
      body: { slug, contact_name: name.trim(), contact_email: email.trim(), contact_phone: phone.trim(), lodge_label: lodge, adults, children, guests, payment_method: method, cover_fee: method === "card" && coverFee, origin: window.location.origin, website: "" },
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

  const description = `${title} on ${formatEventDate(ev.event_date)} at Guildford Masonic Centre, GU2 4DR. Hosted by ${ev.hosting_lodges.join(" and ") || "Weybridge Lodge No. 6787"} — Freemasons in Guildford. Book online.`.slice(0, 300);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO title={title} description={description} canonical={`/events/${ev.slug}`} type="website" schema={schema} />
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
                <li className="flex items-center justify-center gap-2"><MapPin className="w-4 h-4 text-gold" aria-hidden="true" />Guildford Masonic Centre, GU2 4DR</li>
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
                    ? `Celebrate the season with friends and family at Guildford Masonic Centre. ${ev.hosting_lodges.join(" and ") || "Weybridge Lodge"} warmly invite members, families and guests — you do not need to be a Freemason to come along. It is a relaxed way to meet a friendly Masonic Lodge in Surrey and the Freemasons in Guildford.`
                    : "Members, families and guests are all welcome — you do not need to be a Freemason to attend. It is a relaxed way to meet a friendly Masonic Lodge in Surrey and the Freemasons in Guildford."}
                </p>
              )}
              <p className="text-muted-foreground"><MapPin className="inline w-4 h-4 mr-1 text-gold-dark" aria-hidden="true" />{venue.replace(/GU\d\s?\d\w\w/i, "GU2 4DR")}</p>
            </div>
          </section>

          {(ev.useful_stuff.parking || ev.useful_stuff.timings || ev.useful_stuff.access || ev.dress_code) && (
            <section className="py-20 md:py-28 bg-card border-t border-border" aria-labelledby="useful-heading">
              <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
                <h2 id="useful-heading" className="font-serif text-3xl text-foreground text-center">The Useful Stuff</h2>
                <Divider festive={festive} />
                <dl className="grid sm:grid-cols-2 gap-4 font-sans">
                  {([["Timings", ev.useful_stuff.timings], ["Dress code", ev.dress_code], ["Parking", ev.useful_stuff.parking], ["Access", ev.useful_stuff.access]] as const)
                    .filter(([, v]) => !!v).map(([k, v]) => (
                      <div key={k} className="border border-border bg-background rounded-sm p-4">
                        <dt className="font-semibold text-foreground">{k}</dt><dd className="text-muted-foreground">{v}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            </section>
          )}

          {ev.menu_items.length > 0 && (
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

          {ev.highlights.length > 0 && (
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
                  {/* HONEYPOT — off-screen (not display:none) so bots still fill it; checked again server-side. */}
                  <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>
                    <label htmlFor="pev-website">Website (do not fill this in)</label>
                    <input id="pev-website" name="website" type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
                  </div>
                  <fieldset className="space-y-3">
                    <legend className="font-serif text-xl text-foreground mb-2">Your details</legend>
                    <label className="block" htmlFor="pev-name"><span className={labelClass}>Full name{req}</span><input id="pev-name" className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
                    <label className="block" htmlFor="pev-email"><span className={labelClass}>Email{req}</span><input id="pev-email" className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
                    <label className="block" htmlFor="pev-phone"><span className={labelClass}>Phone</span><input id="pev-phone" className={inputCls} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
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
                    <fieldset className="space-y-3">
                      <legend className="font-serif text-xl text-foreground mb-2">Guest names and dietary needs</legend>
                      {[...adultRows.map((g, i) => ({ g, i, child: false })), ...childRows.map((g, i) => ({ g, i, child: true }))].map(({ g, i, child }) => {
                        const set = (patch: Partial<GuestRow>) => (child ? setChildRows : setAdultRows)((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
                        return (
                          <div key={`${child}-${i}`} className="border border-border bg-background rounded-sm p-3 space-y-2">
                            <p className="text-sm font-semibold text-foreground">{child ? `Child ${i + 1}` : `Adult ${i + 1}`}</p>
                            <div className="grid sm:grid-cols-[1fr_6rem] gap-2">
                              <label className="block"><span className="sr-only">Name</span><input className={inputCls} placeholder="Name" value={g.name} onChange={(e) => set({ name: e.target.value })} /></label>
                              {child && <label className="block"><span className="sr-only">Age</span><input className={inputCls} type="number" min={0} max={CHILD_MAX_AGE} placeholder="Age" value={g.age} onChange={(e) => set({ age: e.target.value })} /></label>}
                            </div>
                            {ev.dietary_choices.length > 0 && (
                              <label className="block"><span className="sr-only">Menu choice</span>
                                <select className={inputCls} value={g.choice} onChange={(e) => set({ choice: e.target.value })}>
                                  <option value="">Standard menu</option>
                                  {ev.dietary_choices.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </label>
                            )}
                            <label className="block"><span className="sr-only">Dietary needs</span><input className={inputCls} placeholder="Dietary needs or allergies (optional)" value={g.dietary} maxLength={500} onChange={(e) => set({ dietary: e.target.value })} /></label>
                          </div>
                        );
                      })}
                    </fieldset>
                  )}

                  <fieldset className="space-y-2">
                    <legend className="font-serif text-xl text-foreground mb-2">Payment</legend>
                    {([
                      ["card", "Card", "Visa, Mastercard, Apple Pay or Google Pay"],
                      ["pay_by_bank", "Pay by Bank", "Pay instantly from your banking app"],
                      ["bank_transfer", "Bank transfer", "We'll show you the account details and a reference"],
                    ] as const).map(([v, l, h]) => (
                      <label key={v} className={`flex items-center gap-3 min-h-[56px] w-full border rounded-sm px-4 py-2 cursor-pointer bg-background ${method === v ? "border-gold" : "border-border"}`}>
                        <input type="radio" name="pay" value={v} checked={method === v} onChange={() => setMethod(v)} className="w-5 h-5 shrink-0 accent-[hsl(var(--gold))]" />
                        <span><span className="block font-semibold text-foreground">{l}</span><span className="block text-sm text-muted-foreground">{h}</span></span>
                      </label>
                    ))}
                  </fieldset>

                  {method === "card" && subtotal > 0 && (
                    <div className="border-t border-border pt-4 space-y-3">
                      <p className="block text-sm font-sans font-medium text-foreground mb-1">Cover the Stripe card processing fee?</p>
                      <div className="space-y-2 mt-1" role="radiogroup" aria-label="Card fee preference">
                        <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
                          <input type="radio" name="fee" checked={coverFee} onChange={() => setCoverFee(true)} className="w-5 h-5 shrink-0 accent-[hsl(var(--gold))]" />
                          <span className="text-sm font-sans text-foreground">Yes — add {formatGBP(calcCardFeePence(subtotal))} to my total</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
                          <input type="radio" name="fee" checked={!coverFee} onChange={() => setCoverFee(false)} className="w-5 h-5 shrink-0 accent-[hsl(var(--gold))]" />
                          <span className="text-sm font-sans text-foreground">No — the Lodge will cover it</span>
                        </label>
                      </div>
                      <div className="bg-background border border-border rounded-sm p-4 space-y-1">
                        <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatGBP(subtotal)}</span></div>
                        {feePence > 0 && <div className="flex justify-between text-sm font-sans"><span className="text-muted-foreground">Card fee</span><span className="text-foreground">{formatGBP(feePence)}</span></div>}
                        <div className="flex justify-between text-base font-sans font-semibold border-t border-border pt-2 mt-2"><span className="text-foreground">Total</span><span className="text-gold-dark">{formatGBP(total)}</span></div>
                      </div>
                    </div>
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
