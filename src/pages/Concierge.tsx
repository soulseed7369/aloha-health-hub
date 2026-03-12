import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Sparkles, Heart, Shield } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/lib/supabase";

const ISLANDS = ["Big Island", "Maui", "Oahu", "Kauai", "Not sure yet"];

const Concierge = () => {
  usePageMeta("Wellness Concierge", "Personalized wellness curation for discerning visitors to Hawaiʻi. Let us connect you with the perfect practitioner or retreat.");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [island, setIsland] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      if (supabase) {
        const { error: dbErr } = await supabase
          .from("concierge_requests")
          .insert({ name, email, island, message });
        if (dbErr) throw dbErr;
      }
      setSubmitted(true);
    } catch {
      // Fallback: open mailto
      const subject = encodeURIComponent("Concierge Inquiry");
      const body = encodeURIComponent(`Name: ${name}\nIsland: ${island}\n\n${message}`);
      window.location.href = `mailto:aloha@hawaiiwellness.net?subject=${subject}&body=${body}`;
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(220,20%,8%)] to-[hsl(220,30%,15%)] py-20 text-white">
        <div className="container text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-amber-400" />
          <h1 className="mb-3 font-display text-3xl font-bold md:text-5xl">
            Black Label Concierge
          </h1>
          <p className="mx-auto max-w-xl text-lg text-white/70">
            Exclusive wellness curation for discerning visitors to Hawaiʻi. Tell us what you're seeking — we'll find the perfect practitioner or retreat.
          </p>
        </div>
      </section>

      {/* Value props */}
      <section className="border-b border-border bg-secondary/20 py-12">
        <div className="container">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: <Heart className="h-6 w-6 text-rose-500" />,
                title: "Personalized Matching",
                desc: "We hand-select practitioners based on your specific wellness goals, schedule, and preferences.",
              },
              {
                icon: <Shield className="h-6 w-6 text-primary" />,
                title: "Vetted Practitioners",
                desc: "Every recommendation is a credentialed professional with verified reviews and island expertise.",
              },
              {
                icon: <Sparkles className="h-6 w-6 text-amber-500" />,
                title: "Exclusive Access",
                desc: "Access to retreat spaces, private sessions, and premium practitioners not available in the public directory.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex-shrink-0 pt-0.5">{item.icon}</div>
                <div>
                  <h3 className="mb-1 font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section className="container max-w-xl py-16">
        <h2 className="mb-2 font-display text-2xl font-bold">Tell us what you're looking for</h2>
        <p className="mb-8 text-muted-foreground">
          We'll follow up within 24 hours with personalized recommendations.
        </p>

        {submitted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            <h3 className="mb-2 text-lg font-semibold">Mahalo! We've received your request.</h3>
            <p className="text-sm text-muted-foreground">
              Our team will be in touch within 24 hours with personalized wellness recommendations tailored to your needs.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/directory">Browse Directory While You Wait</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="concierge-name">Your Name</Label>
                <Input
                  id="concierge-name"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="concierge-email">Email Address</Label>
                <Input
                  id="concierge-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="concierge-island">Island of Interest</Label>
              <Select value={island} onValueChange={setIsland}>
                <SelectTrigger id="concierge-island">
                  <SelectValue placeholder="Which island are you visiting?" />
                </SelectTrigger>
                <SelectContent>
                  {ISLANDS.map(i => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="concierge-message">What are you looking for?</Label>
              <Textarea
                id="concierge-message"
                placeholder="Tell us about your wellness goals, preferred modalities, dates, budget, or anything else that would help us find the perfect match…"
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Sending…" : "Send Concierge Request"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Or email us directly at{" "}
              <a href="mailto:aloha@hawaiiwellness.net" className="text-primary hover:underline">
                aloha@hawaiiwellness.net
              </a>
            </p>
          </form>
        )}
      </section>
    </main>
  );
};

export default Concierge;
