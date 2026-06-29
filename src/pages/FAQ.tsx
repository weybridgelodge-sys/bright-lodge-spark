import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { faqSchema, breadcrumbSchema } from "@/components/SEO";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";

// ─── Interface ────────────────────────────────────────────────────────────────
// renderAnswer is optional JSX for rich in-page display.
// The faqSchema call must use plain `answer` string only to avoid
// [object Object] corruption in Google's FAQ structured data parser.
interface FAQItem {
  question: string;
  answer: string;
  renderAnswer?: React.ReactNode;
}

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
const faqs: FAQItem[] = [
  {
    question: "What is Freemasonry?",
    answer:
      "Freemasonry is one of the world's oldest and largest fraternal organisations, built around the principles of friendship, charity, and moral development. It offers a structured setting — through ceremony, tradition, and fellowship — in which men reflect on their values and support one another and their wider communities. Weybridge Lodge No. 6787 is a warm, sociable expression of that tradition, based at the Guildford Masonic Centre in Surrey.",
  },
  {
    question: "What are the core values of Freemasonry?",
    answer:
      "The three core principles of Freemasonry are Brotherly Love, Relief, and Truth. In practice, this means treating others with respect and kindness, giving generously to those in need, and striving to live with honesty and integrity. These are not abstract ideals — they shape how members conduct themselves both inside and outside the Lodge.",
  },
  {
    question: "How do I join the Freemasons in Guildford?",
    answer:
      "The simplest route is to contact our Membership Secretary by phone or email. We will arrange an informal visit to the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford, GU2 4DR, so you can meet a few members and see where we meet. If you decide to proceed, you complete a straightforward application form and attend a relaxed informal interview. If that goes well, we confirm your initiation date. There is no pressure at any stage.",
    renderAnswer: (
      <>
        The simplest route is to contact our Membership Secretary by phone or email via our{" "}
        <Link to="/join-us" className="text-gold underline hover:opacity-80 transition-opacity">
          Join Us
        </Link>{" "}
        page. We will arrange an informal visit to the Guildford Masonic Centre, Weybourne House,
        Hitherbury Close, Guildford, GU2 4DR, so you can meet a few members and see where we meet.
        If you decide to proceed, you complete a straightforward application form and attend a
        relaxed informal interview. If that goes well, we confirm your initiation date. There is no
        pressure at any stage.
      </>
    ),
  },
  {
    question: "What are the benefits of joining Freemasonry?",
    answer:
      "Members experience genuine friendship, personal growth, and the satisfaction of contributing to charitable causes — both locally in Guildford and across Surrey. It is important to be clear: there are no financial benefits to membership. Freemasonry is not a business network and should never be joined with commercial gain in mind.",
  },
  {
    question: "What does membership cost?",
    answer:
      "There is a one-off UGLE registration fee of £132 payable on initiation, and an annual subscription of £250 which supports Lodge activities and charitable giving. After each meeting, members dine together at the Festive Board — a three-course dinner at approximately £32. Other costs (bar, raffle) are entirely optional. Under-21s receive a 50% reduction on both the registration fee and annual subscription.",
  },
  {
    question: "Can anyone join a Masonic Lodge in Surrey?",
    answer:
      "Freemasonry is open to men of good character aged 18 or over who hold a belief in a supreme being — the specific faith or denomination is not prescribed. Applications are considered individually, and no particular background, profession, or connection to existing members is required. If you are curious, the best first step is simply to get in touch.",
  },
  {
    question: "Can I join with a friend?",
    answer:
      "Absolutely. Joining together — whether with a friend, brother, or colleague — is a great way to begin the journey. You will share the same initiation process and progress through the degrees at your own pace, with the added comfort of a familiar face in the Lodge room.",
  },
  {
    question: "What is the initiation process?",
    answer:
      "The process begins with an informal interview. If successful, your initiation date is confirmed. At the Lodge meeting before your initiation, your name and details are formally read in open Lodge — a procedural requirement of the United Grand Lodge of England. On your initiation night, a formal ballot is taken in the Lodge room before you are admitted. Once accepted unanimously, the ceremony of Initiation begins. It is conducted with dignity and care, guided by the ritual of the First Degree, and focuses on the principles of integrity, charity, and self-reflection. You leave as an Entered Apprentice — a Freemason.",
  },
  {
    question: "What happens at a Lodge meeting?",
    answer:
      "A Lodge meeting has two parts. The first is the formal business of the Lodge: approving minutes, correspondence, accounts, and any Lodge announcements. The second part is one of the three degree ceremonies — Initiation (First Degree), Passing (Second Degree), or Raising (Third Degree) — conducted for a candidate progressing through their Masonic journey. Every meeting is followed by the Festive Board: a three-course dinner with toasts, conversation, and the kind of warmth that keeps members coming back.",
  },
  {
    question: "Is Freemasonry a secret society?",
    answer:
      "No. Freemasonry is an open organisation — our existence, meeting place, and charitable work are all matters of public record. What Freemasonry does maintain are certain traditional elements of its ceremonies, which are not disclosed in advance. These relate primarily to forms of recognition between members. The distinction is between an organisation with some private traditions and a secret society: Freemasonry is firmly the former.",
  },
  {
    question: "Does Freemasonry conflict with religion?",
    answer:
      "No. Freemasonry requires a belief in a supreme being but is entirely non-denominational. Members of all faiths — and none in particular — are welcome. Freemasonry is not a religion, does not have a theological doctrine, and does not seek to replace or interfere with a member's personal faith. Lodge meetings open and close with a prayer, but this is a broad, inclusive practice rather than a denominational one.",
  },
  {
    question: "Can women become Freemasons?",
    answer:
      "Yes. While Weybridge Lodge No. 6787 is a lodge under the United Grand Lodge of England — which constitutes lodges for men — there are two established Grand Lodges in the UK exclusively for women: The Order of Women Freemasons and Freemasonry for Women (HFAF). Both follow similar ceremonies and traditions and are active in charitable and community work across Surrey and beyond.",
  },
  {
    question: "What social events do Freemasons in Surrey enjoy?",
    answer:
      "Social life at Weybridge Lodge extends well beyond the Lodge room. Members enjoy darts nights, Topgolf outings, clay pigeon shoots, an Annual Charity Golf Day, and a festive December dinner with Christmas carols. Many events welcome partners and family members too — Freemasonry in Guildford is very much a community, not just a membership.",
  },
  {
    question: "Which famous people have been Freemasons?",
    answer:
      "Notable Freemasons include Prince Philip (Duke of Edinburgh), Prince Edward (Duke of Kent and current Grand Master), Winston Churchill, Peter Sellers, Sir Alf Ramsey, Sir Ian Fleming, and Rudyard Kipling — among millions of others worldwide across more than 300 years of the modern Craft.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
const FAQ = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    // faqSchema receives plain-text answers ONLY.
    const faqStructuredData = faqSchema(
      faqs.map((f) => ({ question: f.question, answer: f.answer }))
    );

    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "FAQ", url: "/faq" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/faq#webpage",
        url: "https://www.weybridgelodge.org.uk/faq",
        name: "Freemasonry FAQ | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Common questions about becoming a Freemason in Guildford and Surrey — fees, initiation, meetings, values and more. Answered by Weybridge Lodge No. 6787 at the Guildford Masonic Centre, GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://www.weybridgelodge.org.uk/#website",
        },
      },
      faqStructuredData,
      breadcrumb,
    ];
  }, []);

  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 },
      };

  return (
    <div className="min-h-screen">
      <SEO
       title="Freemasonry FAQ"
       description="Common questions about becoming a Freemason in Guildford — fees, initiation, meetings and values. Answered by Weybridge Lodge No. 6787."
        canonical="/faq"
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Frequently Asked Questions"
          subtitle="Common questions about Freemasonry answered"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            {/* ── Intro ── */}
            <motion.div {...motionProps} className="mb-12">
              <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-4">
                Everything you wanted to know about Freemasonry in Surrey
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                Whether you are curious about what Freemasonry actually is, what joining involves,
                or what an evening at our Guildford Masonic Lodge looks like — this page answers the
                questions we are asked most often. Nothing is off-limits.
              </p>
            </motion.div>

            {/* ── Accordion ── */}
            <motion.div
              {...motionProps}
              transition={shouldReduceMotion ? undefined : { duration: 0.6, delay: 0.1 }}
            >
              <h2 className="sr-only">
                Frequently asked questions about Freemasonry and Weybridge Lodge in Guildford
              </h2>
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={faq.question}
                    value={`item-${i}`}
                    className="border border-border rounded-sm px-6 bg-card"
                  >
                    <AccordionTrigger className="text-left font-serif text-foreground hover:text-gold transition-colors">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground font-sans leading-relaxed">
                      {faq.renderAnswer ?? faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA — three next steps, no dead end ── */}
        <section className="py-20 md:py-28 bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <motion.div {...motionProps}>
              <h2 className="font-serif text-3xl md:text-4xl mb-4">Still have questions?</h2>
              <p className="font-sans leading-relaxed text-lg mb-10 opacity-90">
                Our Membership Secretary is happy to answer anything not covered above — or if you
                are ready, take the next step toward joining our Masonic Lodge in Guildford.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  Contact Us
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/quiz"
                  className="inline-flex items-center justify-center border border-gold text-gold px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-gold hover:text-accent-foreground transition-colors"
                >
                  Take the 2-Min Quiz
                </Link>
                <Link
                  to="/join-us"
                  className="inline-flex items-center justify-center border border-primary-foreground/40 text-primary-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-primary-foreground/10 transition-colors"
                >
                  Begin Your Application
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
