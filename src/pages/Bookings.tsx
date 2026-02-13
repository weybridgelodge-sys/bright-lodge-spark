import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Shirt, CalendarClock, UtensilsCrossed } from "lucide-react";
import { useState } from "react";

const meetingDetails = [
  { icon: Calendar, label: "Meeting Date", value: "Wednesday, 18th February 2026" },
  { icon: Clock, label: "Meeting Times", value: "Tyling at 5.30 pm prompt, Festive Board Dining at 7:45 pm" },
  { icon: MapPin, label: "Location", value: "Guildford Masonic Centre, Hitherbury Close, Portsmouth Road, Guildford GU2 4DR" },
  { icon: Shirt, label: "Dress Code", value: "Normal Masonic attire — Provincial, Black or Craft Tie, Dark Suit and White Gloves" },
  { icon: CalendarClock, label: "Booking Deadline", value: "Wednesday, 11th February 2026" },
];

const menuItems = [
  { course: "Entree", dish: "Halloumi, Carrot, Orange & Watercress Salad", description: "With honey & mustard dressing." },
  { course: "Main", dish: "Irish Stew with Soda Bread", description: "Lamb, smoked bacon, root vegetables, potatoes & pearl barley, slowly cooked." },
  { course: "Dessert", dish: "Warm Chocolate Brownie (Gluten-Free)", description: "Served with sauce & ice cream." },
  { course: "Cheese & Port", dish: "Worshipful Masters' Cheese & Port", description: "Platters of Cheese & Biscuits with a glass of Port, courtesy of the Worshipful Master." },
  { course: "To Finish", dish: "Tea or Coffee", description: "" },
];

const guestCountOptions = [
  { value: "0", label: "Just Myself" },
  { value: "1", label: "1 Guest" },
  { value: "2", label: "2 Guests" },
  { value: "3", label: "3 Guests" },
  { value: "4", label: "4 Guests" },
];

