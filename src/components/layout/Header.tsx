import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const navLinks = [
  { label: "Directory", to: "/directory" },
  { label: "Blog", to: "/articles" },
  { label: "Guides", to: "/guides" },
  { label: "About", to: "/about" },
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
