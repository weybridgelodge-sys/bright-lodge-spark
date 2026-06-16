import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { eventSchema, breadcrumbSchema } from "@/components/SEO";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";
import { StripeEmbeddedCheckoutPanel, type BookingLineItem } from "@/components/payments/StripeEmbeddedCheckout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, Shirt, CalendarClock, UtensilsCrossed, CheckCircle, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

const meetingDetails = [
  { icon: Calendar, label: "Meeting Date", value: "Wednesday, 15th April 2026" },
  { icon: Clock, label: "Meeting Times", value: "Tyling at 6.00 pm prompt, Festive Board Dining at 7:45 pm" },
  { icon: MapPin, label: "Location", value: "Guildford Masonic Centre, Hitherbury Close, Portsmouth Road, Guildford GU2 4DR" },
  { icon: Shirt, label: "Dress Code", value: "Normal Masonic attire — Provincial, Black or Craft Tie, Dark Suit and White Gloves" },
  { icon: CalendarClock, label: "Booking Deadline", value: "Wednesday, 8th April 2026" },
];

const menuItems = [
  { course: "Entree", dish: "Halloumi, Carrot, Orange & Watercress Salad", description: "With honey & mustard dressing." },
  { course: "Main", dish: "Irish Stew with Soda Bread", description: "Lamb, smoked bacon, root vegetables, potatoes & pearl barley, slowly cooked." },
  { course: "Dessert", dish: "Warm Chocolate Brownie (Gluten-Free)", description: "Served with sauce & ice cream." },
  { course: "Cheese & Port", dish: "Worshipful Masters' Cheese & Port", description: "Platters of Cheese & Biscuits with a glass of Port, courtesy of the Worshipful Master." },
  { course: "To Finish", dish: "Tea or Coffee", description: "" },
];

const SEAT_PRICE_PENCE = 3200; // £32.00

type Guest = { name: string };

