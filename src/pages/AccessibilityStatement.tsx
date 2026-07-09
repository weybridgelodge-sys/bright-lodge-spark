import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";

const AccessibilityStatement = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <SEO
        title="Accessibility Statement | Weybridge Lodge No. 6787"
        description="Accessibility statement for weybridgelodge.org.uk — our commitment to making this website accessible to all visitors and inclusive lodge meetings."
        canonical="/accessibility-statement"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Accessibility Statement", url: "/accessibility-statement" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Accessibility Statement"
          subtitle="Our commitment to an accessible website and inclusive lodge meetings"
        />

        <section className="py-16 md:py-24 bg-warm-white" aria-labelledby="accessibility-intro">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-0.5 w-16 bg-gold mb-6" aria-hidden="true" />
              <h2
                id="accessibility-intro"
                className="text-2xl md:text-3xl font-serif text-foreground mb-6"
              >
                Accessibility statement for weybridgelodge.org.uk
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                This accessibility statement applies to{" "}
                <strong className="text-foreground">weybridgelodge.org.uk</strong> and all pages
                within this domain. It does not apply to content hosted on third-party platforms
                linked from this site.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-8 md:py-12 bg-warm-white" aria-label="Accessibility sections">
          <div className="container mx-auto px-6 max-w-3xl space-y-12">
            {/* Using This Website */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="border-t border-border pt-8"
            >
              <h3 className="text-lg font-serif text-foreground mb-4">Using This Website</h3>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-4">
                This website is run by Weybridge Lodge No. 6787, a Masonic Lodge in Guildford, Surrey. We want as many people as possible to be able to use this website. For example, that means you should be able to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground font-sans leading-relaxed text-sm space-y-1 mb-4">
                <li>zoom in up to 300% without the text spilling off the screen</li>
                <li>navigate all public-facing pages using just a keyboard</li>
                <li>navigate the website using speech recognition software</li>
                <li>listen to the website using a screen reader (including the most recent versions of JAWS, NVDA, and VoiceOver)</li>
              </ul>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm">
                We have also made the website text as simple as possible to understand.
              </p>
            </motion.div>

            {/* How Accessible This Website Is */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="border-t border-border pt-8"
            >
              <h3 className="text-lg font-serif text-foreground mb-4">How Accessible This Website Is</h3>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-4">
                We have worked to ensure that all public-facing pages meet WCAG 2.2 AA standards. Our most recent automated accessibility audit returned a score of 100/100 for mobile using Google Lighthouse. All images include descriptive alternative text, all interactive elements are keyboard accessible, colour contrast ratios meet WCAG AA requirements throughout, and all form fields are correctly labelled. The Members Portal is accessible to authenticated members and follows the same accessibility principles.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-4">
                We continue to test accessibility manually — including keyboard navigation and screen reader compatibility — alongside automated testing, as automated tools alone do not cover all WCAG criteria.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm">
                If you find any problems or think we are not meeting accessibility requirements, please contact us (see below).
              </p>
            </motion.div>

            {/* Technical Information */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="border-t border-border pt-8"
            >
              <h3 className="text-lg font-serif text-foreground mb-4">Technical Information About This Website's Accessibility</h3>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-4">
                Weybridge Lodge No. 6787 is committed to making its website accessible. This is a voluntary commitment; as a private members organisation we are not bound by the Public Sector Bodies (Websites and Mobile Applications) Accessibility Regulations 2018, but we consider WCAG 2.2 Level AA to be the appropriate standard and work to meet it.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-4">
                This website is built using React with:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground font-sans leading-relaxed text-sm space-y-1 mb-4">
                <li>Semantic HTML5 throughout</li>
                <li>ARIA landmarks and labels on all major sections</li>
                <li>Keyboard navigation support on all interactive elements</li>
                <li>Skip-to-content links on every page</li>
                <li>Minimum 48px touch targets on all interactive elements</li>
              </ul>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm">
                It is hosted on Lovable, whose hosting infrastructure is ISO 27001:2022 and SOC 2 Type II certified, and is served over HTTPS.
              </p>
            </motion.div>

            {/* Compliance Status */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="border-t border-border pt-8"
            >
              <h3 className="text-lg font-serif text-foreground mb-4">Compliance Status</h3>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-4">
                This website is designed to meet the Web Content Accessibility Guidelines (WCAG) version 2.2, Level AA. We have tested against these criteria using Google Lighthouse, manual keyboard navigation testing, and screen reader testing. We continue to monitor and improve accessibility as the site develops.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm">
                We are not aware of any parts of this website that fail to meet WCAG 2.2 AA criteria based on our current testing. If you experience a problem we have not identified, please let us know.
              </p>
            </motion.div>

            {/* Physical Accessibility */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="border-t border-border pt-8"
            >
              <h3 className="text-lg font-serif text-foreground mb-4">Attending Weybridge Lodge — Physical Accessibility</h3>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-4">
                We want everyone to feel able to attend our meetings. Weybridge Lodge meets at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford, GU2 4DR.
              </p>
              <h4 className="text-base font-serif text-foreground mb-3">Venue accessibility</h4>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm text-left text-muted-foreground border border-border">
                  <thead className="bg-navy/5 text-foreground">
                    <tr>
                      <th className="px-4 py-3 font-sans font-semibold border-b border-border">Feature</th>
                      <th className="px-4 py-3 font-sans font-semibold border-b border-border">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="font-sans">
                    <tr className="border-b border-border">
                      <td className="px-4 py-3 font-medium text-foreground">Step-free access</td>
                      <td className="px-4 py-3">Available via both the main street entrance and the car park entrance</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-4 py-3 font-medium text-foreground">Lift</td>
                      <td className="px-4 py-3">A lift serves both the main street access and the car park entrance, connecting all floors</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-4 py-3 font-medium text-foreground">Disabled parking</td>
                      <td className="px-4 py-3">Dedicated disabled parking spaces are available on site</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-4 py-3 font-medium text-foreground">Hearing loop</td>
                      <td className="px-4 py-3">An induction hearing loop is installed in the meeting room</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-4 py-3 font-medium text-foreground">Accessible toilet</td>
                      <td className="px-4 py-3">A disabled toilet is available within the centre</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-foreground">Internal access</td>
                      <td className="px-4 py-3">All areas within the centre are step-free</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <h4 className="text-base font-serif text-foreground mb-3">Adjustments available from Weybridge Lodge</h4>
              <ul className="list-disc pl-6 text-muted-foreground font-sans leading-relaxed text-sm space-y-1 mb-4">
                <li><strong className="text-foreground">Large-print summons</strong> — available on request; please contact the Secretary at least two weeks before the meeting so we can arrange this in advance</li>
                <li><strong className="text-foreground">Large-print ritual books</strong> — available for use during lodge meetings</li>
                <li><strong className="text-foreground">Other requirements</strong> — if you have an accessibility need not listed here, please contact the Secretary to discuss; we will make every reasonable effort to accommodate you</li>
              </ul>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-4">
                To discuss any accessibility requirement for attending Weybridge Lodge, please contact the Secretary in the first instance:
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm">
                <a href="mailto:secretary@weybridgelodge.org.uk" className="text-gold-dark hover:text-gold transition-colors">
                  secretary@weybridgelodge.org.uk
                </a>
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mt-4">
                Prospective members with accessibility needs are especially welcome to get in touch before their first visit, so that any arrangements can be made in advance and your visit is as comfortable as possible.
              </p>
            </motion.div>

            {/* Feedback and Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="border-t border-border pt-8"
            >
              <h3 className="text-lg font-serif text-foreground mb-4">Feedback and Contact Information</h3>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-4">
                If you find any accessibility problem on this website — or if you think we are not meeting accessibility requirements — please contact us. We aim to respond to all accessibility feedback within 5 working days.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-2">
                <strong className="text-foreground">Email:</strong>{" "}
                <a href="mailto:secretary@weybridgelodge.org.uk" className="text-gold-dark hover:text-gold transition-colors">
                  secretary@weybridgelodge.org.uk
                </a>
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm">
                If you are not satisfied with our response, you can contact the{" "}
                <a
                  href="https://www.equalityadvisoryservice.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-dark hover:text-gold transition-colors"
                >
                  Equality Advisory and Support Service (EASS)
                </a>.
              </p>
            </motion.div>

            {/* Preparation of This Statement */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="border-t border-border pt-8"
            >
              <h3 className="text-lg font-serif text-foreground mb-4">Preparation of This Accessibility Statement</h3>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm mb-4">
                This statement was prepared in July 2026. It will be reviewed annually and updated whenever significant changes are made to the website.
              </p>
              <p className="text-muted-foreground font-sans leading-relaxed text-sm">
                Testing carried out: Google Lighthouse automated audit (mobile and desktop), manual keyboard navigation testing, and screen reader testing using VoiceOver (iOS) and NVDA (Windows).
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 bg-navy" aria-labelledby="accessibility-contact">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <div className="h-0.5 w-16 bg-gold mx-auto mb-6" aria-hidden="true" />
            <h2
              id="accessibility-contact"
              className="text-2xl md:text-3xl font-serif text-primary-foreground mb-4"
            >
              Report an accessibility issue
            </h2>
            <p className="text-primary-foreground/70 font-sans mb-8">
              If you experience any difficulty accessing content on this website, or need to discuss physical accessibility for attending lodge, please contact us and we will do our best to help.
            </p>
            <a
              href="mailto:secretary@weybridgelodge.org.uk?subject=Accessibility%20Feedback"
              className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Contact Us
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AccessibilityStatement;
