import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Index from "./pages/Index";
import Directory from "./pages/Directory";
import Articles from "./pages/Articles";
import ListYourPractice from "./pages/ListYourPractice";
import ProfileDetail from "./pages/ProfileDetail";
import Concierge from "./pages/Concierge";
import NotFound from "./pages/NotFound";

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
