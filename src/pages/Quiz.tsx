import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Option {
  label: string;
  scores: Partial<Record<"values" | "social" | "curiosity" | "service", number>>;
}

interface Question {
  q: string;
  options: Option[];
}

const questions: Question[] = [
  {
    q: "When you spend time with a group of people, what matters most to you?",
    options: [
      { label: "Shared values and integrity", scores: { values: 2 } },
      { label: "Good conversation and friendship", scores: { social: 2 } },
      { label: "Learning something new", scores: { curiosity: 2 } },
      { label: "Doing something useful together", scores: { service: 2 } },
    ],
  },
  {
    q: "Which of these would you most enjoy on a Wednesday evening?",
    options: [
      { label: "A formal dinner with welcoming company", scores: { social: 2, values: 1 } },
      { label: "A traditional ceremony rich in symbolism", scores: { curiosity: 2, values: 1 } },
      { label: "Helping organise a charity event", scores: { service: 2 } },
      { label: "Quietly reflecting on personal growth", scores: { values: 2, curiosity: 1 } },
    ],
  },
  {
    q: "What appeals to you about an old institution like Freemasonry?",
    options: [
      { label: "Centuries of ritual and tradition", scores: { curiosity: 2 } },
      { label: "A clear moral framework", scores: { values: 2 } },
      { label: "A community that supports its members", scores: { social: 2, service: 1 } },
      { label: "The charity work it enables", scores: { service: 2 } },
    ],
  },
  {
    q: "How do you feel about wearing a dinner jacket and following a formal etiquette?",
    options: [
      { label: "Love it — it makes the evening feel special", scores: { social: 2 } },
      { label: "Happy to, if it's part of the tradition", scores: { values: 1, curiosity: 1 } },
      { label: "Don't mind, as long as people are friendly", scores: { social: 1 } },
      { label: "It's a small price for something meaningful", scores: { values: 2 } },
    ],
  },
  {
    q: "Which sounds most rewarding?",
    options: [
      { label: "Raising thousands for local young carers", scores: { service: 2 } },
      { label: "Meeting people of all walks of life", scores: { social: 2 } },
      { label: "Understanding ancient ceremonies", scores: { curiosity: 2 } },
      { label: "Becoming a better version of yourself", scores: { values: 2 } },
    ],
  },
];

type Bucket = "values" | "social" | "curiosity" | "service";

const interpretations: Record<Bucket, { title: string; body: string; cta: string; href: string }> = {
  values: {
    title: "You're drawn to principle and self-improvement",
    body: "Freemasonry's emphasis on integrity, brotherly love and personal development is likely to resonate strongly with you. Many members describe it as a structured path to becoming a better version of themselves.",
    cta: "Read about your Masonic journey",
    href: "/your-journey",
  },
  social: {
    title: "You'd thrive in our community",
    body: "Friendship and shared meals are at the heart of Lodge life. From our festive board to our Ladies Festival, you'll find a warm, welcoming group of all ages and backgrounds.",
    cta: "See our upcoming events",
    href: "/events",
  },
  curiosity: {
    title: "You'd love the ritual and history",
    body: "Freemasonry preserves centuries-old ceremonies rich in allegory and symbolism. If history, philosophy and meaningful tradition interest you, you'll find much to explore.",
    cta: "Discover what Freemasonry is",
    href: "/what-is-freemasonry",
  },
  service: {
    title: "You'd be inspired by our charity work",
    body: "Charitable giving is central to Freemasonry. Weybridge Lodge has earned the Surrey 2030 Festival Gold Award and actively supports local causes including Guildford Young Carers, SANDS and the Brigitte Trust.",
    cta: "Explore our charities",
    href: "/our-charities",
  },
};

const Quiz = () => {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<Bucket, number>>({
    values: 0,
    social: 0,
    curiosity: 0,
    service: 0,
  });
  const [done, setDone] = useState(false);

  const handleAnswer = (opt: Option) => {
    const next = { ...scores };
    (Object.keys(opt.scores) as Bucket[]).forEach((k) => {
      next[k] = (next[k] || 0) + (opt.scores[k] || 0);
    });
    setScores(next);
    if (step + 1 >= questions.length) {
      setDone(true);
    } else {
      setStep(step + 1);
    }
  };

  const reset = () => {
    setStep(0);
    setScores({ values: 0, social: 0, curiosity: 0, service: 0 });
    setDone(false);
  };

  const topBucket = (Object.keys(scores) as Bucket[]).reduce((a, b) =>
    scores[a] >= scores[b] ? a : b
  );

  const progress = ((step + (done ? 1 : 0)) / questions.length) * 100;
  const result = interpretations[topBucket];

  return (
    <div className="min-h-screen">
      <SEO
        title="Is Freemasonry For Me? Personalised Quiz | Weybridge Lodge"
        description="Take our short personalised quiz to discover whether Freemasonry at Weybridge Lodge in Guildford might be right for you."
        canonical="/quiz"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Is Freemasonry For Me?", url: "/quiz" },
        ])}
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Is Freemasonry For Me?"
          subtitle="A short personalised guide to whether our Lodge might be your kind of place"
        />

        <section className="py-16 md:py-24 bg-warm-white">
          <div className="container mx-auto px-6 max-w-2xl">
            <div className="mb-6">
              <Progress value={progress} className="h-2" />
              <p className="text-xs font-sans text-muted-foreground mt-2 text-right">
                {done ? "Complete" : `Question ${step + 1} of ${questions.length}`}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!done ? (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card border border-border rounded-sm shadow-sm p-6 md:p-8"
                >
                  <h2 className="text-xl md:text-2xl font-serif text-foreground mb-6">
                    {questions[step].q}
                  </h2>
                  <div className="space-y-3">
                    {questions[step].options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(opt)}
                        className="w-full text-left p-4 border border-border rounded-sm font-sans text-foreground hover:border-gold hover:bg-gold/5 transition-all group flex items-center justify-between gap-3"
                      >
                        <span>{opt.label}</span>
                        <ArrowRight className="w-4 h-4 text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-card border border-border rounded-sm shadow-lg overflow-hidden"
                >
                  <div className="bg-navy-gradient text-primary-foreground p-8 text-center">
                    <Sparkles className="w-8 h-8 text-gold mx-auto mb-3" />
                    <p className="text-gold text-xs uppercase tracking-widest font-sans mb-2">Your Result</p>
                    <h2 className="text-2xl md:text-3xl font-serif">{result.title}</h2>
                  </div>
                  <div className="p-6 md:p-8 space-y-6">
                    <p className="text-muted-foreground font-sans leading-relaxed">{result.body}</p>

                    <div className="border-t border-border pt-6 space-y-3">
                      <Link
                        to={result.href}
                        className="block w-full text-center bg-gold-shimmer text-accent-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                      >
                        {result.cta}
                      </Link>
                      <Link
                        to="/join-us"
                        className="block w-full text-center border border-gold text-foreground py-4 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:bg-gold/10 transition-colors"
                      >
                        Enquire About Joining
                      </Link>
                      <button
                        onClick={reset}
                        className="w-full inline-flex items-center justify-center gap-2 text-sm font-sans text-muted-foreground hover:text-gold transition-colors py-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retake the quiz
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Quiz;
