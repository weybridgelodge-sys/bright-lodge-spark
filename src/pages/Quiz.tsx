import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw, CheckCircle2, HelpCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO, { breadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";

interface Question {
  id: number;
  text: string;
  options: { text: string; score: "high" | "neutral" | "low" }[];
}

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
    text: "Freemasonry requires a belief in a Supreme Being (regardless of your specific religion or faith). Does this align with your personal worldview?",
    options: [
      { text: "Yes, I hold a belief in a Supreme Being / higher power.", score: "high" },
      { text: "I am open to spiritual concepts, but unsure.", score: "neutral" },
      { text: "No, I am strictly an atheist or do not hold any spiritual beliefs.", score: "low" },
    ],
  },
  {
    id: 3,
    text: "Lodge attendance requires a regular commitment (usually one evening a month for meetings, plus occasional practices). Can you comfortably balance this with your family and work responsibilities?",
    options: [
      { text: "Yes, I can comfortably commit to a regular evening each month.", score: "high" },
      { text: "I have a busy schedule, but I can make time for something important.", score: "neutral" },
      { text: "My schedule is completely unpredictable and leaves very little free time.", score: "low" },
    ],
  },
  {
    id: 4,
    text: "Our fraternity is heavily focused on community support and charitable giving. How do you view charitable involvement?",
    options: [
      { text: "It is deeply important to me, and I want to actively support local causes.", score: "high" },
      { text: "I am happy to contribute financially when my budget allows.", score: "neutral" },
      { text: "I rarely think about or participate in charitable activities.", score: "low" },
    ],
  },
  {
    id: 5,
    text: "How do you feel about participating in traditional, historic ceremonies and dramatic ritual plays?",
    options: [
      { text: "I appreciate tradition and would enjoy learning and taking part in rituals.", score: "high" },
      { text: "I am comfortable watching ceremonies, though public speaking makes me a bit nervous.", score: "neutral" },
      { text: "I strongly dislike formal traditions, rituals, or symbolic ceremonies.", score: "low" },
    ],
  },
];

const Quiz = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [scores, setScores] = useState<{ high: number; neutral: number; low: number }>({
    high: 0,
    neutral: 0,
    low: 0,
  });
  const [quizComplete, setQuizComplete] = useState(false);

  const handleOptionClick = (scoreType: "high" | "neutral" | "low") => {
    const updatedScores = { ...scores, [scoreType]: scores[scoreType] + 1 };
    setScores(updatedScores);

    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setQuizComplete(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setScores({ high: 0, neutral: 0, low: 0 });
    setQuizComplete(false);
  };

  const getOutcome = () => {
    if (scores.low >= 2) return "not-fit";
    if (scores.high >= 3) return "high-fit";
    return "neutral-fit";
  };

  const outcome = getOutcome();
  const progress = ((currentQuestionIndex + (quizComplete ? 1 : 0)) / quizQuestions.length) * 100;

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
              <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gold h-1.5 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs font-sans text-muted-foreground mt-2 text-right uppercase tracking-wider">
                {quizComplete
                  ? "Assessment Complete"
                  : `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`}
              </p>
            </div>

            <div className="bg-card border border-border rounded-sm shadow-sm p-6 md:p-8">
              <AnimatePresence mode="wait">
                {!quizComplete ? (
                  <motion.div
                    key={currentQuestionIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider mb-6">
                      <HelpCircle className="h-3.5 w-3.5 text-gold" />
                      <span>Suitability Assessment</span>
                    </div>

                    <h2 className="font-serif text-xl md:text-2xl text-card-foreground mb-6 leading-tight">
                      {quizQuestions[currentQuestionIndex].text}
                    </h2>

                    <div className="space-y-3">
                      {quizQuestions[currentQuestionIndex].options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleOptionClick(option.score)}
                          className="w-full text-left p-4 rounded-sm border border-border bg-background hover:border-gold hover:bg-gold/5 transition-all duration-200 text-foreground text-sm sm:text-base leading-relaxed flex items-start gap-3 group"
                        >
                          <span className="inline-flex items-center justify-center border border-border group-hover:border-gold h-5 w-5 rounded-full text-xs font-bold text-muted-foreground group-hover:text-gold shrink-0 mt-0.5">
                            {String.fromCharCode(65 + index)}
                          </span>
                          {option.text}
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
                    className="text-center py-4"
                  >
                    <div className="inline-flex items-center justify-center p-3 bg-gold/10 rounded-full mb-6">
                      <CheckCircle2 className="h-10 w-10 text-gold" />
                    </div>

                    {outcome === "high-fit" && (
                      <div>
                        <h2 className="font-serif text-2xl md:text-3xl font-bold text-card-foreground mb-4">
                          Strong Alignment Found
                        </h2>
                        <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                          Your values, personal commitments, and community mindset align perfectly with the foundational tenets of Freemasonry. We welcome you to take the next step in your journey with Weybridge Lodge.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button asChild className="bg-gold hover:bg-gold/90 text-navy font-semibold px-6 py-5 rounded-sm">
                            <Link to="/join-us" className="flex items-center justify-center gap-2">
                              Apply to Join <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild variant="outline" className="border-border text-foreground px-6 py-5 rounded-sm">
                            <Link to="/first-visit">Read First Visit Guide</Link>
                          </Button>
                        </div>
                      </div>
                    )}

                    {outcome === "neutral-fit" && (
                      <div>
                        <h2 className="font-serif text-2xl md:text-3xl font-bold text-card-foreground mb-4">
                          Curious & Exploring
                        </h2>
                        <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                          You demonstrate a solid interest in community and personal reflection, but you might still have lingering questions about how the fraternity fits into your lifestyle. We recommend exploring our comprehensive FAQ page.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button asChild className="bg-gold hover:bg-gold/90 text-navy font-semibold px-6 py-5 rounded-sm">
                            <Link to="/faq">Browse Our FAQs</Link>
                          </Button>
                          <Button asChild variant="outline" className="border-border text-foreground px-6 py-5 rounded-sm">
                            <Link to="/contact">Ask a Question</Link>
                          </Button>
                        </div>
                      </div>
                    )}

                    {outcome === "not-fit" && (
                      <div>
                        <h2 className="font-serif text-2xl md:text-3xl font-bold text-card-foreground mb-4">
                          Thank You for Your Interest
                        </h2>
                        <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                          Based on your responses regarding time commitments, worldview, or core goals, Freemasonry might not be the ideal fit for you at this exact moment in your life. We appreciate your curiosity and time spent learning about our history.
                        </p>
                        <Button asChild variant="outline" className="border-border text-foreground px-6 py-5 rounded-sm">
                          <Link to="/">Return Home</Link>
                        </Button>
                      </div>
                    )}

                    <button
                      onClick={resetQuiz}
                      className="mt-12 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-gold tracking-wide uppercase transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restart Assessment
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
