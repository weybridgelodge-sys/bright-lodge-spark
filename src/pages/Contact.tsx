import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Contact = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Contact Freemasons in Guildford | Weybridge Lodge No. 6787"
        description="Contact Weybridge Lodge No. 6787, a Masonic Lodge in Surrey meeting at Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford GU2 4DR. Phone, email and directions."
        canonical="/contact"
        schema={[breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ]), {
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "@id": "https://weybridgelodge.org.uk/contact#webpage",
          url: "https://weybridgelodge.org.uk/contact",
          name: "Contact Weybridge Lodge No. 6787",
          inLanguage: "en-GB",
          isPartOf: { "@id": "https://weybridgelodge.org.uk/#website" },
          about: { "@id": "https://weybridgelodge.org.uk/#organization" },
        }]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Contact Us at Guildford Masonic Centre"
          subtitle="Weybourne House, Hitherbury Close, Guildford GU2 4DR — home of Weybridge Lodge No. 6787"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-8 md:gap-16">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="h-0.5 w-16 bg-gold mb-6" />
                <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-6">Get In Touch</h2>
                <p className="text-muted-foreground font-sans leading-relaxed mb-8">
                  For general enquiries, please use the contact details below. If you are interested in joining the Freemasons in Guildford, please visit our membership page.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Phone className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">Telephone</p>
                      <a href="tel:+447921589039" className="text-gold-dark hover:text-navy font-sans transition-colors inline-flex items-center min-h-[48px]">
                        07921 589 039
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">Email</p>
                      <a href="mailto:secretary@weybridgelodge.org.uk?subject=Weybridge%20Lodge%20Website%20Enquiry" className="text-gold-dark hover:text-navy font-sans transition-colors text-sm break-all inline-flex items-center min-h-[48px]">
                        secretary@weybridgelodge.org.uk
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">We Meet At</p>
                      <p className="text-muted-foreground font-sans text-sm">
                        Guildford Masonic Centre<br />
                        Hitherbury Close, Guildford GU2 4DR
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    to="/join-us"
                    className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px]"
                  >
                    Membership Enquiry
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="rounded-sm overflow-hidden border border-border shadow-lg"
              >
                <iframe
                  src="https://www.google.com/maps?q=Guildford+Masonic+Centre,+Hitherbury+Close,+Guildford+GU2+4DR&output=embed"
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Guildford Masonic Centre location"
                />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-background border-t border-border" aria-labelledby="venue-heading">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <div className="h-0.5 w-16 bg-gold mb-6" />
            <h2 id="venue-heading" className="text-2xl md:text-3xl font-serif text-foreground mb-6">About Guildford Masonic Centre</h2>
            <p className="text-muted-foreground font-sans leading-relaxed mb-4">
              Guildford Masonic Centre (also known as the South West Surrey Masonic Centre) sits at Weybourne House, Hitherbury Close, Guildford GU2 4DR. It is the meeting place for Weybridge Lodge No. 6787 and a number of other Surrey Lodges and Chapters.
            </p>
            <p className="text-muted-foreground font-sans leading-relaxed mb-4">
              The Centre has free on-site parking, step-free access to the main entrance, a licensed bar and a dining room where the Festive Board is held after each meeting. Guildford railway station is roughly a ten-minute walk away, and the A3 is a few minutes by car.
            </p>
            <p className="text-muted-foreground font-sans leading-relaxed">
              Visitors are always welcome. If you are coming for the first time, <Link to="/freemason-initiation-night" className="text-gold-dark underline underline-offset-4">Your Initiation Night</Link> explains what to expect on the evening, and our <Link to="/events" className="text-gold-dark underline underline-offset-4">events page</Link> lists upcoming meetings at the Centre.
            </p>
          </div>
        </section>
        <section className="py-20 md:py-28 bg-navy" aria-labelledby="contact-cta-heading">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <h2 id="contact-cta-heading" className="font-serif text-3xl md:text-4xl text-gold mb-4">Thinking about joining us?</h2>
            <p className="font-sans leading-relaxed text-lg mb-10 text-primary-foreground/80">
              Take the 2-minute quiz, see the journey from first conversation to Initiation, or read what your first evening is like.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              <Link to="/quiz" className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto">
                Take the 2-Min Quiz<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/your-journey" className="inline-flex items-center justify-center border border-gold text-gold px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-gold hover:text-navy transition-colors min-h-[48px] w-full sm:w-auto">See Your Journey</Link>
              <Link to="/freemason-initiation-night" className="inline-flex items-center justify-center border border-gold text-gold px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-gold hover:text-navy transition-colors min-h-[48px] w-full sm:w-auto">Your Initiation Night</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
