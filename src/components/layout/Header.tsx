import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

const navLinks = [
  { label: "Directory", to: "/directory" },
  { label: "Blog", to: "/articles" },
  { label: "Guides", to: "/guides" },
  { label: "About", to: "/about" },
];

const islandLinks = [
  { label: "All Islands", to: "/" },
  { label: "Big Island", to: "/big-island" },
  { label: "Maui", to: "/maui" },
  { label: "Oahu", to: "/oahu" },
  { label: "Kauai", to: "/kauai" },
];

export function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change (e.g. browser back/forward)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <img
            src="/hawaii-wellness-logo.png"
            alt="Hawaiʻi Wellness"
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <div className="group relative">
            <button
              className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary ${
                islandLinks.some((l) => l.to === '/' ? location.pathname === '/' : location.pathname.startsWith(l.to))
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              Islands
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="invisible absolute left-0 top-full z-50 min-w-[160px] rounded-md border border-border bg-background py-1 opacity-0 shadow-md transition-[opacity,visibility] group-hover:visible group-hover:opacity-100">
              {islandLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.to
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="outline" size="sm">
            <Link to="/auth">Provider Login</Link>
          </Button>
          <Button asChild>
            <Link to="/list-your-practice">List Your Practice</Link>
          </Button>
        </div>

        {/* Mobile: menu toggle */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md transition-colors hover:bg-muted"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Islands</div>
            {islandLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="min-h-[44px] flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-border" />
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="min-h-[44px] flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-border" />
            <Button asChild variant="outline" className="w-full min-h-[44px]">
              <Link to="/auth">
                Provider Login
              </Link>
            </Button>
            <Button asChild className="w-full min-h-[44px]">
              <Link to="/list-your-practice">
                List Your Practice
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
