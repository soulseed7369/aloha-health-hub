import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePostAuthRedirect } from "@/hooks/usePostAuthRedirect";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_EMAIL } from "@/lib/siteConfig";
import { lazyWithRetry, clearChunkRetryFlag } from "@/lib/lazyWithRetry";


// ── Lazy-loaded page bundles (with auto-reload on stale chunks) ───────────────
const Directory         = lazyWithRetry(() => import("./pages/Directory"));
const Articles          = lazyWithRetry(() => import("./pages/Articles"));
const ArticleDetail     = lazyWithRetry(() => import("./pages/ArticleDetail"));
const ListYourPractice  = lazyWithRetry(() => import("./pages/ListYourPractice"));
const ProfileDetail     = lazyWithRetry(() => import("./pages/ProfileDetail"));
const CenterDetail      = lazyWithRetry(() => import("./pages/CenterDetail"));
const Concierge         = lazyWithRetry(() => import("./pages/Concierge"));
const NotFound          = lazyWithRetry(() => import("./pages/NotFound"));
const Auth              = lazyWithRetry(() => import("./pages/Auth"));
const AuthCallback      = lazyWithRetry(() => import("./pages/AuthCallback"));
const ClaimListing      = lazyWithRetry(() => import("./pages/ClaimListing"));
const TestimonialSubmit = lazyWithRetry(() => import("./pages/TestimonialSubmit"));
const BigIsland         = lazyWithRetry(() => import("./pages/BigIsland"));
const MauiHome          = lazyWithRetry(() => import("./pages/MauiHome"));
const OahuHome          = lazyWithRetry(() => import("./pages/OahuHome"));
const KauaiHome         = lazyWithRetry(() => import("./pages/KauaiHome"));
const PrivacyPolicy     = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfService    = lazyWithRetry(() => import("./pages/TermsOfService"));
const HelpCenter        = lazyWithRetry(() => import("./pages/HelpCenter"));
const About             = lazyWithRetry(() => import("./pages/About"));
const WebsitePackages   = lazyWithRetry(() => import("./pages/WebsitePackages"));

// Dashboard pages (split separately — only loaded when user visits /dashboard)
const AdminPanel        = lazyWithRetry(() => import("./pages/admin/AdminPanel"));
const DashboardHome     = lazyWithRetry(() => import("./pages/dashboard/DashboardHome"));
const DashboardProfile  = lazyWithRetry(() => import("./pages/dashboard/DashboardProfile"));
const DashboardCenters  = lazyWithRetry(() => import("./pages/dashboard/DashboardCenters"));
const DashboardOfferings    = lazyWithRetry(() => import("./pages/dashboard/DashboardOfferings"));
const DashboardClasses      = lazyWithRetry(() => import("./pages/dashboard/DashboardClasses"));
const DashboardTestimonials = lazyWithRetry(() => import("./pages/dashboard/DashboardTestimonials"));
const DashboardBilling      = lazyWithRetry(() => import("./pages/dashboard/DashboardBilling"));
const DashboardAnalytics    = lazyWithRetry(() => import("./pages/dashboard/DashboardAnalytics"));
const DashboardSettings     = lazyWithRetry(() => import("./pages/dashboard/DashboardSettings"));

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
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

const queryClient = new QueryClient();

/** Passes the current pathname to ErrorBoundary so it resets on navigation */
function LocationAwareErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}

/** Clear stale-chunk retry flag on successful mount */
function ChunkRetryReset() {
  useEffect(() => { clearChunkRetryFlag(); }, []);
  return null;
}

/** Catches post-OAuth redirects that miss /auth/callback (e.g. Supabase falls back to Site URL) */
function PostAuthRedirectGuard() {
  usePostAuthRedirect();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <ChunkRetryReset />
        <AuthProvider>
          <PostAuthRedirectGuard />
          <LocationAwareErrorBoundary>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              {/* Auth — full screen, no nav */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Claim listing — full screen, no nav */}
              <Route path="/claim/:id" element={<ClaimListing />} />

              {/* Testimonial submission — full screen, no nav */}
              <Route path="/testimonial/:token" element={<TestimonialSubmit />} />

              {/* Dashboard — protected; ProtectedRoute renders Outlet */}
              <Route path="/dashboard" element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="profile"  element={<DashboardProfile />} />
                  <Route path="centers"  element={<DashboardCenters />} />
                  <Route path="offerings"   element={<DashboardOfferings />} />
                  <Route path="classes"     element={<DashboardClasses />} />
                  <Route path="testimonials" element={<DashboardTestimonials />} />
                  <Route path="analytics"   element={<DashboardAnalytics />} />
                  <Route path="billing"     element={<DashboardBilling />} />
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
                <Route path="/articles"           element={<Articles />} />
                <Route path="/articles/:slug"     element={<ArticleDetail />} />
                <Route path="/list-your-practice" element={<ListYourPractice />} />
                <Route path="/profile/:id"        element={<ProfileDetail />} />
                <Route path="/center/:id"         element={<CenterDetail />} />
                <Route path="/concierge"          element={<Concierge />} />
                <Route path="/about"              element={<About />} />
                <Route path="/website-packages"  element={<WebsitePackages />} />
                <Route path="/privacy-policy"     element={<PrivacyPolicy />} />
                <Route path="/terms-of-service"   element={<TermsOfService />} />
                <Route path="/help"               element={<HelpCenter />} />
                <Route path="*"                   element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
          </LocationAwareErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
