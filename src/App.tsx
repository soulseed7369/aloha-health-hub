import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Index from "./pages/Index";
import Directory from "./pages/Directory";
import Retreats from "./pages/Retreats";
import Articles from "./pages/Articles";
import ListYourPractice from "./pages/ListYourPractice";
import ProfileDetail from "./pages/ProfileDetail";
import Concierge from "./pages/Concierge";
import RetreatDetail from "./pages/RetreatDetail";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import DashboardProfile from "./pages/dashboard/DashboardProfile";
import DashboardCenters from "./pages/dashboard/DashboardCenters";
import DashboardRetreats from "./pages/dashboard/DashboardRetreats";
import DashboardSettings from "./pages/dashboard/DashboardSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Concierge has its own dark layout */}
          <Route path="/concierge" element={<Concierge />} />

          {/* Provider Dashboard */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="profile" element={<DashboardProfile />} />
            <Route path="centers" element={<DashboardCenters />} />
            <Route path="retreats" element={<DashboardRetreats />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>

          {/* All other pages share Header/Footer */}
          <Route
            path="*"
            element={
              <div className="flex min-h-screen flex-col">
                <Header />
                <div className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/directory" element={<Directory />} />
                    <Route path="/retreats" element={<Retreats />} />
                    <Route path="/retreats/:id" element={<RetreatDetail />} />
                    <Route path="/articles" element={<Articles />} />
                    <Route path="/list-your-practice" element={<ListYourPractice />} />
                    <Route path="/profile/:id" element={<ProfileDetail />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
                <Footer />
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
