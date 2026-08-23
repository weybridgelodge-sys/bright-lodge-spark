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

interface FAQCategory {
  category: string;
  id: string;
  items: FAQItem[];
}

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
// /faq is the single canonical FAQ resource for the site. Questions that
// previously lived on /what-is-freemasonry and /join-us have been consolidated
// here; those pages now link across instead of duplicating content.
const faqCategories: FAQCategory[] = [
  {
    category: "What is Freemasonry?",
    id: "what-is-freemasonry",
    items: [
      {
        question: "What is Freemasonry?",
        answer:
          "Freemasonry is one of the world's oldest and largest fraternal organisations, built around the principles of friendship, charity, and moral development. It offers a structured setting — through ceremony, tradition, and fellowship — in which men reflect on their values and support one another and their wider communities. Weybridge Lodge No. 6787 is a warm, sociable expression of that tradition, based at the Guildford Masonic Centre in Surrey.",
      },
      {
        question: "What are the core values of Freemasonry?",
        answer:
          "At Weybridge Lodge No. 6787, our four core values are Integrity, Friendship, Respect, and Service. In practice, this means holding ourselves to a standard of honesty and moral consistency, building bonds meant to last a lifetime, treating tradition and each other with respect, and giving generously — to fellow members, to Guildford and Surrey, and to national causes. These are not abstract ideals — they shape how members conduct themselves both inside and outside the Lodge.",
      },
      {
        question: "Which famous people have been Freemasons?",
        answer:
          "Notable Freemasons include Prince Philip (Duke of Edinburgh), Prince Edward (Duke of Kent and current Grand Master), Winston Churchill, Peter Sellers, Sir Alf Ramsey, Sir Ian Fleming, and Rudyard Kipling — among millions of others worldwide across more than 300 years of the modern Craft.",
      },
    ],
  },
  {
    category: "Joining & Membership",
    id: "joining-membership",
    items: [
      {
        question: "How do I join the Freemasons in Guildford?",
        answer:
          "The simplest route is to contact our Membership Secretary by phone or email. We will arrange an informal interview at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford, GU2 4DR, so you can meet a few members, see where we meet, and ask any questions. If that goes well, you complete a straightforward application form and we confirm your initiation date. There is no pressure at any stage.",
        renderAnswer: (
          <>
            The simplest route is to contact our Membership Secretary by phone or email via our{" "}
            <Link to="/join-us" className="text-gold underline hover:opacity-80 transition-opacity">
              Join Us
            </Link>{" "}
            page. We will arrange an informal interview at the Guildford Masonic Centre, Weybourne House,
            Hitherbury Close, Guildford, GU2 4DR, so you can meet a few members, see where we meet, and
            ask any questions. If that goes well, you complete a straightforward application form and we
            confirm your initiation date — you can see the full{" "}
            <Link to="/your-journey" className="text-gold underline hover:opacity-80 transition-opacity">
              Journey Timeline
            </Link>{" "}
            for what happens at each step. There is no pressure at any stage.
          </>
        ),
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
        question: "Do I need to know someone already to join?",
        answer:
          "No. Many of our members arrived knowing nobody in Freemasonry at all. No prior connection is needed — we welcome enquiries from men of all backgrounds and ages across Guildford and Surrey, and curiosity matters far more than having an existing connection or a family history in the Craft.",
      },
      {
        question: "What are the benefits of joining Freemasonry?",
        answer:
          "Members experience genuine friendship, personal growth, and the satisfaction of contributing to charitable causes — both locally in Guildford and across Surrey. It is important to be clear: there are no financial benefits to membership. Freemasonry is not a business network and should never be joined with commercial gain in mind.",
      },
      {
        question: "What happens after I submit an enquiry?",
        answer:
          "One of our members will get back to you for an informal chat about what membership involves and what you are hoping to get from it. If you would like to take it further, we arrange an informal interview at the Guildford Masonic Centre so you can meet a few of the brethren and ask anything you like before deciding.",
      },
      {
        question: "How long does the joining process take?",
        answer:
          "It varies, and we deliberately never rush it. After your first conversation and interview there are usually a few months of getting to know one another before your initiation is scheduled, which is timed around the Lodge's meeting calendar. You are free to take as long as you need — there is no obligation at any point.",
      },
    ],
  },
  {
    category: "Meetings & Ceremonies",
    id: "meetings-ceremonies",
    items: [
      {
        question: "What is the initiation process?",
        answer:
          "The process begins with an informal interview. If successful, your initiation date is confirmed. At the Lodge meeting before your initiation, your name and details are formally read in open Lodge — a procedural requirement of the United Grand Lodge of England. On your initiation night, a formal ballot is taken in the Lodge room before you are admitted. Once accepted unanimously, the ceremony of Initiation begins. It is conducted with dignity and care, guided by the ritual of the First Degree, and focuses on the principles of integrity, charity, and self-reflection. You leave as an Entered Apprentice — a Freemason.",
        renderAnswer: (
          <>
            The process begins with an informal interview. If successful, your initiation date is
            confirmed. At the Lodge meeting before your initiation, your name and details are formally
            read in open Lodge — a procedural requirement of the United Grand Lodge of England. On your
            initiation night, a formal ballot is taken in the Lodge room before you are admitted. Once
            accepted unanimously, the ceremony of Initiation begins. It is conducted with dignity and
            care, guided by the ritual of the First Degree, and focuses on the principles of integrity,
            charity, and self-reflection. You leave as an Entered Apprentice — a Freemason. Read a full,
            candid walkthrough on our{" "}
            <Link to="/freemason-initiation-night" className="text-gold underline hover:opacity-80 transition-opacity">
              Your Initiation Night
            </Link>{" "}
            page.
          </>
        ),
      },
      {
        question: "What happens at a Lodge meeting?",
        answer:
          "A Lodge meeting has two parts. The first is the formal business of the Lodge: approving minutes, correspondence, accounts, and any Lodge announcements. The second part is one of the three degree ceremonies — Initiation (First Degree), Passing (Second Degree), or Raising (Third Degree) — conducted for a candidate progressing through their Masonic journey. Every meeting is followed by the Festive Board: a three-course dinner with toasts, conversation, and the kind of warmth that keeps members coming back.",
      },
      {
        question: "What are the three degrees of Freemasonry?",
        answer:
          "The three degrees are Entered Apprentice (First Degree), Fellow Craft (Second Degree), and Master Mason (Third Degree). Each is a ceremony rich in symbolism and moral teaching, marking a stage in a member's development — from first reception into the Lodge, through learning and self-improvement, to reflecting on the legacy a life well lived leaves behind.",
      },
    ],
  },
  {
    category: "Secrecy, Religion & Beliefs",
    id: "secrecy-religion-beliefs",
    items: [
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
    ],
  },
  {
    category: "Community & Social Life",
    id: "community-social-life",
    items: [
      {
        question: "What social events do Freemasons in Surrey enjoy?",
        answer:
          "Social life at Weybridge Lodge extends well beyond the Lodge room. Members enjoy darts nights, Topgolf outings, clay pigeon shoots, an Annual Charity Golf Day, and a festive December dinner with Christmas carols. Many events welcome partners and family members too — Freemasonry in Guildford is very much a community, not just a membership.",
      },
      {
        question: "Can women become Freemasons?",
        answer:
          "Yes. While Weybridge Lodge No. 6787 is a lodge under the United Grand Lodge of England — which constitutes lodges for men — there are two established Grand Lodges in the UK exclusively for women: The Order of Women Freemasons and Freemasonry for Women (HFAF). Both follow similar ceremonies and traditions and are active in charitable and community work across Surrey and beyond.",
      },
    ],
  },
];

