import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Clock, Mail, ArrowRight, Star, Crown, Globe, Zap, Palette, TrendingUp, Puzzle, LifeBuoy, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPractitioner } from "@/hooks/useMyPractitioner";
import {
  PACKAGES,
  ADD_ON_CATEGORIES,
  getEarlyBirdStatus,
  calcSetupPrice,
} from "@/lib/websitePackages";

const ICON_MAP: Record<string, React.ElementType> = {
  Paintbrush: Palette,
  TrendingUp: TrendingUp,
  Puzzle: Puzzle,
  LifeBuoy: LifeBuoy,
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Book a discovery call",
    description: "A free 20-minute conversation to understand your practice, goals, and what kind of site will work best for you.",
  },
  {
    step: "02",
    title: "Proposal & agreement",
    description: "We'll send a clear scope of work outlining deliverables, timeline, revision rounds, and payment terms. No surprises.",
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
    a: "Starter sites typically take 1–2 weeks. Growth takes 2–3 weeks. Pro takes 3–4 weeks. Timelines depend on how quickly you can provide content (photos, copy) and approve drafts.",
  },
  {
    q: "Do I own the website?",
    a: "Yes — you own your domain and all content. The monthly fee covers hosting and ongoing maintenance. If you ever want to move to another host, we'll help you migrate.",
  },
  {
    q: "What if I already have a domain?",
    a: "No problem. We'll connect your existing domain to your new site. If you don't have one yet, we'll help you choose and register one.",
  },
  {
    q: "Who writes the content?",
    a: "You can provide your own copy and photos, or add copywriting from our add-ons ($100–$200/page). We recommend at least a professional headshot — it makes a significant difference.",
  },
  {
    q: "How many revisions are included?",
    a: "All packages include 2 rounds of revisions before launch. Additional revisions can be added as an ongoing support add-on.",
  },
  {
    q: "Can I pay in Bitcoin?",
    a: "Yes. Paying in Bitcoin earns you an extra 10% off the setup fee. We'll provide a wallet address after you sign the agreement.",
  },
];

