import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle, Mail, ArrowRight, Star, Globe, ExternalLink,
  ChevronDown, ChevronUp, Sparkles, Layout, Smartphone, Pen,
  Link2, Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  PACKAGES,
  KAMAAINA_WEBSITE_SPOTS,
} from "@/lib/websitePackages";

const BASE_FEATURE_ICONS: React.ElementType[] = [
  Layout, Smartphone, Pen, Link2, Mail, Lock, Globe,
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Book a discovery call",
    description: "A free 20-minute conversation to understand your practice, goals, and what kind of site will work best for you.",
  },
  {
    step: "02",
    title: "Proposal & agreement",
    description: "We'll send a clear scope of work outlining deliverables, timeline, and payment terms. No surprises.",
  },
  {
    step: "03",
    title: "Design & build",
    description: "We build your site — typically 2–4 weeks depending on package. You'll review and approve before anything goes live.",
  },
  {
    step: "04",
    title: "Launch & list",
    description: "Your site goes live and your bonus directory listing tier activates. You show up in more places, looking more professional.",
  },
];

const FAQ = [
  {
    q: "How long does it take to build?",
    a: "Essentials sites typically take 1–2 weeks. Standard takes 2–3 weeks. Pro takes 3–4 weeks. Timelines depend on how quickly you provide content and approve drafts.",
  },
  {
    q: "Do I own the website?",
    a: "Yes — you own your domain and all content. If you ever want to move to another host, we'll help you migrate.",
  },
  {
    q: "What if I already have a domain?",
    a: "No problem. We'll connect your existing domain to your new site. If you don't have one yet, we'll help you choose and register one.",
  },
  {
    q: "Who writes the content?",
    a: "Professional copywriting is included in every package. We'll write the copy based on a short intake questionnaire about your practice, style, and offerings. You review and approve before anything goes live. We just ask that you provide your own photos — a professional headshot makes a big difference.",
  },
  {
    q: "What about hosting after the included period?",
    a: "Hosting is included at no extra cost as long as your Premium or Featured directory subscription is active. If you cancel your subscription, hosting continues at $29/mo.",
  },
  {
    q: "What does social media integration include?",
    a: "On the Pro package, we connect your Instagram, Facebook, and other social profiles directly into your site — so visitors can see your latest content and follow you without ever leaving your page.",
  },
  {
    q: "Can I upgrade my package later?",
    a: "Absolutely. If you start with Essentials and want to add booking, SEO, or more pages later, we can upgrade your site. We'll credit what you've already paid toward the higher package.",
  },
];

const DISCOVERY_CALL_URL = "https://calendar.app.google/KYSWe4dXtc4rMTt1A";