// Flat list, in category order, used for the FAQPage structured data.
const faqs: FAQItem[] = faqCategories.flatMap((c) => c.items);

// ─── Component ────────────────────────────────────────────────────────────────
const FAQ = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageSchema = useMemo(() => {
    // faqSchema receives plain-text answers ONLY — one flat mainEntity array.
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
        "@id": "https://weybridgelodge.org.uk/faq#webpage",
        url: "https://weybridgelodge.org.uk/faq",
        name: "Freemasonry FAQ | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787",
        description:
          "Common questions about becoming a Freemason in Guildford and Surrey — fees, initiation, meetings, values and more. Answered by Weybridge Lodge No. 6787 at the Guildford Masonic Centre, GU2 4DR.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://weybridgelodge.org.uk/#website",
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
    <div className="min-h-screen overflow-x-hidden">
      <SEO
        title="Freemasonry FAQ | Freemasons in Guildford, Surrey — Weybridge Lodge No. 6787"
        description="Common questions about becoming a Freemason in Guildford and Surrey — fees, initiation, meetings and values. Answered by Weybridge Lodge No. 6787 at the Guildford Masonic Centre, GU2 4DR."
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

        <section className="py-20 md:py-28 bg-warm-white" aria-labelledby="faq-intro-heading">
          <div className="container mx-auto px-6 max-w-3xl">
            {/* ── Intro ── */}
            <motion.div {...motionProps} className="mb-12">
              <h2 id="faq-intro-heading" className="font-serif text-2xl md:text-3xl text-foreground mb-4">
                Everything you wanted to know about Freemasonry in Surrey
              </h2>
              <p className="text-muted-foreground font-sans leading-relaxed text-lg">
                Whether you are curious about what Freemasonry actually is, what joining involves,
                or what an evening at our Guildford Masonic Lodge looks like — this page answers the
                questions we are asked most often. Nothing is off-limits.
              </p>
            </motion.div>

            {/* ── Categorised accordions ── */}
            <motion.div
              {...motionProps}
              transition={shouldReduceMotion ? undefined : { duration: 0.6, delay: 0.1 }}
              className="space-y-14"
            >
              {faqCategories.map((cat) => (
                <div key={cat.id}>
                  <div className="h-0.5 w-16 bg-gold mb-4" aria-hidden="true" />
                  <h2
                    id={`faq-${cat.id}`}
                    className="font-serif text-2xl md:text-3xl text-foreground mb-6"
                  >
                    {cat.category}
                  </h2>
                  <Accordion type="single" collapsible className="space-y-3">
                    {cat.items.map((faq, i) => (
                      <AccordionItem
                        key={faq.question}
                        value={`${cat.id}-${i}`}
                        className="border border-border rounded-sm px-6 bg-card"
                      >
                        <AccordionTrigger className="text-left font-serif text-foreground hover:text-gold transition-colors min-h-[48px]">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground font-sans leading-relaxed">
                          {faq.renderAnswer ?? faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA — three next steps, no dead end ── */}
        <section className="py-20 md:py-28 bg-navy" aria-labelledby="faq-cta-heading">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <motion.div {...motionProps}>
              <h2 id="faq-cta-heading" className="font-serif text-3xl md:text-4xl text-gold mb-4">
                Still have questions?
              </h2>
              <p className="font-sans leading-relaxed text-lg mb-10 text-gold/80">
                Our Membership Secretary is happy to answer anything not covered above — or if you
                are ready, take the next step toward joining our Masonic Lodge in Guildford.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity min-h-[48px]"
                >
                  Contact Us
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/quiz"
                  className="inline-flex items-center justify-center border border-gold text-gold px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-gold hover:text-navy transition-colors min-h-[48px]"
                >
                  Take the 2-Min Quiz
                </Link>
                <Link
                  to="/join-us"
                  className="inline-flex items-center justify-center border border-gold/40 text-gold px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-gold/10 transition-colors min-h-[48px]"
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
