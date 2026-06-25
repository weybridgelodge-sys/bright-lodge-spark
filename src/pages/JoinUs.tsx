import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, CheckCircle, PoundSterling, CalendarDays, Utensils, Ticket } from "lucide-react";
import EnquiryForm from "@/components/EnquiryForm";

const reasons = [
  "Make lifelong friendships with like-minded men",
  "Be part of a global network of over 6 million members",
  "Support charitable causes in your local community",
  "Develop leadership and personal skills",
  "Enjoy a rich social calendar with family events",
  "Become part of a tradition dating back centuries",
];

const JoinUs = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Join Freemasons in Guildford"
        description="Interested in becoming a Freemason in Guildford or Surrey? Join Weybridge Lodge No. 6787 — contact our Membership Secretary to start your Masonic journey today."
        canonical="/join-us"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Join Us", url: "/join-us" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Join Us"
          subtitle="How to Join Freemasonry in Guildford, Surrey"
        />

        {/* Why Join */}
        <section className="py-12 sm:py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-start">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">Why Join Freemasonry?</h2>
                <p className="text-muted-foreground font-sans leading-relaxed mb-8">
                  Freemasonry offers a unique experience that enriches lives. Whether you are looking for fellowship, personal growth, or the chance to give back to your community, membership opens doors to extraordinary opportunities.
                </p>
                <ul className="space-y-4">
                  {reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                      <span className="text-foreground font-sans text-sm">{reason}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-card rounded-sm border border-border shadow-lg p-5 sm:p-8"
              >
                <h3 className="text-xl font-serif text-foreground mb-6">Get In Touch</h3>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Phone className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">Call our Membership Secretary</p>
                      <a href="tel:07921589039" className="text-gold-dark hover:text-gold font-sans transition-colors">
                        07921 589 039
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">Email Us</p>
                      <a href="mailto:secretary@weybridgelodge.org.uk?subject=Weybridge%20Lodge%20Website%20Enquiry" className="text-gold-dark hover:text-gold font-sans transition-colors text-sm break-all">
                        secretary@weybridgelodge.org.uk
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">We Meet At</p>
                      <p className="text-muted-foreground font-sans text-sm">
                        South West Surrey Masonic Centre<br />
                        Hitherbury Close, Guildford GU2 4DR
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enquiry form — submits to submit-enquiry edge function */}
                <EnquiryForm />

              </motion.div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
              <Link
                to="/first-visit"
                className="inline-flex items-center justify-center border border-gold-dark text-gold-dark px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:bg-gold-dark hover:text-accent-foreground transition-colors"
              >
                Your Initiation Night
              </Link>
              <Link
                to="/faq"
                className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
              >
                Frequently Asked Questions
              </Link>
            </div>
          </div>
        </section>

        {/* Costs & Commitment */}
        <section className="py-12 sm:py-20 md:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <div className="h-0.5 w-16 bg-gold mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">Costs &amp; Commitment</h2>
              <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
                We believe in being upfront. Here's exactly what membership costs, with no surprises.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: PoundSterling,
                  title: "UGLE Registration",
                  amount: "£132",
                  note: "One-off fee paid to the United Grand Lodge of England when you join.",
                  badge: "50% off for under-21s",
                },
                {
                  icon: CalendarDays,
                  title: "Annual Subscription",
                  amount: "£250 / year",
                  note: "Pro-rated based on when you join during the year.",
                  badge: "50% off for under-21s",
                },
                {
                  icon: Utensils,
                  title: "Dining at Meetings",
                  amount: "~£32 per meal",
                  note: "A proper three-course dinner with members after every Lodge meeting.",
                },
                {
                  icon: Ticket,
                  title: "Incidentals",
                  amount: "A few pounds",
                  note: "Raffle tickets, drinks at the bar, and other optional extras on the night.",
                },
              ].map(({ icon: Icon, title, amount, note, badge }) => (
                <div key={title} className="bg-card border border-border rounded-sm p-6 flex flex-col">
                  <Icon className="w-6 h-6 text-gold mb-3" aria-hidden="true" />
                  <h3 className="font-serif text-foreground text-lg mb-1">{title}</h3>
                  <p className="text-xl font-serif text-gold-dark mb-3 whitespace-nowrap">{amount}</p>
                  <p className="text-muted-foreground font-sans text-sm leading-relaxed flex-1">{note}</p>
                  {badge && (
                    <p className="mt-4 inline-flex self-start text-xs font-sans uppercase tracking-widest text-gold-dark border border-gold-dark/50 px-2 py-1 rounded-sm text-center">
                      {badge}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <p className="text-center text-muted-foreground font-sans text-sm mt-10 max-w-2xl mx-auto">
              Time-wise, we meet on a handful of evenings each year — easy to fit around work and family. There is no expectation to attend every social event, though most members find they want to.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default JoinUs;
