import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, RotateCcw, CheckCircle2, HelpCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface QuizOption {
  text: string;
  score: "high" | "neutral" | "low";
}

interface Question {
  id: number;
  text: string;
  options: QuizOption[];
}

type ScoreMap = { high: number; neutral: number; low: number };
type Outcome = "high-fit" | "neutral-fit" | "not-fit";

// ─── Quiz Data ────────────────────────────────────────────────────────────────
const quizQuestions: Question[] = [
  {
    id: 1,
    text: "What primarily draws your interest toward joining Freemasonry?",
    options: [
      { text: "A desire for personal growth, moral development, and self-improvement.", score: "high" },
      { text: "A sense of community, camaraderie, and participating in local charity.", score: "high" },
      { text: "Curiosity about historic traditions and esoteric symbols.", score: "neutral" },
      { text: "Looking for business networking opportunities or career advancement.", score: "low" },
    ],
  },
  {
    id: 2,
    text: "Freemasonry requires a belief in a Supreme Being, regardless of your specific religion or faith. Does this align with your personal worldview?",
    options: [
      { text: "Yes, I hold a belief in a Supreme Being or higher power.", score: "high" },
      { text: "I am open to spiritual concepts, but remain unsure.", score: "neutral" },
      { text: "No — I am strictly an atheist and hold no spiritual beliefs.", score: "low" },
    ],
  },
  {
    id: 3,
    text: "Lodge attendance involves a regular commitment — usually one evening a month for meetings, plus occasional practices. Can you balance this with your family and work life?",
    options: [
      { text: "Yes, I can comfortably commit to a regular evening each month.", score: "high" },
      { text: "My schedule is busy, but I can prioritise something that matters to me.", score: "neutral" },
      { text: "My schedule is completely unpredictable and leaves very little free time.", score: "low" },
    ],
  },
  {
    id: 4,
    text: "Freemasonry places charitable giving at its core. How important is community support and charity to you personally?",
    options: [
      { text: "It is deeply important — I want to actively support local causes in Guildford and Surrey.", score: "high" },
      { text: "I am happy to contribute when my budget allows.", score: "neutral" },
      { text: "I rarely think about or participate in charitable activities.", score: "low" },
    ],
  },
  {
    id: 5,
    text: "How do you feel about participating in traditional ceremonies, historic ritual, and dramatic plays that convey moral lessons?",
    options: [
      { text: "I appreciate tradition and would enjoy learning and taking part in Lodge ritual.", score: "high" },
      { text: "I am comfortable observing ceremonies, though formal settings can make me nervous.", score: "neutral" },
      { text: "I strongly dislike formal traditions, rituals, or symbolic ceremonies.", score: "low" },
    ],
  },
];

// ─── Animation Variants ───────────────────────────────────────────────────────
const questionVariants = (reduce: boolean) => ({
  initial: { opacity: 0, x: reduce ? 0 : 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: reduce ? 0 : -20 },
});