export default function WebsitePackages() {
  usePageMeta(
    "Website Packages",
    "Custom websites built for Hawaii wellness providers. Starter, Growth, and Pro packages starting at $499 setup.",
  );

  const [bitcoinEnabled, setBitcoinEnabled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { user } = useAuth();
  const { data: practitioner } = useMyPractitioner();

  const earlyBird = getEarlyBirdStatus(practitioner?.created_at ?? null);
  const showEarlyBird = !!user && earlyBird.eligible;

  const DISCOVERY_MAILTO =
    "mailto:aloha@hawaiiwellness.net?subject=Website%20Discovery%20Call&body=Hi%2C%20I%27m%20interested%20in%20learning%20more%20about%20your%20website%20packages%20for%20my%20wellness%20practice.";

  return (
    <main className="min-h-screen">

      {/* ── Early-bird banner ────────────────────────────────────────────────── */}
      {showEarlyBird && (
        <div className="bg-amber-50 border-b border-amber-200 py-3">
          <div className="container flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-amber-800">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="font-semibold">Early bird offer:</span>
            <span>
              10% off your setup fee — expires in{" "}
              <strong>{earlyBird.daysRemaining}d {earlyBird.hoursRemaining % 24}h</strong>
            </span>
            <span className="text-amber-500 hidden sm:inline">·</span>
            <span className="text-amber-700">Combine with Bitcoin for 20% off</span>
          </div>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ocean-light/60 to-secondary/30 py-20">
        <div className="container max-w-3xl text-center">
          <Badge className="mb-5 bg-ocean/10 text-ocean border-ocean/20 text-xs tracking-wide uppercase px-3 py-1">
            Built for Hawaii Wellness Providers
          </Badge>
          <h1 className="mb-5 font-display text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            A website that works as hard as you do
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl leading-relaxed">
            Your directory listing helps people discover you. Your website helps them{" "}
            <em>trust</em> you, contact you, and book. These packages are built specifically
            for wellness practitioners in Hawaiʻi — so your site and your listing work together.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href={DISCOVERY_MAILTO}>
              <Button size="lg" className="gap-2">
                <Mail className="h-4 w-4" /> Book a free discovery call
              </Button>
            </a>
            <a href="#packages">
              <Button size="lg" variant="outline" className="gap-2">
                View packages <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-background py-16">
        <div className="container max-w-5xl">
          <h2 className="mb-2 font-display text-2xl font-bold text-center md:text-3xl">How it works</h2>
          <p className="mb-10 text-center text-muted-foreground">From first call to live site — here's what to expect.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col gap-3">
                <span className="font-display text-4xl font-bold text-primary/20 leading-none">{item.step}</span>
                <h3 className="font-semibold text-base leading-snug">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Packages ─────────────────────────────────────────────────────────── */}
      <section id="packages" className="py-16 bg-secondary/10">
        <div className="container max-w-5xl">
          <h2 className="mb-2 font-display text-2xl font-bold text-center md:text-3xl">Website Packages</h2>
          <p className="mb-8 text-center text-muted-foreground">
            One-time setup · Monthly hosting &amp; maintenance · No contracts required
          </p>

          {/* Bitcoin toggle */}
          <div className="mb-8 flex items-center justify-center gap-3 rounded-xl border border-border bg-background px-5 py-3 mx-auto w-fit">
            <span className={`text-sm ${!bitcoinEnabled ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Pay by card</span>
            <Switch
              checked={bitcoinEnabled}
              onCheckedChange={setBitcoinEnabled}
              aria-label="Toggle Bitcoin payment discount"
            />
            <span className={`text-sm flex items-center gap-1.5 ${bitcoinEnabled ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
              Pay with Bitcoin
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">
                −10% setup
              </Badge>
            </span>
          </div>

          {/* Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {PACKAGES.map((pkg) => {
              const { final, savings } = calcSetupPrice(pkg.setupFee, showEarlyBird, bitcoinEnabled);
              const hasDiscount = savings > 0;
              const BonusIcon = pkg.bonusTier === 'featured' ? Crown : Star;

              return (
                <Card
                  key={pkg.id}
                  className={`relative flex flex-col overflow-hidden transition-shadow hover:shadow-lg ${
                    pkg.highlight ? 'ring-2 ring-primary shadow-md' : ''
                  }`}
                >
                  {pkg.highlight && (
                    <div className="bg-primary px-4 py-1.5 text-center text-xs font-semibold text-primary-foreground">
                      Most Popular
                    </div>
                  )}

                  <CardContent className="flex flex-1 flex-col gap-5 p-6">
                    {/* Header */}
                    <div>
                      <h3 className="font-display text-xl font-bold">{pkg.name}</h3>
                      <div className="mt-2 flex flex-wrap items-baseline gap-2">
                        {hasDiscount ? (
                          <>
                            <span className="text-3xl font-bold text-foreground">${final.toLocaleString()}</span>
                            <span className="text-base text-muted-foreground line-through">${pkg.setupFee.toLocaleString()}</span>
                          </>
                        ) : (
                          <span className="text-3xl font-bold text-foreground">${pkg.setupFee.toLocaleString()}</span>
                        )}
                        <span className="text-sm text-muted-foreground">setup</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm text-muted-foreground">${pkg.monthlyFee}/mo hosting</span>
                        {hasDiscount && (
                          <Badge className="bg-sage/20 text-sage-dark border-0 text-xs">
                            Save ${savings}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="flex-1 space-y-2">
                      {pkg.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-sage" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Bonus */}
                    <div className={`rounded-lg px-3 py-2.5 flex items-start gap-2 ${
                      pkg.bonusTier === 'featured'
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-ocean-light/40 border border-ocean/20'
                    }`}>
                      <BonusIcon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${pkg.bonusTier === 'featured' ? 'text-amber-600' : 'text-ocean'}`} />
                      <div>
                        <p className={`text-xs font-semibold ${pkg.bonusTier === 'featured' ? 'text-amber-800' : 'text-ocean'}`}>
                          Bonus included
                        </p>
                        <p className={`text-xs ${pkg.bonusTier === 'featured' ? 'text-amber-700' : 'text-ocean/80'}`}>
                          {pkg.bonus}
                        </p>
                      </div>
                    </div>

                    {/* Best for */}
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      <span className="not-italic font-medium text-foreground">Best for: </span>
                      {pkg.bestFor}
                    </p>

                    {/* CTA */}
                    <a
                      href={`mailto:aloha@hawaiiwellness.net?subject=Website%20Package%3A%20${encodeURIComponent(pkg.name)}&body=Hi%2C%20I'm%20interested%20in%20the%20${encodeURIComponent(pkg.name)}%20website%20package.%20Please%20tell%20me%20more.`}
                      className="block"
                    >
                      <Button
                        className={`w-full gap-1 ${pkg.highlight ? '' : 'variant-outline'}`}
                        variant={pkg.highlight ? 'default' : 'outline'}
                      >
                        {pkg.cta} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Active discounts summary */}
          {(showEarlyBird || bitcoinEnabled) && (
            <div className="mt-6 rounded-xl border border-sage/30 bg-sage/5 px-5 py-3 text-center text-sm text-sage-dark">
              <strong>Discounts active: </strong>
              {showEarlyBird && <span>Early bird −10%</span>}
              {showEarlyBird && bitcoinEnabled && <span className="mx-1.5">+</span>}
              {bitcoinEnabled && <span>Bitcoin −10%</span>}
              <span className="text-muted-foreground ml-1.5">— applied to setup fee only.</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Add-ons ──────────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-background py-16">
        <div className="container max-w-5xl">
          <h2 className="mb-2 font-display text-2xl font-bold text-center md:text-3xl">Add-ons</h2>
          <p className="mb-10 text-center text-muted-foreground">
            Customize your package with exactly what your practice needs.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {ADD_ON_CATEGORIES.map((cat) => {
              const Icon = ICON_MAP[cat.icon] ?? Globe;
              return (
                <Card key={cat.title}>
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-lg bg-secondary p-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-sm">{cat.title}</h3>
                    </div>
                    <div className="space-y-2">
                      {cat.items.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-muted-foreground">{item.name}</span>
                          <span className="font-medium text-foreground whitespace-nowrap">{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why Hawaii Wellness ──────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-secondary/20 to-ocean-light/30 py-16">
        <div className="container max-w-4xl">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-ocean/10 text-ocean border-ocean/20 text-xs">
                Built for this ecosystem
              </Badge>
              <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl leading-snug">
                More than just a website
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                When you build your site through Hawaii Wellness, you're not just getting
                pages online. You're building a stronger presence inside a wellness-focused
                ecosystem designed to help local clients discover and connect with you.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Your website and your directory listing work together. Each package includes
                bonus listing visibility — so you show up more, look more credible, and give
                potential clients an easier path to reach you.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: Globe, title: "Your site, your brand", desc: "Custom-built — not a template. Reflects how you work and who you serve." },
                { icon: Zap, title: "Live in weeks, not months", desc: "Straightforward process with clear milestones. No scope creep." },
                { icon: Star, title: "Integrated directory bonus", desc: "Every package includes Premium or Featured listing time — built right in." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-white/70 p-2 shadow-sm flex-shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-background py-16">
        <div className="container max-w-2xl">
          <h2 className="mb-2 font-display text-2xl font-bold text-center md:text-3xl">Common questions</h2>
          <p className="mb-8 text-center text-muted-foreground">Everything you need to know before getting started.</p>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left rounded-xl border border-border bg-background px-5 py-4 transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-expanded={openFaq === i}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold leading-snug">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                    : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                  }
                </div>
                {openFaq === i && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed pr-4">
                    {item.a}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Discovery call CTA ───────────────────────────────────────────────── */}
      <section id="discovery-call" className="bg-gradient-to-br from-primary/5 to-ocean-light/30 border-t border-border py-20">
        <div className="container max-w-xl text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">Ready to build your website?</h2>
          <p className="mb-6 text-muted-foreground leading-relaxed">
            Book a free 20-minute discovery call. We'll talk through your practice, your goals,
            and which package makes the most sense. No pressure — just a conversation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={DISCOVERY_MAILTO}>
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <Mail className="h-4 w-4" /> Book a discovery call
              </Button>
            </a>
            <a href="#packages">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                Review packages <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Or email us directly at{" "}
            <a
              href="mailto:aloha@hawaiiwellness.net"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              aloha@hawaiiwellness.net
            </a>
          </p>
          {!user && (
            <p className="mt-3 text-xs text-muted-foreground">
              Already listed?{" "}
              <Link to="/auth" className="text-primary underline underline-offset-2 hover:no-underline">
                Sign in
              </Link>{" "}
              to check if you qualify for an early-bird discount.
            </p>
          )}
        </div>
      </section>

    </main>
  );
}
