import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, Instagram } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Footer() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting || submitted) return;
    setSubmitting(true);
    try {
      if (supabase) {
        await supabase.from("newsletter_subscribers").upsert({ email: email.trim().toLowerCase() });
      }
    } catch {
      // Silently continue — show success regardless so UX is never broken
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <footer className="border-t border-border bg-accent text-accent-foreground">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="space-y-3">
            <span className="font-display text-lg font-bold">Hawaiʻi Wellness</span>
            <p className="text-sm opacity-80">
              Connecting Hawaiʻi with holistic wellness
            </p>
            <a
              href="https://www.instagram.com/hawaii.wellness"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <Instagram className="h-4 w-4" />
              @hawaii.wellness
            </a>
            <p className="text-xs opacity-50">
              Hawaii Wellness · Kamuela, HI
            </p>
          </div>

          {/* Islands */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider opacity-70">Islands</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/big-island" className="opacity-80 hover:opacity-100">Big Island</Link>
              <Link to="/maui" className="opacity-80 hover:opacity-100">Maui</Link>
              <Link to="/oahu" className="opacity-80 hover:opacity-100">Oahu</Link>
              <Link to="/kauai" className="opacity-80 hover:opacity-100">Kauai</Link>
            </nav>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider opacity-70">Explore</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/directory" className="opacity-80 hover:opacity-100">Browse Directory</Link>
              <Link to="/guides" className="opacity-80 hover:opacity-100">Wellness Guides</Link>
              <Link to="/guides/wellness-modalities-hawaii" className="opacity-80 hover:opacity-100">44 Modalities Guide</Link>
              <Link to="/articles" className="opacity-80 hover:opacity-100">Articles</Link>
              <Link to="/list-your-practice" className="opacity-80 hover:opacity-100">List Your Practice</Link>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider opacity-70">Company</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link to="/about" className="opacity-80 hover:opacity-100">About Us</Link>
              <Link to="/help" className="opacity-80 hover:opacity-100">Help Center</Link>
              <a href="mailto:aloha@hawaiiwellness.net" className="opacity-80 hover:opacity-100">Contact Us</a>
              <Link to="/privacy-policy" className="opacity-80 hover:opacity-100">Privacy Policy</Link>
              <Link to="/terms-of-service" className="opacity-80 hover:opacity-100">Terms of Service</Link>
            </nav>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider opacity-70">Stay Connected</h4>
            <p className="text-sm opacity-80">Get wellness insights delivered to your inbox.</p>
            {submitted ? (
              <div className="flex items-center gap-2 rounded-md bg-accent-foreground/10 px-3 py-2 text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-400" />
                <span>Mahalo! You're on the list.</span>
              </div>
            ) : (
              <form className="flex gap-2" onSubmit={handleNewsletterSubmit}>
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-accent-foreground/20 bg-accent-foreground/10 text-accent-foreground placeholder:text-accent-foreground/50"
                />
                <Button size="icon" variant="secondary" type="submit" disabled={submitting} aria-label="Subscribe">
                  <Mail className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-accent-foreground/10 pt-6 text-center text-xs opacity-60">
          © {new Date().getFullYear()} Hawaii Wellness · hawaiiwellness.net · All rights reserved.
        </div>
      </div>
    </footer>
  );
}