const Bookings = () => {
  const [step, setStep] = useState(1);
  const [guestCount, setGuestCount] = useState("0");

  const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const labelClass = "block text-sm font-sans font-medium text-foreground mb-1";

  const numGuests = parseInt(guestCount, 10);

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Dining & Bookings"
          subtitle="Join us for an unforgettable evening"
        />

        {/* Event Introduction */}
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mb-6" />
              <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4">
                Double Initiation — February Meeting
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                W Bro. Julien Tidmarsh, Worshipful Master of Weybridge Lodge No. 6787, cordially invites you to attend a Double Initiation Meeting on <strong>Wednesday, 18th February 2026, commencing at 5.30 pm</strong>.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                Weybridge Lodge is delighted to announce a truly special occasion: a double initiation ceremony welcoming two new candidates into Freemasonry. In addition, we will be honoured to receive an official visit from the <strong>Provincial Grand Master, RW Nicholas Burger</strong>.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed mb-4">
                For those who remember their own initiation, this is a chance to revisit the solemnity and symbolism of that first step. When shared between two candidates, it takes on a deeper resonance as these initiates begin their Masonic journey side by side.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed">
                Following the ceremony, we'll gather for a festive board filled with cheer, good food, and heartfelt fellowship. Let's come together to welcome our newest members and celebrate the enduring spirit of Freemasonry.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Meeting Details */}
        <section className="py-20 md:py-28 bg-navy-gradient">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-primary-foreground">The Useful Stuff</h2>
            </motion.div>

            <div className="space-y-6">
              {meetingDetails.map((detail, i) => (
                <motion.div
                  key={detail.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="flex items-start gap-4"
                >
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground">
                <UtensilsCrossed className="inline w-8 h-8 text-gold mr-3 -mt-1" aria-hidden="true" />
                Festive Board Menu
              </h2>
            </motion.div>

            <div className="space-y-6 max-w-xl mx-auto">
              {menuItems.map((item, i) => (
                <motion.div
                  key={item.course}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="text-center"
                >
                  <p className="text-gold text-xs font-sans uppercase tracking-widest mb-1">{item.course}</p>
                  <h3 className="text-lg font-serif text-foreground mb-1">{item.dish}</h3>
                  {item.description && (
                    <p className="text-muted-foreground font-sans text-sm">{item.description}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Booking Form */}
        <section className="py-20 md:py-28 bg-navy-gradient" aria-labelledby="booking-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 id="booking-heading" className="text-3xl md:text-4xl font-serif text-primary-foreground mb-4">Booking Form</h2>
              <p className="text-primary-foreground/70 font-sans text-sm leading-relaxed mb-2">
                Please complete the form below for yourself and any guests. Online payments can be made using Debit and Credit Cards. Bank transfers are also accepted.
              </p>
              <p className="text-gold font-sans text-sm font-semibold">
                ALL BOOKINGS MUST BE RECEIVED BY WEDNESDAY, 11th FEBRUARY.
              </p>
              <p className="text-primary-foreground/60 font-sans text-xs mt-2">
                Queries? Email{" "}
                <a href="mailto:assistantsecretary@weybridgelodge.org.uk" className="text-gold hover:text-gold-light transition-colors">
                  assistantsecretary@weybridgelodge.org.uk
                </a>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {/* Everest Forms compatible multi-step form */}
              <form
                method="post"
                id="everest-forms-booking"
                className="bg-card rounded-sm border border-border shadow-lg p-5 sm:p-8"
              >
                {/* Step indicators */}
                <div className="flex items-center justify-center gap-2 mb-8" role="tablist" aria-label="Form steps">
                  {[1, 2, 3].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStep(s)}
                      role="tab"
                      aria-selected={step === s}
                      aria-label={`Step ${s}${s === 1 ? ": Your Details" : s === 2 ? ": Meeting Options" : ": Payment"}`}
                      className={`w-8 h-8 rounded-full text-xs font-sans font-semibold transition-colors ${
                        step === s
                          ? "bg-gold text-accent-foreground"
                          : step > s
                          ? "bg-gold/30 text-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Step 1: Your Details */}
                <fieldset className={step === 1 ? "block" : "hidden"}>
                  <legend className="text-lg font-serif text-foreground mb-6">Your Details</legend>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="evf-title" className={labelClass}>Title <span className="text-destructive">*</span></label>
                      <select id="evf-title" name="evf-title" required className={selectClass}>
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
                        <label htmlFor="evf-first-name" className={labelClass}>First Name <span className="text-destructive">*</span></label>
                        <input type="text" id="evf-first-name" name="evf-first-name" required className={inputClass} placeholder="First name" />
                      </div>
                      <div>
                        <label htmlFor="evf-last-name" className={labelClass}>Last Name <span className="text-destructive">*</span></label>
                        <input type="text" id="evf-last-name" name="evf-last-name" required className={inputClass} placeholder="Last name" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="evf-lodge" className={labelClass}>Lodge Name & No. <span className="text-destructive">*</span></label>
                      <input type="text" id="evf-lodge" name="evf-lodge" required className={inputClass} placeholder="e.g. Weybridge Lodge No. 6787" />
                    </div>

                    <div>
                      <label htmlFor="evf-email" className={labelClass}>Email <span className="text-destructive">*</span></label>
                      <input type="email" id="evf-email" name="evf-email" required className={inputClass} placeholder="you@example.com" />
                    </div>

                    <div>
                      <label htmlFor="evf-phone" className={labelClass}>Mobile Phone No. <span className="text-destructive">*</span></label>
                      <input type="tel" id="evf-phone" name="evf-phone" required className={inputClass} placeholder="07xxx xxx xxx" />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                    >
                      Next
                    </button>
                  </div>
                </fieldset>

                {/* Step 2: Meeting Options */}
                <fieldset className={step === 2 ? "block" : "hidden"}>
                  <legend className="text-lg font-serif text-foreground mb-6">Meeting Options</legend>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="evf-meeting-option" className={labelClass}>Meeting Options <span className="text-destructive">*</span></label>
                      <select id="evf-meeting-option" name="evf-meeting-option" required className={selectClass}>
                        <option value="">Select option</option>
                        <option value="meeting-and-festive-board">Attending Meeting + Festive Board</option>
                        <option value="meeting-only">Attending Meeting ONLY</option>
                        <option value="apologies">Not Attending (Apologies for absence)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="evf-guests" className={labelClass}>Are You Bringing Any Guests? <span className="text-destructive">*</span></label>
                      <select
                        id="evf-guests"
                        name="evf-guests"
                        required
                        className={selectClass}
                        value={guestCount}
                        onChange={(e) => setGuestCount(e.target.value)}
                      >
                        {guestCountOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="evf-meal-self" className={labelClass}>Meal Option for Yourself</label>
                      <select id="evf-meal-self" name="evf-meal-self" className={selectClass}>
                        <option value="three-course">Three Course Dinner (Starter, Main, Dessert) — £32.00</option>
                      </select>
                    </div>

                    {/* Dynamic guest fields */}
                    {Array.from({ length: numGuests }, (_, i) => (
                      <div key={i} className="border-t border-border pt-4 space-y-3">
                        <h4 className="text-sm font-serif text-foreground">Guest {i + 1} Details</h4>
                        <div>
                          <label htmlFor={`evf-guest-${i + 1}-name`} className={labelClass}>Guest {i + 1} Name <span className="text-destructive">*</span></label>
                          <input type="text" id={`evf-guest-${i + 1}-name`} name={`evf-guest-${i + 1}-name`} required className={inputClass} placeholder={`Guest ${i + 1} full name`} />
                        </div>
                        <div>
                          <label htmlFor={`evf-guest-${i + 1}-meal`} className={labelClass}>Meal Option for Guest {i + 1}</label>
                          <select id={`evf-guest-${i + 1}-meal`} name={`evf-guest-${i + 1}-meal`} className={selectClass}>
                            <option value="three-course">Three Course Dinner — £32.00</option>
                          </select>
                        </div>
                      </div>
                    ))}

                    <div className="border-t border-border pt-4">
                      <label htmlFor="evf-dietary" className={labelClass}>Allergy / Dietary Requirements</label>
                      <textarea
                        id="evf-dietary"
                        name="evf-dietary"
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Please note any dietary allergies or requirements for yourself or guests"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="border border-border text-foreground px-6 py-3 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                    >
                      Next
                    </button>
                  </div>
                </fieldset>

                {/* Step 3: Payment */}
                <fieldset className={step === 3 ? "block" : "hidden"}>
                  <legend className="text-lg font-serif text-foreground mb-6">Payment</legend>

                  <div className="space-y-4">
                    <div>
                      <p className={labelClass}>Payment Method <span className="text-destructive">*</span></p>
                      <div className="space-y-2 mt-1" role="radiogroup" aria-labelledby="payment-method-label">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="radio" name="evf-payment-method" value="card" required className="mt-1 accent-[hsl(var(--gold))]" />
                          <span className="text-sm font-sans text-foreground">Debit / Credit card payment (Preferred method)</span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="radio" name="evf-payment-method" value="bank-transfer" className="mt-1 accent-[hsl(var(--gold))]" />
                          <span className="text-sm font-sans text-foreground">
                            Bank Transfer<br />
                            <span className="text-muted-foreground text-xs">Sort code: 30-99-80 · Account: 14878862 · Ref: Dining+Your Surname</span>
                          </span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="radio" name="evf-payment-method" value="cash-cheque" className="mt-1 accent-[hsl(var(--gold))]" />
                          <span className="text-sm font-sans text-foreground">Cash / Cheque on night (Please see Treasurer on arrival)</span>
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <p className={labelClass}>Are you happy to cover the payment fees charged to us by our payment provider?</p>
                      <div className="space-y-2 mt-1" role="radiogroup" aria-labelledby="cover-fees-label">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="radio" name="evf-cover-fees" value="yes" className="accent-[hsl(var(--gold))]" />
                          <span className="text-sm font-sans text-foreground">Yes</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="radio" name="evf-cover-fees" value="no" className="accent-[hsl(var(--gold))]" />
                          <span className="text-sm font-sans text-foreground">No</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="border border-border text-foreground px-6 py-3 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="bg-gold-shimmer text-accent-foreground px-8 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                    >
                      Submit Booking
                    </button>
                  </div>
                </fieldset>
              </form>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Bookings;
