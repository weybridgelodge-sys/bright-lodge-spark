import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
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
import News from "./pages/News";
import Anniversary75th from "./pages/news/Anniversary75th";
import SandsCharity from "./pages/news/SandsCharity";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/what-is-freemasonry" element={<WhatIsFreemasonry />} />
          <Route path="/freemasonry-and-charity" element={<FreemasonryCharity />} />
          <Route path="/our-charities" element={<OurCharities />} />
          <Route path="/join-us" element={<JoinUs />} />
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
          <Route path="/news" element={<News />} />
          <Route path="/news/75th-anniversary" element={<Anniversary75th />} />
          <Route path="/news/sands-charity" element={<SandsCharity />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
