import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { faqSchema, breadcrumbSchema } from "@/components/SEO";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is Freemasonry?",
    answer: "Freemasonry is a fraternal organization that encourages moral and personal development. It promotes friendship, charity, and community service. Many view it as a way to connect with others and improve oneself.",
  },
  {
    question: "What are the core values?",
    answer: "Freemasonry values integrity, respect, friendship and service (including charity and helping those in need). Members strive to uphold these principles in their daily lives.",
  },
  {
    question: "How do I join?",
    answer: "Joining is straightforward. Visit our Join Us page to read our joining process. We will contact you to start the process which will include a visit to Guildford Masonic Centre and an informal interview. If you already know somebody who is a Freemason, that also helps but is not essential.",
  },
  {
    question: "What are the benefits?",
    answer: "Members experience personal growth, networking opportunities, and a chance to give back to their community through charitable efforts.",
  },
  {
    question: "Is there a fee?",
    answer: "Yes, there is an annual membership fee (currently £240) which helps support lodge activities and charitable projects. A single one-off registration fee of around £100 is also payable on joining. The only other costs are for the Festive Board dinner that we hold after each meeting (£32 for a 3 course dinner).",
  },
  {
    question: "Can anyone join?",
    answer: "Freemasonry is open to all men of good character, regardless of background, race, or creed. Each application is evaluated on an individual basis. Generally you must be at least 18 years old and believe in a supreme being.",
  },
  {
    question: "Can I join with a friend?",
    answer: "Yes, having members to join together, whether friends or siblings, is a great way to have someone you know along for the journey and can make the experience more enjoyable.",
  },
  {
    question: "What is the initiation process?",
    answer: "The initiation process involves a ceremony, likened to a short play, that will symbolise your personal journey. You'll learn about the values of Freemasonry and other members of the lodge will be on hand to guide you through.",
  },
  {
    question: "What happens at a lodge meeting?",
    answer: "The meeting is usually made up of two parts: the first being the \"business\" of the lodge which includes approving of minutes, correspondence, accounts etc. The second part is one of the three ceremonies for admitting new members, passing them to the second degree and raising them to the third degree. All meetings are followed by a meal called a \"festive board\".",
  },
  {
    question: "Which famous people have been Freemasons?",
    answer: "Notable Freemasons include Prince Philip (Duke of Edinburgh), Prince Edward (Duke of Kent, current Grand Master), Winston Churchill, Peter Sellers, Sir Alf Ramsay, Sir Ian Fleming and Rudyard Kipling, to name but a few.",
  },
  {
    question: "Is Freemasonry a secret society?",
    answer: "Freemasonry is not a secret society, though it does have some secrets. While Freemasonry emphasizes openness and welcomes public scrutiny, it also maintains certain traditions and rituals that are not publicly disclosed.",
  },
  {
    question: "Can women become Freemasons?",
    answer: "Yes they can. There are two main Grand Lodges in the UK exclusively for women: The Order of Women Freemasons and Freemasonry for Women (HFAF). Both follow similar ceremonies and rituals to male Freemasons and actively participate in community and charity work.",
  },
  {
    question: "How do I join Freemasonry in Guildford?",
    answer: "To become a Freemason in Guildford, the simplest route is to contact our Membership Secretary via our Join Us page. We'll invite you for an informal visit to the South West Surrey Masonic Centre to meet some of our members. There's no pressure — the visit is simply an opportunity to ask questions and see if Freemasonry is right for you.",
    renderAnswer: (<>To become a Freemason in Guildford, the simplest route is to contact our Membership Secretary via our <Link to="/join-us" className="text-gold underline hover:opacity-80 transition-opacity">Join Us</Link> page. We'll invite you for an informal visit to the South West Surrey Masonic Centre to meet some of our members. There's no pressure — the visit is simply an opportunity to ask questions and see if Freemasonry is right for you.</>),
  },
  {
    question: "What social events do Freemasons in Surrey enjoy?",
    answer: "Masonic social events in Surrey go well beyond lodge meetings. At Weybridge Lodge we enjoy darts nights, Topgolf outings, clay pigeon shoots, an Annual Charity Golf Day and a festive December dinner complete with Christmas carols. Many events are open to partners and family members too.",
  },
];

const FAQ = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Freemasonry FAQ | Questions About Joining in Guildford"
        description="Common questions about becoming a Freemason in Guildford, Surrey — fees, initiation, meetings, values and more. Answered by Weybridge Lodge No. 6787."
        canonical="/faq"
        schema={[
          faqSchema(faqs),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "FAQ", url: "/faq" },
          ]),
        ]}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Frequently Asked Questions"
          subtitle="Common questions about Freemasonry answered"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-muted-foreground font-sans leading-relaxed text-lg mb-12"
            >
              If you're looking for more information about joining Freemasonry, you've come to the right place. Whether you're curious or seriously considering membership, we're here to help.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="border border-border rounded-sm px-6 bg-card"
                  >
                    <AccordionTrigger className="text-left font-serif text-foreground hover:text-gold transition-colors">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground font-sans leading-relaxed">
                      {faq.renderAnswer || faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>

            <div className="mt-16 text-center">
              <p className="text-muted-foreground font-sans mb-6">Still have questions?</p>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center bg-gold-shimmer text-accent-foreground px-8 py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
