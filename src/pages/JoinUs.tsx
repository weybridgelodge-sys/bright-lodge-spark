import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, CheckCircle, PoundSterling, CalendarDays, Utensils, Ticket } from "lucide-react";

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
        title="Join Freemasons in Guildford | Become a Freemason in Surrey"
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
                      <a href="tel:07921589039" className="text-gold hover:text-gold-light font-sans transition-colors">
                        07921 589 039
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">Email Us</p>
                      <a href="mailto:secretary@weybridgelodge.org.uk" className="text-gold hover:text-gold-light font-sans transition-colors text-sm break-all">
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

                {/* Everest Forms compatible form */}
                <form
                  className="mt-8 space-y-4 border-t border-border pt-8"
                  method="post"
                  id="everest-forms-enquiry"
                >
                  <h4 className="text-lg font-serif text-foreground mb-2">Enquiry Form</h4>
                  <div>
                    <label htmlFor="evf-name" className="block text-sm font-sans font-medium text-foreground mb-1">Full Name <span className="text-destructive">*</span></label>
                    <input type="text" id="evf-name" name="evf-name" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="Your full name" />
                  </div>
                  <div>
                    <label htmlFor="evf-email" className="block text-sm font-sans font-medium text-foreground mb-1">Email Address <span className="text-destructive">*</span></label>
                    <input type="email" id="evf-email" name="evf-email" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="you@example.com" />
                  </div>
                  <div>
                    <label htmlFor="evf-phone" className="block text-sm font-sans font-medium text-foreground mb-1">Contact Number</label>
                    <input type="tel" id="evf-phone" name="evf-phone" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="07xxx xxx xxx" />
                  </div>
                  <div>
                    <label htmlFor="evf-reason" className="block text-sm font-sans font-medium text-foreground mb-1">Reason for Enquiry <span className="text-destructive">*</span></label>
                    <textarea id="evf-reason" name="evf-reason" required rows={4} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="Tell us why you're interested in joining..." />
                  </div>
                  <button
                    type="submit"
                    className="block w-full text-center bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                  >
                    Start Your Journey
                  </button>
                </form>
              </motion.div>
            </div>

            <div className="text-center mt-12">
              <Link
                to="/faq"
                className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
              >
                Frequently Asked Questions
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default JoinUs;
