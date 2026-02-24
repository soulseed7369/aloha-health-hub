import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-accent text-accent-foreground">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <span className="font-display text-lg font-bold">Hawai'i Holistic Health</span>
            <p className="text-sm opacity-80">
              Connecting you with the Big Island's finest holistic practitioners, retreats, and wellness centers.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider opacity-70">Explore</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/directory" className="opacity-80 hover:opacity-100">Browse Directory</Link>
              <Link to="/articles" className="opacity-80 hover:opacity-100">Articles & News</Link>
              <Link to="/list-your-practice" className="opacity-80 hover:opacity-100">List Your Practice</Link>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider opacity-70">Support</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <a href="#" className="opacity-80 hover:opacity-100">Help Center</a>
              <a href="#" className="opacity-80 hover:opacity-100">Privacy Policy</a>
              <a href="#" className="opacity-80 hover:opacity-100">Terms of Service</a>
            </nav>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider opacity-70">Stay Connected</h4>
            <p className="text-sm opacity-80">Get wellness insights delivered to your inbox.</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <Input
                type="email"
                placeholder="Your email"
                className="border-accent-foreground/20 bg-accent-foreground/10 text-accent-foreground placeholder:text-accent-foreground/50"
              />
              <Button size="icon" variant="secondary" type="submit">
                <Mail className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-10 border-t border-accent-foreground/10 pt-6 text-center text-xs opacity-60">
          © {new Date().getFullYear()} Hawai'i Holistic Health Directory. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