export default function WebsitePackages() {
  usePageMeta(
    "Website Packages",
    "Custom websites built for Hawaiʻi wellness providers. Done-for-you sites starting at $499 with Kamaʻāina Rate pricing.",
  );

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ocean-light/60 to-secondary/30 py-20">
        <div className="container max-w-3xl text-center">
          <Badge className="mb-5 bg-ocean/10 text-ocean border-ocean/20 text-xs tracking-wide uppercase px-3 py-1">
            Built for Hawaiʻi Wellness Providers
          </Badge>
          <h1 className="mb-5 font-display text-4xl font-bold tracking-tight md:text-5xl">
            A website that helps the right clients choose you
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl leading-relaxed">
            Your listing opens the door. Your website closes the deal.
            We build sites for Hawaiʻi wellness practitioners that look extraordinary,
            rank on Google, and turn visitors into booked clients — not just browsers.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2 text-base px-8" asChild>
              <a href={DISCOVERY_CALL_URL} target="_blank" rel="noopener noreferrer">
                <Mail className="h-5 w-5" />
                Book a Free Discovery Call
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
              <a href="#packages">
                View Packages
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Website Examples ─────────────────────────────────────────────────── */}
      <section className="bg-background py-16 border-b border-border">
        <div className="container max-w-5xl">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-sage/10 text-sage-dark border-sage/20 text-xs tracking-wide uppercase px-3 py-1">
              Real examples
            </Badge>
            <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
              See what we build
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every site is custom-designed for your practice — beautiful enough to stop someone
              mid-scroll, built to actually get you clients.
            </p>
          </div>

          {/* ── Featured live example ──────────────────────────────────────── */}
          <div className="rounded-xl overflow-hidden border-2 border-primary/20 shadow-sm mb-8">
            <div
              className="h-44 flex items-end p-6 relative"
              style={{ background: "linear-gradient(135deg, #3D3530 0%, #7A5C58 50%, #C4A09A 100%)" }}
            >
              <div
                className="absolute inset-0 opacity-15"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1200&q=60')", backgroundSize: "cover", backgroundPosition: "center" }}
              />
              <div className="relative flex items-end justify-between w-full gap-4">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] uppercase bg-white/20 text-white px-2 py-0.5 rounded mb-2">
                    Live site · Standard / Pro
                  </span>
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase mb-0.5">Somatic Practitioner &amp; Mentor</p>
                  <p className="text-white font-semibold text-2xl leading-tight" style={{ fontFamily: "Georgia, serif" }}>Tracy Kelleher</p>
                  <p className="text-white/60 text-xs mt-0.5">International · Online &amp; In-Person</p>
                </div>
                <a
                  href="https://www.tracy-kelleher.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/25 px-3 py-2 rounded-lg transition-colors"
                >
                  Visit site <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="p-5 bg-white sm:grid sm:grid-cols-2 gap-5">
              <div>
                <div className="flex gap-1.5 mb-2.5">
                  {["#FAF8F4", "#3D3530", "#C4A09A", "#EDE8E3"].map(c => (
                    <div key={c} className="h-4 w-4 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: c }} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">Warm parchment &amp; rose palette</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Full-bleed hero photography, scroll animations throughout, generous whitespace that creates a luxury feel. Multi-page with a distinct page for each offering — sessions, retreats, writing, and contact.
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <p className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground mb-2">What&apos;s on the site</p>
                <div className="flex flex-wrap gap-1">
                  {["Multi-page", "Booking CTA", "Services grid", "Testimonials", "Retreats page", "Writing / Substack", "Social links", "Contact"].map(tag => (
                    <span key={tag} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Template previews ─────────────────────────────────────────── */}
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-4">Essentials-style template previews</p>
          <div className="grid gap-5 md:grid-cols-3">
            {/* Massage */}
            <div className="rounded-xl overflow-hidden border border-border group hover:shadow-md transition-shadow">
              <div
                className="h-36 flex items-end p-4 relative"
                style={{ background: "linear-gradient(135deg, #1C3028 0%, #4A7B8C 100%)" }}
              >
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=600&q=60')", backgroundSize: "cover", backgroundPosition: "center" }}
                />
                <div className="relative">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase mb-0.5">Massage Therapist</p>
                  <p className="text-white font-semibold text-lg leading-tight" style={{ fontFamily: "Georgia, serif" }}>Leilani Kahale</p>
                  <p className="text-white/60 text-xs">Lahaina, Maui</p>
                </div>
              </div>
              <div className="p-4 bg-white">
                <div className="flex gap-1.5 mb-3">
                  {["#FAF7F2", "#1C3028", "#B5624A", "#E8DFC8"].map(c => (
                    <div key={c} className="h-4 w-4 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: c }} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">Warm earthy palette</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Split-layout hero, Lomilomi service cards on a dark background, handcrafted testimonials section.
                </p>
                <div className="flex flex-wrap gap-1">
                  {["Booking CTA", "Services", "Testimonials", "About"].map(tag => (
                    <span key={tag} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Acupuncture */}
            <div className="rounded-xl overflow-hidden border border-border group hover:shadow-md transition-shadow">
              <div
                className="h-36 flex items-end p-4 relative"
                style={{ background: "linear-gradient(135deg, #141C14 0%, #5C7A5C 100%)" }}
              >
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=600&q=60')", backgroundSize: "cover", backgroundPosition: "center" }}
                />
                <div className="relative">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase mb-0.5">Acupuncturist · TCM</p>
                  <p className="text-white font-semibold text-lg leading-tight" style={{ fontFamily: "Georgia, serif" }}>Dr. Mei Chen, LAc</p>
                  <p className="text-white/60 text-xs">Honolulu, Oahu</p>
                </div>
              </div>
              <div className="p-4 bg-white">
                <div className="flex gap-1.5 mb-3">
                  {["#FAFAF7", "#1C1C1C", "#5C7A5C", "#8B7020"].map(c => (
                    <div key={c} className="h-4 w-4 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: c }} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">Sage &amp; gold palette</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Full-bleed hero with credentials bar, FAQ accordion, service grid with pricing.
                </p>
                <div className="flex flex-wrap gap-1">
                  {["Credentials", "FAQ", "4 Services", "Insurance Info"].map(tag => (
                    <span key={tag} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Yoga */}
            <div className="rounded-xl overflow-hidden border border-border group hover:shadow-md transition-shadow">
              <div
                className="h-36 flex items-end p-4 relative"
                style={{ background: "linear-gradient(135deg, #86A68A 0%, #B8776A 100%)" }}
              >
                <div className="absolute inset-0 opacity-25"
                  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=60')", backgroundSize: "cover", backgroundPosition: "center" }}
                />
                <div className="relative">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-white/70 uppercase mb-0.5">Yoga &amp; Meditation</p>
                  <p className="text-white font-semibold text-lg leading-tight" style={{ fontFamily: "Georgia, serif" }}>Kaia Pua</p>
                  <p className="text-white/70 text-xs">Kailua-Kona, Big Island</p>
                </div>
              </div>
              <div className="p-4 bg-white">
                <div className="flex gap-1.5 mb-3">
                  {["#FEFAF4", "#B8776A", "#86A68A", "#BFA06A"].map(c => (
                    <div key={c} className="h-4 w-4 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: c }} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">Dusty rose &amp; sage palette</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Full-bleed hero with offerings grid, weekly schedule, and warm testimonials section.
                </p>
                <div className="flex flex-wrap gap-1">
                  {["Classes", "Private Sessions", "Retreats", "Testimonials"].map(tag => (
                    <span key={tag} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="/website-examples-demo.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg" className="gap-2">
                <Globe className="h-4 w-4" /> View all 3 live demos <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <p className="mt-3 text-xs text-muted-foreground">Opens in a new tab · Click between templates at the top</p>
          </div>
        </div>
      </section>

      {/* ── Kamaʻāina Rate banner ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 border-y border-amber-200 py-8">
        <div className="container max-w-3xl text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Sparkles className="h-6 w-6 text-amber-500" />
            <h2 className="font-display text-2xl font-bold text-amber-900 md:text-3xl">Kamaʻāina Rate</h2>
            <Sparkles className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-base text-amber-800 leading-relaxed max-w-lg mx-auto">
            Our earliest supporters get special pricing.
            <br className="hidden sm:block" />
            Lock in your rate before spots fill up.
          </p>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Kamaʻāina Rate &mdash; first {KAMAAINA_WEBSITE_SPOTS} websites
            </span>
          </div>
        </div>
      </section>

      {/* ── Package cards ──────────────────────────────────────────────────── */}
      <section id="packages" className="container max-w-5xl py-16">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold md:text-3xl flex items-center justify-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Done-for-You Websites
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            A professional website + your directory listing, built by the team that knows Hawaiʻi wellness.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`flex flex-col ${pkg.highlight ? "ring-2 ring-primary relative" : ""}`}
            >
              {pkg.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardContent className={`flex flex-col flex-1 p-6 gap-5 ${pkg.highlight ? "pt-7" : ""}`}>
                <div>
                  <p className={`text-sm font-medium uppercase tracking-wider mb-0.5 ${pkg.highlight ? "text-primary" : "text-muted-foreground"}`}>
                    {pkg.name}
                  </p>
                  <p className="text-base font-semibold text-foreground/80 mb-2">{pkg.tagline}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold">${pkg.kamaaiaPrice.toLocaleString()}</span>
                    <span className="text-muted-foreground text-lg line-through">${pkg.price.toLocaleString()}</span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      <Sparkles className="h-3 w-3" />
                      Kamaʻāina Rate
                    </span>
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 shrink-0 mt-0.5 ${pkg.highlight ? "text-primary" : "text-sage"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Value callout — prominent */}
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-center">
                  <p className="text-sm font-semibold text-emerald-800">{pkg.valueCallout}</p>
                </div>

                {/* After-period note */}
                <p className="text-xs text-muted-foreground text-center leading-relaxed">{pkg.afterNote}</p>

                <Button
                  className="w-full mt-auto gap-2"
                  variant={pkg.highlight ? "default" : "outline"}
                  asChild
                >
                  <a href={DISCOVERY_CALL_URL} target="_blank" rel="noopener noreferrer">
                    <Mail className="h-4 w-4" />
                    Get Started
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer notes */}
        <div className="mt-8 space-y-1.5 text-center">
          <p className="text-xs text-muted-foreground">
            Hosting is included at no extra cost as long as your Premium or Featured subscription is active.
          </p>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="bg-secondary/30 py-16">
        <div className="container max-w-4xl">
          <h2 className="mb-10 text-center font-display text-2xl font-bold md:text-3xl">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center sm:text-left">
                <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  {step.step}
                </span>
                <h3 className="mb-1.5 font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="bg-secondary/30 py-16">
        <div className="container max-w-2xl">
          <h2 className="mb-8 text-center font-display text-2xl font-bold md:text-3xl">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <Card key={i} className="overflow-hidden">
                <button
                  className="flex w-full items-center justify-between p-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold pr-4">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  }
                </button>
                {openFaq === i && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-primary py-14 text-primary-foreground">
        <div className="container max-w-2xl text-center">
          <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
            Ready to get started?
          </h2>
          <p className="mb-8 text-primary-foreground/80 text-lg">
            Book a free 20-minute discovery call. We&apos;ll talk about your practice, your goals, and which package makes sense.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2 bg-white text-primary hover:bg-white/90 text-base px-8" asChild>
              <a href={DISCOVERY_CALL_URL} target="_blank" rel="noopener noreferrer">
                <Mail className="h-5 w-5" />
                Book a Discovery Call
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 border-white/40 text-primary-foreground/90 hover:bg-white/10 text-base" asChild>
              <Link to="/list-your-practice">
                View Directory Pricing
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
