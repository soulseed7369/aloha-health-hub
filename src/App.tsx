import { Suspense, useEffect, memo } from "react";
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


// ── Next.js App Router shim ───────────────────────────────────────────────────
// Routes in this list are now handled by Next.js App Router (SSR).
// When React Router lands on one (e.g. an in-SPA link click), force a hard
// reload so Next.js serves the correct SSR page instead of the Vite component.
const NextJsPage = memo(function NextJsPage() {
  useEffect(() => { window.location.replace(window.location.href); }, []);
  return null;
});

// ── Lazy-loaded page bundles (with auto-reload on stale chunks) ───────────────
const Directory         = lazyWithRetry(() => import("./views/Directory"));
const Articles          = lazyWithRetry(() => import("./views/Articles"));
const ArticleDetail     = lazyWithRetry(() => import("./views/ArticleDetail"));
const ListYourPractice  = lazyWithRetry(() => import("./views/ListYourPractice"));
const Concierge         = lazyWithRetry(() => import("./views/Concierge"));
const NotFound          = lazyWithRetry(() => import("./views/NotFound"));
const Auth              = lazyWithRetry(() => import("./views/Auth"));
const AuthCallback      = lazyWithRetry(() => import("./views/AuthCallback"));
const ClaimListing      = lazyWithRetry(() => import("./views/ClaimListing"));
const TestimonialSubmit = lazyWithRetry(() => import("./views/TestimonialSubmit"));
const About             = lazyWithRetry(() => import("./views/About"));
const WebsitePackages   = lazyWithRetry(() => import("./views/WebsitePackages"));
const WebsitePreview    = lazyWithRetry(() => import("./views/WebsitePreview"));
const BigIsland         = lazyWithRetry(() => import("./views/BigIsland"));
const MauiHome          = lazyWithRetry(() => import("./views/MauiHome"));
const OahuHome          = lazyWithRetry(() => import("./views/OahuHome"));
const KauaiHome         = lazyWithRetry(() => import("./views/KauaiHome"));

// Dashboard pages (split separately — only loaded when user visits /dashboard)
const AdminPanel        = lazyWithRetry(() => import("./views/admin/AdminPanel"));
const DashboardHome     = lazyWithRetry(() => import("./views/dashboard/DashboardHome"));
const DashboardProfile  = lazyWithRetry(() => import("./views/dashboard/DashboardProfile"));
const DashboardCenterProfile = lazyWithRetry(() => import("./views/dashboard/DashboardCenterProfile"));
const DashboardCenters  = lazyWithRetry(() => import("./views/dashboard/DashboardCenters"));
const DashboardCenterOfferings = lazyWithRetry(() => import("./views/dashboard/DashboardCenterOfferings"));
const DashboardCenterClasses = lazyWithRetry(() => import("./views/dashboard/DashboardCenterClasses"));
const DashboardCenterHome   = lazyWithRetry(() => import("./views/dashboard/DashboardCenterHome"));
const DashboardOfferings    = lazyWithRetry(() => import("./views/dashboard/DashboardOfferings"));
const DashboardClasses      = lazyWithRetry(() => import("./views/dashboard/DashboardClasses"));
const DashboardTestimonials = lazyWithRetry(() => import("./views/dashboard/DashboardTestimonials"));
const DashboardBilling      = lazyWithRetry(() => import("./views/dashboard/DashboardBilling"));
const DashboardAnalytics    = lazyWithRetry(() => import("./views/dashboard/DashboardAnalytics"));
const DashboardSettings     = lazyWithRetry(() => import("./views/dashboard/DashboardSettings"));

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

              {/* Website preview — full screen, no nav */}
              <Route path="/preview/:listingId" element={<WebsitePreview />} />

              {/* Dashboard — protected; ProtectedRoute renders Outlet */}
              <Route path="/dashboard" element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="profile"  element={<DashboardProfile />} />
                  <Route path="center-profile"  element={<DashboardCenterProfile />} />
                  <Route path="centers"  element={<DashboardCenters />} />
                  <Route path="center-home"      element={<DashboardCenterHome />} />
                  <Route path="center-offerings" element={<DashboardCenterOfferings />} />
                  <Route path="center-classes" element={<DashboardCenterClasses />} />
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
                {/* ── Island homepages — served by SPA (full dynamic content) ── */}
                <Route path="/"               element={<BigIsland />} />
                <Route path="/big-island"     element={<BigIsland />} />
                <Route path="/maui"           element={<MauiHome />} />
                <Route path="/oahu"           element={<OahuHome />} />
                <Route path="/kauai"          element={<KauaiHome />} />

                {/* ── Owned by Next.js App Router (SSR) ── force hard reload ── */}
                <Route path="/profile/:id"    element={<NextJsPage />} />
                <Route path="/center/:id"     element={<NextJsPage />} />
                <Route path="/articles/:slug" element={<NextJsPage />} />
                <Route path="/privacy-policy" element={<NextJsPage />} />
                <Route path="/terms-of-service" element={<NextJsPage />} />
                <Route path="/help"           element={<NextJsPage />} />

                {/* ── Still served by this SPA ── */}
                <Route path="/directory"          element={<Directory />} />
                <Route path="/articles"           element={<Articles />} />
                <Route path="/list-your-practice" element={<ListYourPractice />} />
                <Route path="/concierge"          element={<Concierge />} />
                <Route path="/about"              element={<About />} />
                <Route path="/website-packages"   element={<WebsitePackages />} />
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