const Bookings = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "submitting" | "meeting-only" | "apologies" | "error">("idle");

  // Step 1
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [lodge, setLodge] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [meetingOption, setMeetingOption] = useState<"meeting-and-festive-board" | "meeting-only" | "apologies" | "">("");
  const [guestCount, setGuestCount] = useState<number>(0);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [dietary, setDietary] = useState("");

  // Step 3
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank-transfer" | "cash-cheque" | "">("");
  const [coverFee, setCoverFee] = useState(false);

  const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const labelClass = "block text-sm font-sans font-medium text-foreground mb-1";

  const updateGuestCount = (n: number) => {
    setGuestCount(n);
    setGuests((prev) => {
      if (n > prev.length) return [...prev, ...Array.from({ length: n - prev.length }, () => ({ name: "" }))];
      return prev.slice(0, n);
    });
  };

  const seatsToCharge = meetingOption === "meeting-and-festive-board" ? 1 + guestCount : 0;
  const subtotalPence = seatsToCharge * SEAT_PRICE_PENCE;
  const feePence = paymentMethod === "card" && coverFee ? Math.ceil(subtotalPence * 0.02) : 0;
  const totalPence = subtotalPence + feePence;

  const fmtGbp = (p: number) => `£${(p / 100).toFixed(2)}`;

  const validateStep1 = (): boolean => {
    if (!title || !firstName.trim() || !lastName.trim() || !lodge.trim() || !email.trim() || !phone.trim()) {
      toast({ title: "Missing details", description: "Please fill in all required fields.", variant: "destructive" });
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!meetingOption) {
      toast({ title: "Select a meeting option", variant: "destructive" });
      return false;
    }
    if (meetingOption === "meeting-and-festive-board" && guests.some((g) => !g.name.trim())) {
      toast({ title: "Guest names required", description: "Please name each guest.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const lineItems: BookingLineItem[] = useMemo(() => {
    if (seatsToCharge === 0) return [];
    return [
      {
        label: "Festive Board — 15 April 2026 (per head)",
        qty: seatsToCharge,
        unit_price_pence: SEAT_PRICE_PENCE,
      },
    ];
  }, [seatsToCharge]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    if (meetingOption === "apologies" || meetingOption === "meeting-only") {
      setSubmissionStatus("submitting");
      try {
        const { data, error } = await supabase.functions.invoke("save-meeting-response", {
          body: {
            event_key: "festive_board_april_2026",
            event_label: "Festive Board — 15 April 2026",
            contact_name: `${title} ${firstName} ${lastName}`.trim(),
            contact_email: email,
            contact_phone: phone,
            meeting_option: meetingOption,
            details: {
              title, firstName, lastName, lodge,
              meetingOption,
              guestCount,
              guests,
              dietary,
              paymentMethod,
            },
            environment: getStripeEnvironment(),
          },
        });
        if (error || !data?.bookingId) {
          throw new Error(error?.message || "Failed to save response");
        }
        setSubmissionStatus(meetingOption);
      } catch (err: any) {
        setSubmissionStatus("error");
        toast({ title: "Error", description: err?.message || "Could not save your response. Please try again.", variant: "destructive" });
      }
      return;
    }

    if (!paymentMethod) {
      toast({ title: "Choose a payment method", variant: "destructive" });
      return;
    }
    if (paymentMethod !== "card") {
      toast({
        title: "Booking received",
        description: paymentMethod === "bank-transfer"
          ? "Please complete your bank transfer using the reference shown."
          : "Please bring cash or cheque on the night.",
      });
      return;
    }
    setShowCheckout(true);
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Dining & Bookings | Masonic Meeting Guildford"
        description="Book your place at the next Weybridge Lodge meeting at the South West Surrey Masonic Centre, Guildford. View the festive board menu and reserve your seat."
        canonical="/bookings"
        schema={[
          eventSchema({
            name: "Initiation Ceremony — April Meeting",
            date: "2026-04-15T18:00:00",
            description: "Initiation ceremony at Weybridge Lodge No. 6787 welcoming a new candidate into Freemasonry.",
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Bookings", url: "/bookings" },
          ]),
        ]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <PaymentTestModeBanner />
      <Header />
      <main id="main-content">
        <PageHeader title="Dining & Bookings" subtitle="Join us for an unforgettable evening" />

        {/* Event Introduction */}
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4">Initiation Ceremony — April Meeting</h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                W Bro. Julien Tidmarsh, Worshipful Master of Weybridge Lodge No. 6787, cordially invites you to attend an Initiation Meeting on <strong>Wednesday, 15th April 2026, commencing at 6.00 pm</strong>.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                Weybridge Lodge is delighted to announce a truly special occasion: another initiation ceremony welcoming one more new candidate into Freemasonry, our fifth of the year.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                For those who remember their own initiation, this is a chance to revisit the solemnity and symbolism of that first step. Come and share this experience with us as we witness our new initiate begin their Masonic journey.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Following the ceremony, we'll gather for a festive board filled with cheer, good food, and heartfelt fellowship. Let's come together to welcome our newest member and celebrate the enduring spirit of Freemasonry.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Meeting Details */}
        <section className="py-20 md:py-28 bg-navy-gradient">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-primary-foreground">The Useful Stuff</h2>
            </motion.div>
            <div className="space-y-6">
              {meetingDetails.map((detail, i) => (
                <motion.div key={detail.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }} className="flex items-start gap-4">
                  <detail.icon className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-sans font-medium text-primary-foreground text-sm">{detail.label}</p>
                    <p className="text-primary-foreground/70 font-sans text-sm">{detail.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Menu */}
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground">
                <UtensilsCrossed className="inline w-8 h-8 text-gold mr-3 -mt-1" aria-hidden="true" />
                Festive Board Menu
              </h2>
            </motion.div>
            <div className="space-y-6 max-w-xl mx-auto">
              {menuItems.map((item, i) => (
                <motion.div key={item.course} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }} className="text-center">
                  <p className="text-gold text-xs font-sans uppercase tracking-widest mb-1">{item.course}</p>
                  <h3 className="text-lg font-serif text-foreground mb-1">{item.dish}</h3>
                  {item.description && <p className="text-muted-foreground font-sans text-sm">{item.description}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Booking Form */}
        <section className="py-20 md:py-28 bg-navy-gradient" aria-labelledby="booking-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-8">
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 id="booking-heading" className="text-3xl md:text-4xl font-serif text-primary-foreground mb-4">Booking Form</h2>
              <p className="text-primary-foreground/70 font-sans text-sm leading-relaxed mb-2">
                Please complete the form below for yourself and any guests. Pay securely by Debit or Credit Card, or by bank transfer.
              </p>
              <p className="text-gold font-sans text-sm font-semibold">
                ALL BOOKINGS MUST BE RECEIVED BY WEDNESDAY, 8th APRIL.
              </p>
              <p className="text-primary-foreground/60 font-sans text-xs mt-2">
                Queries? Email{" "}
                <a href="mailto:assistantsecretary@weybridgelodge.org.uk" className="text-gold hover:text-gold-light transition-colors">
                  assistantsecretary@weybridgelodge.org.uk
                </a>
              </p>
            </motion.div>

            {showCheckout ? (
              <div className="bg-card rounded-sm border border-border shadow-lg p-5 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-serif text-foreground">Secure Card Payment</h3>
                  <button onClick={() => setShowCheckout(false)} className="text-sm text-muted-foreground hover:text-foreground underline">
                    Back to form
                  </button>
                </div>
                <p className="text-sm text-muted-foreground font-sans">
                  Total: <strong className="text-foreground">{fmtGbp(totalPence)}</strong>
                  {feePence > 0 && <> (includes {fmtGbp(feePence)} card fee)</>}
                </p>
                <StripeEmbeddedCheckoutPanel
                  event_key="festive_board_april_2026"
                  event_label="Festive Board — 15 April 2026"
                  contact_name={`${title} ${firstName} ${lastName}`.trim()}
                  contact_email={email}
                  contact_phone={phone}
                  cover_fee={coverFee}
                  line_items={lineItems}
                  details={{
                    title, firstName, lastName, lodge,
                    meetingOption,
                    guestCount,
                    guests,
                    dietary,
                    paymentMethod,
                  }}
                  return_url={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
                  onError={(msg) => toast({ title: "Checkout error", description: msg, variant: "destructive" })}
                />
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
                <form onSubmit={handleSubmit} className="bg-card rounded-sm border border-border shadow-lg p-5 sm:p-8">
                  {/* Step indicators */}
                  <div className="flex items-center justify-center gap-2 mb-8" role="tablist" aria-label="Form steps">
                    {[1, 2, 3].map((s) => (
                      <button key={s} type="button" onClick={() => setStep(s)} role="tab" aria-selected={step === s} aria-label={`Step ${s}`}
                        className={`w-8 h-8 rounded-full text-xs font-sans font-semibold transition-colors ${
                          step === s ? "bg-gold text-accent-foreground" : step > s ? "bg-gold/30 text-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >{s}</button>
                    ))}
                  </div>

                  {/* Step 1 */}
                  <fieldset className={step === 1 ? "block" : "hidden"}>
                    <legend className="text-lg font-serif text-foreground mb-6">Your Details</legend>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="evf-title" className={labelClass}>Title <span className="text-destructive">*</span></label>
                        <select id="evf-title" value={title} onChange={(e) => setTitle(e.target.value)} required className={selectClass}>
                          <option value="">Select title</option>
                          <option value="Bro">Bro</option>
                          <option value="W. Bro">W. Bro</option>
                          <option value="VW. Bro">VW. Bro</option>
                          <option value="RW. Bro">RW. Bro</option>
                          <option value="Mr">Mr</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="evf-first" className={labelClass}>First Name <span className="text-destructive">*</span></label>
                          <input id="evf-first" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputClass} />
                        </div>
                        <div>
                          <label htmlFor="evf-last" className={labelClass}>Last Name <span className="text-destructive">*</span></label>
                          <input id="evf-last" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="evf-lodge" className={labelClass}>Lodge Name & No. <span className="text-destructive">*</span></label>
                        <input id="evf-lodge" type="text" value={lodge} onChange={(e) => setLodge(e.target.value)} required className={inputClass} placeholder="e.g. Weybridge Lodge No. 6787" />
                      </div>
                      <div>
                        <label htmlFor="evf-email" className={labelClass}>Email <span className="text-destructive">*</span></label>
                        <input id="evf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="you@example.com" />
                      </div>
                      <div>
                        <label htmlFor="evf-phone" className={labelClass}>Mobile Phone <span className="text-destructive">*</span></label>
                        <input id="evf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClass} placeholder="07xxx xxx xxx" />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                      <button type="button" onClick={() => { if (validateStep1()) setStep(2); }} className="bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity">
                        Next
                      </button>
                    </div>
                  </fieldset>

                  {/* Step 2 */}
                  <fieldset className={step === 2 ? "block" : "hidden"}>
                    <legend className="text-lg font-serif text-foreground mb-6">Meeting Options</legend>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="evf-meeting" className={labelClass}>Meeting Options <span className="text-destructive">*</span></label>
                        <select id="evf-meeting" value={meetingOption} onChange={(e) => setMeetingOption(e.target.value as typeof meetingOption)} required className={selectClass}>
                          <option value="">Select option</option>
                          <option value="meeting-and-festive-board">Attending Meeting + Festive Board</option>
                          <option value="meeting-only">Attending Meeting ONLY</option>
                          <option value="apologies">Not Attending (Apologies for absence)</option>
                        </select>
                      </div>
                      {meetingOption === "meeting-and-festive-board" && (
                        <>
                          <div>
                            <label htmlFor="evf-guests" className={labelClass}>Are You Bringing Any Guests? <span className="text-destructive">*</span></label>
                            <select id="evf-guests" value={String(guestCount)} onChange={(e) => updateGuestCount(parseInt(e.target.value, 10))} required className={selectClass}>
                              <option value="0">Just Myself</option>
                              <option value="1">1 Guest</option>
                              <option value="2">2 Guests</option>
                              <option value="3">3 Guests</option>
                              <option value="4">4 Guests</option>
                            </select>
                          </div>
                          {guests.map((g, i) => (
                            <div key={i} className="border-t border-border pt-4">
                              <label htmlFor={`g${i}`} className={labelClass}>Guest {i + 1} Name <span className="text-destructive">*</span></label>
                              <input id={`g${i}`} type="text" value={g.name} onChange={(e) => setGuests((prev) => prev.map((x, j) => j === i ? { name: e.target.value } : x))} required className={inputClass} placeholder={`Guest ${i + 1} full name`} />
                            </div>
                          ))}
                          <div className="border-t border-border pt-4">
                            <label htmlFor="evf-dietary" className={labelClass}>Allergy / Dietary Requirements</label>
                            <textarea id="evf-dietary" rows={3} value={dietary} onChange={(e) => setDietary(e.target.value)}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              placeholder="Please note any dietary allergies or requirements for yourself or guests"
                            />
                          </div>
                          <div className="bg-warm-white border border-border rounded-sm p-4 flex items-center justify-between">
                            <span className="font-sans text-sm text-foreground">Subtotal ({seatsToCharge} × £32.00)</span>
                            <span className="font-sans font-semibold text-foreground">{fmtGbp(subtotalPence)}</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-8 flex justify-between">
                      <button type="button" onClick={() => setStep(1)} className="border border-border text-foreground px-6 py-3 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors">
                        Back
                      </button>
                      <button type="button" onClick={() => { if (validateStep2()) setStep(3); }} className="bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity">
                        Next
                      </button>
                    </div>
                  </fieldset>

                  {/* Step 3 */}
                  <fieldset className={step === 3 ? "block" : "hidden"}>
                    <legend className="text-lg font-serif text-foreground mb-6">Payment</legend>
                    <div className="space-y-4">
                      <div>
                        <p className={labelClass}>Payment Method <span className="text-destructive">*</span></p>
                        <div className="space-y-2 mt-1" role="radiogroup">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input type="radio" name="pay" value="card" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} className="mt-1 accent-[hsl(var(--gold))]" />
                            <span className="text-sm font-sans text-foreground">Debit / Credit card payment (Preferred — pay securely below)</span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input type="radio" name="pay" value="bank-transfer" checked={paymentMethod === "bank-transfer"} onChange={() => setPaymentMethod("bank-transfer")} className="mt-1 accent-[hsl(var(--gold))]" />
                            <span className="text-sm font-sans text-foreground">
                              Bank Transfer<br />
                              <span className="text-muted-foreground text-xs">Sort code: 30-99-80 · Account: 14878862 · Ref: Dining+Your Surname</span>
                            </span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input type="radio" name="pay" value="cash-cheque" checked={paymentMethod === "cash-cheque"} onChange={() => setPaymentMethod("cash-cheque")} className="mt-1 accent-[hsl(var(--gold))]" />
                            <span className="text-sm font-sans text-foreground">Cash / Cheque on night (Please see Treasurer on arrival)</span>
                          </label>
                        </div>
                      </div>

                      {paymentMethod === "card" && seatsToCharge > 0 && (
                        <div className="border-t border-border pt-4 space-y-3">
                          <p className={labelClass}>Cover the card processing fee (~2%)?</p>
                          <div className="space-y-2 mt-1" role="radiogroup">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="radio" name="fee" checked={coverFee} onChange={() => setCoverFee(true)} className="accent-[hsl(var(--gold))]" />
                              <span className="text-sm font-sans text-foreground">Yes — add {fmtGbp(Math.ceil(subtotalPence * 0.02))} to my total</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="radio" name="fee" checked={!coverFee} onChange={() => setCoverFee(false)} className="accent-[hsl(var(--gold))]" />
                              <span className="text-sm font-sans text-foreground">No — the Lodge will cover it</span>
                            </label>
                          </div>

                          <div className="bg-warm-white border border-border rounded-sm p-4 space-y-1">
                            <div className="flex justify-between text-sm font-sans">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="text-foreground">{fmtGbp(subtotalPence)}</span>
                            </div>
                            {feePence > 0 && (
                              <div className="flex justify-between text-sm font-sans">
                                <span className="text-muted-foreground">Card fee</span>
                                <span className="text-foreground">{fmtGbp(feePence)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-base font-sans font-semibold border-t border-border pt-2 mt-2">
                              <span className="text-foreground">Total</span>
                              <span className="text-gold-dark">{fmtGbp(totalPence)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-8 flex justify-between">
                      <button type="button" onClick={() => setStep(2)} className="border border-border text-foreground px-6 py-3 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors">
                        Back
                      </button>
                      <button type="submit" className="bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity">
                        {paymentMethod === "card" && seatsToCharge > 0 ? "Continue to Payment" : "Submit Booking"}
                      </button>
                    </div>
                  </fieldset>
                </form>
              </motion.div>
            )}
          </div>
        </section>

        <section className="py-16 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <Link to="/events" className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors">
              View All Events
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Bookings;