// ─── Component ────────────────────────────────────────────────────────────────
const Quiz = () => {
  const shouldReduceMotion = useReducedMotion();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [scores, setScores] = useState<ScoreMap>({ high: 0, neutral: 0, low: 0 });
  const [quizComplete, setQuizComplete] = useState(false);

  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!quizComplete && questionHeadingRef.current) {
      questionHeadingRef.current.focus();
    }
  }, [currentQuestionIndex, quizComplete]);

  const handleOptionClick = (scoreType: "high" | "neutral" | "low") => {
    setScores((prev) => ({ ...prev, [scoreType]: prev[scoreType] + 1 }));

    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setQuizComplete(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setScores({ high: 0, neutral: 0, low: 0 });
    setQuizComplete(false);
  };

  const outcome = useMemo<Outcome>(() => {
    if (!quizComplete) return "neutral-fit";
    if (scores.low >= 2) return "not-fit";
    if (scores.high >= 3) return "high-fit";
    return "neutral-fit";
  }, [scores, quizComplete]);

  const progress =
    ((currentQuestionIndex + (quizComplete ? 1 : 0)) / quizQuestions.length) * 100;

  const pageSchema = useMemo(() => {
    const breadcrumb = breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Is Freemasonry Right for You?", url: "/quiz" },
    ]);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://www.weybridgelodge.org.uk/quiz#webpage",
        url: "https://www.weybridgelodge.org.uk/quiz",
        name: "Is Freemasonry Right for You? | Weybridge Lodge No. 6787 — Freemasons in Guildford, Surrey",
        description:
          "Take our short personalised quiz to discover whether Freemasonry at Weybridge Lodge No. 6787 in Guildford, Surrey might be right for you.",
        inLanguage: "en-GB",
        isPartOf: {
          "@id": "https://www.weybridgelodge.org.uk/#website",
        },
      },
      breadcrumb,
    ];
  }, []);

  const qVariants = questionVariants(!!shouldReduceMotion);

  return (
    <div className="min-h-screen">
      <SEO
        title="Is Freemasonry Right for You?"
        description="Take our short personalised quiz to discover whether Freemasonry at Weybridge Lodge No. 6787 in Guildford, Surrey might be right for you."
        canonical="/quiz"
        schema={pageSchema}
      />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <PageHeader
          title="Is Freemasonry Right for You?"
          subtitle="A short, honest assessment to help you decide"
        />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-2xl">
            <h2 className="sr-only">
              Freemasonry suitability quiz for Weybridge Lodge in Guildford, Surrey
            </h2>

            {/* ── Progress Bar ── */}
            <div className="mb-8">
              <div
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Quiz progress"
                className="h-1 bg-border rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-gold"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
                />
              </div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mt-3">
                {quizComplete
                  ? "Assessment Complete"
                  : `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`}
              </p>
            </div>

            {/* ── Quiz Card ── */}
            <div
              aria-live="polite"
              className="bg-card border border-border rounded-sm p-6 sm:p-10 shadow-sm"
            >
              <AnimatePresence mode="wait">
                {!quizComplete ? (
                  <motion.div
                    key={currentQuestionIndex}
                    variants={qVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold font-sans mb-4">
                      <HelpCircle className="h-4 w-4" />
                      Suitability Assessment
                    </div>

                    <h3
                      ref={questionHeadingRef}
                      tabIndex={-1}
                      className="font-serif text-xl sm:text-2xl text-foreground mb-8 leading-snug outline-none"
                    >
                      {quizQuestions[currentQuestionIndex].text}
                    </h3>

                    <div className="space-y-3">
                      {quizQuestions[currentQuestionIndex].options.map((option, index) => (
                        <button
                          key={option.text}
                          onClick={() => handleOptionClick(option.score)}
                          aria-label={`Option ${String.fromCharCode(65 + index)}: ${option.text}`}
                          className="w-full text-left p-4 rounded-sm border border-border bg-background hover:border-gold hover:bg-card transition-all duration-200 text-foreground font-sans text-sm sm:text-base leading-relaxed flex items-start gap-3 group min-h-[48px]"
                        >
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-muted text-muted-foreground group-hover:bg-gold group-hover:text-accent-foreground flex items-center justify-center text-xs font-semibold transition-colors">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span>{option.text}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
                  >
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-navy text-gold mb-6">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>

                    {outcome === "high-fit" && (
                      <>
                        <h3 className="font-serif text-2xl sm:text-3xl text-foreground mb-4">
                          Strong Alignment Found
                        </h3>
                        <p className="text-muted-foreground font-sans leading-relaxed mb-8">
                          Your values, personal commitments, and community mindset align closely
                          with the foundational principles of Freemasonry. We would be delighted to
                          hear from you at Weybridge Lodge No. 6787 — our Masonic Lodge in
                          Guildford, Surrey.
                        </p>
                        <div className="flex flex-wrap gap-4 mb-8">
                          <Link
                            to="/join-us"
                            className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                          >
                            Begin Your Application
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          <Link
                            to="/first-visit"
                            className="inline-flex items-center justify-center border border-border text-foreground px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
                          >
                            Your Initiation Night
                          </Link>
                        </div>
                      </>
                    )}

                    {outcome === "neutral-fit" && (
                      <>
                        <h3 className="font-serif text-2xl sm:text-3xl text-foreground mb-4">
                          Curious and Exploring
                        </h3>
                        <p className="text-muted-foreground font-sans leading-relaxed mb-8">
                          You show a genuine interest in community and personal reflection, but may
                          still have questions about how Freemasonry fits into your life. Our FAQ
                          page covers the questions most people have at this stage — and our
                          Membership Secretary is always happy to talk.
                        </p>
                        <div className="flex flex-wrap gap-4 mb-8">
                          <Link
                            to="/faq"
                            className="inline-flex items-center justify-center gap-2 bg-gold-shimmer text-accent-foreground px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:opacity-90 transition-opacity"
                          >
                            Browse Our FAQs
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          <Link
                            to="/contact"
                            className="inline-flex items-center justify-center border border-border text-foreground px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
                          >
                            Ask a Question
                          </Link>
                        </div>
                      </>
                    )}

                    {outcome === "not-fit" && (
                      <>
                        <h3 className="font-serif text-2xl sm:text-3xl text-foreground mb-4">
                          Perhaps Not Right Now
                        </h3>
                        <p className="text-muted-foreground font-sans leading-relaxed mb-8">
                          Based on your responses, Freemasonry may not be the right fit for you at
                          this moment in your life — and that is perfectly fine. Circumstances
                          change, and curiosity is always welcome. If you have questions or simply
                          want to learn more, our FAQ page and Membership Secretary are both here.
                        </p>
                        <div className="flex flex-wrap gap-4 mb-8">
                          <Link
                            to="/faq"
                            className="inline-flex items-center justify-center border border-border text-foreground px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
                          >
                            Read Our FAQs
                          </Link>
                          <Link
                            to="/contact"
                            className="inline-flex items-center justify-center border border-border text-foreground px-6 py-3 rounded-sm text-sm font-semibold font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
                          >
                            Get in Touch
                          </Link>
                        </div>
                      </>
                    )}

                    <button
                      onClick={resetQuiz}
                      className="inline-flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-gold transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restart Assessment
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Quiz;
