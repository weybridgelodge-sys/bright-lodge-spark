import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import ScrollToTopButton from "./components/ScrollToTopButton";
import Index from "./pages/Index";

// Lazy-load everything except the landing page to keep the initial bundle tiny.
const NotFound = lazy(() => import("./pages/NotFound"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const WhatIsFreemasonry = lazy(() => import("./pages/WhatIsFreemasonry"));
const FreemasonryCharity = lazy(() => import("./pages/FreemasonryCharity"));
const OurCharities = lazy(() => import("./pages/OurCharities"));
const JoinUs = lazy(() => import("./pages/JoinUs"));
const DataProtection = lazy(() => import("./pages/DataProtection"));
const LodgeProfile = lazy(() => import("./pages/LodgeProfile"));
const History = lazy(() => import("./pages/History"));
const WorshipfulMasters = lazy(() => import("./pages/WorshipfulMasters"));
const Officers = lazy(() => import("./pages/Officers"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const VideoHub = lazy(() => import("./pages/VideoHub"));
const MasonicLinks = lazy(() => import("./pages/MasonicLinks"));
const Bookings = lazy(() => import("./pages/Bookings"));
const OfficersJewels = lazy(() => import("./pages/OfficersJewels"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const News = lazy(() => import("./pages/News"));
const SanityPost = lazy(() => import("./pages/news/SanityPost"));
const Anniversary75th = lazy(() => import("./pages/news/Anniversary75th"));
const SandsCharity = lazy(() => import("./pages/news/SandsCharity"));
const InstallationMeeting = lazy(() => import("./pages/news/InstallationMeeting"));
const ApgmVisit = lazy(() => import("./pages/news/ApgmVisit"));
const Surrey2030Gold = lazy(() => import("./pages/news/Surrey2030Gold"));
const DoubleInitiationDecember2025 = lazy(() => import("./pages/news/DoubleInitiationDecember2025"));
const ThreeMasonicDegrees = lazy(() => import("./pages/news/ThreeMasonicDegrees"));
const RoyalArchExplained = lazy(() => import("./pages/news/RoyalArchExplained"));
const ThamesChallengePage = lazy(() => import("./pages/ThamesChallengePage"));
const Events = lazy(() => import("./pages/Events"));
const LadiesFestival = lazy(() => import("./pages/LadiesFestival"));
const FirstVisit = lazy(() => import("./pages/FirstVisit"));
const YourInitiation = lazy(() => import("./pages/YourInitiation"));
const YourJourney = lazy(() => import("./pages/YourJourney"));
const LodgeTraditions = lazy(() => import("./pages/LodgeTraditions"));
const Quiz = lazy(() => import("./pages/Quiz"));

// Entire members portal (including AuthProvider + Supabase client) is loaded
// only when a visitor navigates into /members/*.
const MembersRoutes = lazy(() => import("./MembersRoutes"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <ScrollToTopButton />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/what-is-freemasonry" element={<WhatIsFreemasonry />} />
            <Route path="/freemasonry-and-charity" element={<FreemasonryCharity />} />
            <Route path="/our-charities" element={<OurCharities />} />
            <Route path="/join-us" element={<JoinUs />} />
            <Route path="/first-visit" element={<FirstVisit />} />
            <Route path="/your-initiation" element={<YourInitiation />} />
            <Route path="/your-journey" element={<YourJourney />} />
            <Route path="/lodge-traditions" element={<LodgeTraditions />} />
            <Route path="/data-protection" element={<DataProtection />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/lodge-profile" element={<LodgeProfile />} />
            <Route path="/history" element={<History />} />
            <Route path="/worshipful-masters" element={<WorshipfulMasters />} />
            <Route path="/officers" element={<Officers />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/video-hub" element={<VideoHub />} />
            <Route path="/masonic-links" element={<MasonicLinks />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/officers-jewels" element={<OfficersJewels />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />
            <Route path="/events" element={<Events />} />
            <Route path="/ladies-festival" element={<LadiesFestival />} />
            <Route path="/ladies-night" element={<LadiesFestival />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/category/:category" element={<News />} />
            <Route path="/news/75th-anniversary" element={<Anniversary75th />} />
            <Route path="/news/sands-charity" element={<SandsCharity />} />
            <Route path="/news/installation-meeting-october-2023" element={<InstallationMeeting />} />
            <Route path="/news/pgm-visit-february-2026" element={<ApgmVisit />} />
            <Route path="/news/surrey-2030-festival-gold" element={<Surrey2030Gold />} />
            <Route path="/news/double-initiation-december-2025" element={<DoubleInitiationDecember2025 />} />
            <Route path="/news/three-masonic-degrees-explained" element={<ThreeMasonicDegrees />} />
            <Route path="/news/royal-arch-explained" element={<RoyalArchExplained />} />
            <Route path="/thames-challenge" element={<ThamesChallengePage />} />
            <Route path="/news/:slug" element={<SanityPost />} />

            {/* Members Portal — entirely lazy-loaded (incl. AuthProvider + Supabase) */}
            <Route path="/members/*" element={<MembersRoutes />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
