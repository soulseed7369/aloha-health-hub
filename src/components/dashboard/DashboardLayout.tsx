import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { Home, User, Building, CalendarDays, Sparkles, Quote, CreditCard, Settings, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/admin";
import { useAccountType } from "@/hooks/useAccountType";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Links for practitioners
const practitionerLinks = [
  { label: "Dashboard Home",          to: "/dashboard",              icon: Home },
  { label: "My Practitioner Profile", to: "/dashboard/profile",      icon: User },
  { label: "Offerings & Events",      to: "/dashboard/offerings",    icon: Sparkles },
  { label: "Classes",                 to: "/dashboard/classes",      icon: CalendarDays },
  { label: "Testimonials",            to: "/dashboard/testimonials", icon: Quote },
  { label: "Billing & Subscription",  to: "/dashboard/billing",      icon: CreditCard },
  { label: "Account Settings",        to: "/dashboard/settings",     icon: Settings },
];

// Links for centers
const centerLinks = [
  { label: "Dashboard Home",          to: "/dashboard",              icon: Home },
  { label: "My Centers & Spas",       to: "/dashboard/centers",      icon: Building },
  { label: "Billing & Subscription",  to: "/dashboard/billing",      icon: CreditCard },
  { label: "Account Settings",        to: "/dashboard/settings",     icon: Settings },
];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: accountType, isLoading: accountTypeLoading } = useAccountType();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Display name: email local part or fallback
  const displayName = user?.email ? user.email.split("@")[0] : "Provider";

  // Determine which sidebar links to show
  // Don't show links while loading to avoid flash of wrong type
  const sidebarLinks = accountTypeLoading ? [] : (accountType === 'center' ? centerLinks : practitionerLinks);

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/" className="flex-shrink-0">
            <img
              src="/hawaii-wellness-logo.png"
              alt="Hawaiʻi Wellness"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2">
            {accountTypeLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : accountType === 'center' ? (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                Center
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Practitioner
              </Badge>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 p-3">
          {isAdmin(user?.email) && (
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/20 mb-2"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Admin Panel
            </Link>
          )}
          {accountTypeLoading ? (
            // Show skeleton placeholders while loading to avoid flash of wrong links
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </>
          ) : (
            sidebarLinks.map((link) => {
              const isActive =
                link.to === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </Link>
              );
            })
          )}
        </nav>

        {/* Sidebar footer — user email + sign out */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          {user?.email && (
            <p className="truncate px-3 py-1 text-xs text-sidebar-foreground/50">
              {user.email}
            </p>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            ← Back to Directory
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-medium text-muted-foreground">
            Welcome back,{" "}
            <span className="text-foreground">{displayName}</span>
          </h2>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
