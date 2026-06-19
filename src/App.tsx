import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import ScrollToTopButton from "./components/ScrollToTopButton";
import Index from "./pages/Index";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/members/ProtectedRoute";
import ProgressionRoute from "./components/members/ProgressionRoute";

// Lazy-load everything except the landing page to keep the initial bundle tiny.
const NotFound = lazy(() => import("./pages/NotFound"));
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
const Events = lazy(() => import("./pages/Events"));
const LadiesFestival = lazy(() => import("./pages/LadiesFestival"));
const FirstVisit = lazy(() => import("./pages/FirstVisit"));
const YourInitiation = lazy(() => import("./pages/YourInitiation"));
const YourJourney = lazy(() => import("./pages/YourJourney"));
const LodgeTraditions = lazy(() => import("./pages/LodgeTraditions"));
const Quiz = lazy(() => import("./pages/Quiz"));
const MembersLogin = lazy(() => import("./pages/members/Login"));
const MembersPending = lazy(() => import("./pages/members/Pending"));
const MembersDashboard = lazy(() => import("./pages/members/Dashboard"));
const MembersDirectory = lazy(() => import("./pages/members/Directory"));
const MembersDocuments = lazy(() => import("./pages/members/Documents"));
const MembersProfile = lazy(() => import("./pages/members/Profile"));
const MembersAdmin = lazy(() => import("./pages/members/Admin"));
const EventsAdmin = lazy(() => import("./pages/members/EventsAdmin"));
const MembersRitual = lazy(() => import("./pages/members/Ritual"));
const OfficersTracker = lazy(() => import("./pages/members/OfficersTracker"));
const Kpis = lazy(() => import("./pages/members/Kpis"));
const LoiRegister = lazy(() => import("./pages/members/LoiRegister"));
const FestiveBoardRegister = lazy(() => import("./pages/members/FestiveBoardRegister"));
const SummonsBuilder = lazy(() => import("./pages/members/SummonsBuilder"));
const AlmonerPortal = lazy(() => import("./pages/members/AlmonerPortal"));
const MyDevelopment = lazy(() => import("./pages/members/development/MemberDevelopment").then((m) => ({ default: m.MyDevelopmentPage })));
const MemberDevelopment = lazy(() => import("./pages/members/development/MemberDevelopment").then((m) => ({ default: m.MemberDevelopmentPage })));
const MentorDashboard = lazy(() => import("./pages/members/development/MentorDashboard"));
const SkillsMatrix = lazy(() => import("./pages/members/development/SkillsMatrix"));
const LoiAssignmentHelper = lazy(() => import("./pages/members/development/LoiAssignmentHelper"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
            <Route path="/news/:slug" element={<SanityPost />} />

            {/* Members Portal */}
            <Route path="/members/login" element={<MembersLogin />} />
            <Route path="/members/pending" element={<MembersPending />} />
            <Route path="/members" element={<ProtectedRoute><MembersDashboard /></ProtectedRoute>} />
            <Route path="/members/directory" element={<ProtectedRoute><MembersDirectory /></ProtectedRoute>} />
            <Route path="/members/documents" element={<ProtectedRoute><MembersDocuments /></ProtectedRoute>} />
            <Route path="/members/ritual" element={<ProtectedRoute><MembersRitual /></ProtectedRoute>} />
            <Route path="/members/profile" element={<ProtectedRoute><MembersProfile /></ProtectedRoute>} />
            <Route path="/members/admin" element={<ProtectedRoute adminOnly><MembersAdmin /></ProtectedRoute>} />
            <Route path="/members/events" element={<ProtectedRoute><EventsAdmin /></ProtectedRoute>} />
            <Route path="/members/officers-tracker" element={<ProgressionRoute><OfficersTracker /></ProgressionRoute>} />
            <Route path="/members/kpis" element={<ProgressionRoute><Kpis /></ProgressionRoute>} />
            <Route path="/members/loi-register" element={<ProtectedRoute><LoiRegister /></ProtectedRoute>} />
            <Route path="/members/festive-register" element={<ProtectedRoute><FestiveBoardRegister /></ProtectedRoute>} />
            <Route path="/members/summons" element={<ProtectedRoute><SummonsBuilder /></ProtectedRoute>} />
            <Route path="/members/almoner" element={<ProtectedRoute><AlmonerPortal /></ProtectedRoute>} />
            <Route path="/members/development" element={<MyDevelopment />} />
            <Route path="/members/admin/development" element={<MentorDashboard />} />
            <Route path="/members/development/:memberId" element={<MemberDevelopment />} />



            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
