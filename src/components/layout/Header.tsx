import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Menu, X } from "lucide-react";
import { IslandSelector } from "@/components/IslandSelector";
import { useState } from "react";

const navLinks = [
  { label: "Directory", to: "/directory" },
  { label: "Retreats & Immersions", to: "/retreats" },
  { label: "Articles / News", to: "/articles" },
];

export function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <span className="font-display text-xl font-bold text-accent">
            Hawai'i Holistic Health
          </span>
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
          <IslandSelector />
          <Button asChild>
            <Link to="/list-your-practice">List Your Practice</Link>
          </Button>
          <Link
            to="/concierge"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Lock className="h-3.5 w-3.5" />
            Concierge
          </Link>
        </div>

        {/* Mobile: island selector (compact) + menu toggle */}
        <div className="flex items-center gap-1 md:hidden">
          <IslandSelector compact />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            className="rounded-md p-1.5 transition-colors hover:bg-muted"
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
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-border" />
            <Button asChild className="w-full">
              <Link to="/list-your-practice" onClick={() => setMobileOpen(false)}>
                List Your Practice
              </Link>
            </Button>
            <Link
              to="/concierge"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Lock className="h-3.5 w-3.5" />
              Concierge Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
