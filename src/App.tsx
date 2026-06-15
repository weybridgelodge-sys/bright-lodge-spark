import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import ScrollToTopButton from "./components/ScrollToTopButton";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WhatIsFreemasonry from "./pages/WhatIsFreemasonry";
import FreemasonryCharity from "./pages/FreemasonryCharity";
import OurCharities from "./pages/OurCharities";
import JoinUs from "./pages/JoinUs";
import DataProtection from "./pages/DataProtection";
import LodgeProfile from "./pages/LodgeProfile";
import History from "./pages/History";
import WorshipfulMasters from "./pages/WorshipfulMasters";
import Officers from "./pages/Officers";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import VideoHub from "./pages/VideoHub";
import MasonicLinks from "./pages/MasonicLinks";
import Bookings from "./pages/Bookings";
import OfficersJewels from "./pages/OfficersJewels";
const News = lazy(() => import("./pages/News"));
const SanityPost = lazy(() => import("./pages/news/SanityPost"));
import Anniversary75th from "./pages/news/Anniversary75th";
import SandsCharity from "./pages/news/SandsCharity";
import InstallationMeeting from "./pages/news/InstallationMeeting";
import ApgmVisit from "./pages/news/ApgmVisit";
import Surrey2030Gold from "./pages/news/Surrey2030Gold";
import Events from "./pages/Events";
import LadiesFestival from "./pages/LadiesFestival";
import FirstVisit from "./pages/FirstVisit";
import YourInitiation from "./pages/YourInitiation";
import YourJourney from "./pages/YourJourney";
import LodgeTraditions from "./pages/LodgeTraditions";
import Quiz from "./pages/Quiz";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/members/ProtectedRoute";
import MembersLogin from "./pages/members/Login";
import MembersPending from "./pages/members/Pending";
import MembersDashboard from "./pages/members/Dashboard";
import MembersDirectory from "./pages/members/Directory";
import MembersDocuments from "./pages/members/Documents";
import MembersProfile from "./pages/members/Profile";
import MembersAdmin from "./pages/members/Admin";

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
            <Route path="/members/profile" element={<ProtectedRoute><MembersProfile /></ProtectedRoute>} />
            <Route path="/members/admin" element={<ProtectedRoute adminOnly><MembersAdmin /></ProtectedRoute>} />

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

