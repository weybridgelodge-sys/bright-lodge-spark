import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Contact = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Contact Weybridge Lodge | Freemasons Guildford"
        description="Contact Weybridge Lodge No. 6787 — Freemasons in Guildford, Surrey. Call, email or visit us at the South West Surrey Masonic Centre, Hitherbury Close, GU2 4DR."
        canonical="/contact"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Contact Us"
          subtitle="Get in touch with Weybridge Lodge Freemasons in Guildford"
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
                    <Phone className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">Telephone</p>
                      <a href="tel:07921589039" className="text-gold-dark hover:text-gold font-sans transition-colors">
                        07921 589 039
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="font-sans font-medium text-foreground text-sm">Email</p>
                      <a href="mailto:secretary@weybridgelodge.org.uk" className="text-gold-dark hover:text-gold font-sans transition-colors text-sm break-all">
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

                <div className="mt-8">
                  <Link
                    to="/join-us"
                    className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
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
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2502.5!2d-0.5745!3d51.2362!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4875d0a0a0a0a0a0%3A0x0!2sSouth+West+Surrey+Masonic+Centre!5e0!3m2!1sen!2suk!4v1234567890"
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="South West Surrey Masonic Centre location"
                />
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
