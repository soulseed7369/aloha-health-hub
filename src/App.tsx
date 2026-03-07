import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BetaGate } from "@/components/BetaGate";

// ── Lazy-loaded page bundles ──────────────────────────────────────────────────
const Index             = lazy(() => import("./pages/Index"));
const Directory         = lazy(() => import("./pages/Directory"));
const Retreats          = lazy(() => import("./pages/Retreats"));
const RetreatDetail     = lazy(() => import("./pages/RetreatDetail"));
const Articles          = lazy(() => import("./pages/Articles"));
const ArticleDetail     = lazy(() => import("./pages/ArticleDetail"));
const ListYourPractice  = lazy(() => import("./pages/ListYourPractice"));
const ProfileDetail     = lazy(() => import("./pages/ProfileDetail"));
const Concierge         = lazy(() => import("./pages/Concierge"));
const NotFound          = lazy(() => import("./pages/NotFound"));
const Auth              = lazy(() => import("./pages/Auth"));
const AuthCallback      = lazy(() => import("./pages/AuthCallback"));
const Claim             = lazy(() => import("./pages/Claim"));
const BigIsland         = lazy(() => import("./pages/BigIsland"));
const MauiHome          = lazy(() => import("./pages/MauiHome"));
const OahuHome          = lazy(() => import("./pages/OahuHome"));
const KauaiHome         = lazy(() => import("./pages/KauaiHome"));
const PrivacyPolicy     = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService    = lazy(() => import("./pages/TermsOfService"));
const HelpCenter        = lazy(() => import("./pages/HelpCenter"));

// Dashboard pages (split separately — only loaded when user visits /dashboard)
import AdminPanel from "./pages/admin/AdminPanel";
const DashboardHome     = lazy(() => import("./pages/dashboard/DashboardHome"));
const DashboardProfile  = lazy(() => import("./pages/dashboard/DashboardProfile"));
const DashboardCenters  = lazy(() => import("./pages/dashboard/DashboardCenters"));
const DashboardRetreats = lazy(() => import("./pages/dashboard/DashboardRetreats"));
const DashboardBilling  = lazy(() => import("./pages/dashboard/DashboardBilling"));
const DashboardSettings = lazy(() => import("./pages/dashboard/DashboardSettings"));

// ── Shared page-level loading fallback ───────────────────────────────────────
function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

// ── Layout wrapper for public pages (Header + Footer) ────────────────────────
function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BetaGate>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              {/* Concierge — own full-screen dark layout */}
              <Route path="/concierge" element={<Concierge />} />

              {/* Auth — full screen, no nav */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Claim listing — full screen, no nav */}
              <Route path="/claim/:id" element={<Claim />} />

              {/* Dashboard — protected; ProtectedRoute renders Outlet */}
              <Route path="/dashboard" element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="profile"  element={<DashboardProfile />} />
                  <Route path="centers"  element={<DashboardCenters />} />
                  <Route path="retreats" element={<DashboardRetreats />} />
                  <Route path="billing"  element={<DashboardBilling />} />
                  <Route path="settings" element={<DashboardSettings />} />
                </Route>
              </Route>

              {/* Admin panel — protected route */}
              <Route path="/admin" element={<AdminProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<AdminPanel />} />
                </Route>
              </Route>

              {/* Public pages — all share Header/Footer via PublicLayout */}
              <Route element={<PublicLayout />}>
                <Route path="/"          element={<BigIsland />} />
                <Route path="/big-island" element={<BigIsland />} />
                <Route path="/maui"      element={<MauiHome />} />
                <Route path="/oahu"      element={<OahuHome />} />
                <Route path="/kauai"     element={<KauaiHome />} />
                <Route path="/directory"          element={<Directory />} />
                <Route path="/retreats"           element={<Retreats />} />
                <Route path="/retreats/:id"       element={<RetreatDetail />} />
                <Route path="/articles"           element={<Articles />} />
                <Route path="/articles/:slug"     element={<ArticleDetail />} />
                <Route path="/list-your-practice" element={<ListYourPractice />} />
                <Route path="/profile/:id"        element={<ProfileDetail />} />
                <Route path="/privacy-policy"     element={<PrivacyPolicy />} />
                <Route path="/terms-of-service"   element={<TermsOfService />} />
                <Route path="/help"               element={<HelpCenter />} />
                <Route path="*"                   element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
          </BetaGate>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
