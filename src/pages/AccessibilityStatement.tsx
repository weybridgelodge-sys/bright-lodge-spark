import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";

const sections = [
  {
    title: "Using This Website",
    content:
      "This website is run by Weybridge Lodge No. 6787, a Masonic Lodge in Guildford, Surrey. We want as many people as possible to be able to use this website. For example, that means you should be able to zoom in up to 300% without the text spilling off the screen, navigate most of the website using just a keyboard, navigate most of the website using speech recognition software, and listen to most of the website using a screen reader.",
  },
  {
    title: "How Accessible This Website Is",
    content:
      "We know some people may find parts of this website difficult to use. We have worked to ensure that all public-facing pages meet or exceed WCAG 2.1 AA standards. Our most recent PageSpeed Insights accessibility audit returned a score of 100/100 for mobile. All images include descriptive alternative text, all interactive elements are keyboard accessible, colour contrast ratios meet WCAG AA requirements throughout, and all form fields are correctly labelled. The members portal is accessible to authenticated members and follows the same accessibility principles.",
  },
  {
    title: "Feedback and Contact Information",
    content:
      "If you find any problems not listed on this page or think we are not meeting accessibility requirements, please contact us. We aim to respond to accessibility feedback within 5 working days.",
  },
  {
    title: "Technical Information About This Website's Accessibility",
    content:
      "Weybridge Lodge No. 6787 is committed to making its website accessible, in accordance with the Public Sector Bodies (Websites and Mobile Applications) Accessibility Regulations 2018. This website is built using React with semantic HTML5, ARIA landmarks and labels, keyboard navigation support, and skip-to-content links on every page. It is hosted on Lovable and served over HTTPS.",
  },
  {
    title: "Compliance Status",
    content:
      "This website is fully compliant with the Web Content Accessibility Guidelines (WCAG) version 2.1 AA standard. We continue to monitor and improve accessibility as the site develops.",
  },
  {
    title: "Preparation of This Accessibility Statement",
    content:
      "This statement was prepared on 29th June 2026. It was last reviewed on 29th June 2026. The website was tested by the Lodge's web development team against WCAG 2.1 AA criteria using Google Lighthouse, manual keyboard navigation testing, and screen reader testing.",
  },
];

const AccessibilityStatement = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <SEO
        title="Accessibility Statement | Weybridge Lodge No. 6787"
        description="Accessibility statement for weybridgelodge.org.uk — our commitment to making this website accessible to all visitors."
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
          subtitle="Our commitment to an accessible website for all visitors"
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
          <div className="container mx-auto px-6 max-w-3xl space-y-10">
            {sections.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="border-t border-border pt-8"
              >
                <h3 className="text-lg font-serif text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground font-sans leading-relaxed text-sm">
                  {s.content}
                </p>
              </motion.div>
            ))}
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
              If you experience any difficulty accessing content on this website, please contact
              us and we will do our best to provide the information in an alternative format.
            </p>
            <a
              href="/contact"
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
