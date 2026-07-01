import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/members/ProtectedRoute";
import ProgressionRoute from "./components/members/ProgressionRoute";

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
const LodgeSummaryReport = lazy(() => import("./pages/members/development/LodgeSummaryReport"));
const WorkingGroupsIndex = lazy(() => import("./pages/members/working-groups/Index"));
const WorkingGroupDetail = lazy(() => import("./pages/members/working-groups/Detail"));
const WorkingGroupsAdmin = lazy(() => import("./pages/members/working-groups/Admin"));
const AdHocSocials = lazy(() => import("./pages/members/working-groups/Socials"));
const LodgeVisits = lazy(() => import("./pages/members/working-groups/Visits"));
const CharityStewardPage = lazy(() => import("./pages/members/admin/CharitySteward"));
const AdminHub = lazy(() => import("./pages/members/admin/AdminHub"));
const NewsletterHub = lazy(() => import("./pages/members/admin/NewsletterHub"));

const MembersRoutes = () => (
  <AuthProvider>
    <Suspense fallback={null}>
      <Routes>
        <Route path="login" element={<MembersLogin />} />
        <Route path="pending" element={<MembersPending />} />
        <Route path="" element={<ProtectedRoute><MembersDashboard /></ProtectedRoute>} />
        <Route path="directory" element={<ProtectedRoute><MembersDirectory /></ProtectedRoute>} />
        <Route path="documents" element={<ProtectedRoute><MembersDocuments /></ProtectedRoute>} />
        <Route path="ritual" element={<ProtectedRoute><MembersRitual /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><MembersProfile /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute adminOnly><MembersAdmin /></ProtectedRoute>} />
        <Route path="events" element={<ProtectedRoute><EventsAdmin /></ProtectedRoute>} />
        <Route path="officers-tracker" element={<ProgressionRoute><OfficersTracker /></ProgressionRoute>} />
        <Route path="kpis" element={<ProgressionRoute><Kpis /></ProgressionRoute>} />
        <Route path="loi-register" element={<ProtectedRoute><LoiRegister /></ProtectedRoute>} />
        <Route path="festive-register" element={<ProtectedRoute><FestiveBoardRegister /></ProtectedRoute>} />
        <Route path="summons" element={<ProtectedRoute><SummonsBuilder /></ProtectedRoute>} />
        <Route path="almoner" element={<ProtectedRoute><AlmonerPortal /></ProtectedRoute>} />
        <Route path="development" element={<MyDevelopment />} />
        <Route path="admin/development" element={<MentorDashboard />} />
        <Route path="admin/skills-matrix" element={<SkillsMatrix />} />
        <Route path="admin/loi-helper" element={<LoiAssignmentHelper />} />
        <Route path="development/summary-report" element={<LodgeSummaryReport />} />
        <Route path="development/:memberId" element={<MemberDevelopment />} />
        <Route path="admin/charity" element={<CharityStewardPage />} />
        <Route path="admin-hub" element={<AdminHub />} />
        <Route path="admin/newsletter" element={<NewsletterHub />} />
        <Route path="working-groups" element={<WorkingGroupsIndex />} />
        <Route path="working-groups/admin" element={<WorkingGroupsAdmin />} />
        <Route path="working-groups/socials" element={<AdHocSocials />} />
        <Route path="working-groups/visits" element={<LodgeVisits />} />
        <Route path="working-groups/:slug" element={<WorkingGroupDetail />} />
      </Routes>
    </Suspense>
  </AuthProvider>
);

export default MembersRoutes;
