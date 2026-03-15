import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { usePractitioner } from "@/hooks/usePractitioner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  CheckCircle, MapPin, Phone, Mail, Globe, ExternalLink, ArrowLeft,
  Store, Instagram, Facebook, Linkedin, Link2, Check, Clock,
  CalendarClock,
} from "lucide-react";
import { FlagListingButton } from "@/components/FlagListingButton";
import { RequestInfoModal } from "@/components/RequestInfoModal";
import { BookingEmbed } from "@/components/BookingEmbed";
import { usePageMeta } from "@/hooks/usePageMeta";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/siteConfig";

// ── Modality chip colour (matches ProviderCard logic) ────────────────────────
const M_SAGE = new Set(["Massage","Craniosacral","Reiki","Energy Healing","Lomilomi / Hawaiian Healing","Hawaiian Healing","Watsu / Water Therapy","Physical Therapy","Osteopathic","Chiropractic","Network Chiropractic","Acupuncture","TCM (Traditional Chinese Medicine)","Ayurveda","Naturopathic","Functional Medicine","Herbalism","IV Therapy","Longevity","Dentistry","Nervous System Regulation"]);
const M_OCEAN = new Set(["Yoga","Breathwork","Meditation","Nature Therapy","Sound Healing","Art Therapy"]);
const M_TERRA = new Set(["Psychotherapy","Counseling","Life Coaching","Hypnotherapy","Family Constellation","Soul Guidance","Astrology","Psychic","Ritualist","Birth Doula","Midwife","Women's Health","Trauma-Informed Care","Somatic Therapy"]);

function modalityChipClass(m: string): string {
  if (M_SAGE.has(m))  return "bg-sage-light text-sage border border-sage/30";
  if (M_OCEAN.has(m)) return "bg-ocean-light text-ocean border border-ocean/30";
  if (M_TERRA.has(m)) return "bg-terracotta-light text-terracotta border border-terracotta/30";
  return "bg-secondary text-secondary-foreground border border-border";
}

// ── Island display config ─────────────────────────────────────────────────────
const ISLAND_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; gradient: string }> = {
  big_island: { label: "Big Island of Hawaiʻi", icon: "🌋", color: "#7c3aed", bg: "#f5f3ff", gradient: "linear-gradient(135deg, hsl(260,25%,96%), hsl(200,20%,96%))" },
  maui:       { label: "Maui",                  icon: "🌿", color: "#065f46", bg: "#ecfdf5", gradient: "linear-gradient(135deg, hsl(143,25%,95%), hsl(160,20%,96%))" },
  oahu:       { label: "Oʻahu",                 icon: "🏙️",  color: "#1e40af", bg: "#eff6ff", gradient: "linear-gradient(135deg, hsl(215,30%,96%), hsl(200,25%,96%))" },
  kauai:      { label: "Kauaʻi",               icon: "🌺",  color: "#92400e", bg: "#fef3c7", gradient: "linear-gradient(135deg, hsl(35,30%,96%), hsl(25,25%,96%))" },
};

function islandHeaderGradient(island: string | null): string {
  return ISLAND_CONFIG[island ?? '']?.gradient ?? "linear-gradient(135deg, hsl(143,15%,96%), hsl(200,15%,96%))";
}

function IslandBadge({ island }: { island: string }) {
  const cfg = ISLAND_CONFIG[island] ?? ISLAND_CONFIG.big_island;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Share button ──────────────────────────────────────────────────────────────
function ShareProfileButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xUrl = `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out ${name} on Hawaiʻi Wellness`)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Share:</span>
      <a href={fbUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1877F2] text-white hover:bg-[#1877F2]/90 transition-colors">
        <Facebook className="h-4 w-4" />
      </a>
      <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on X"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-black/80 transition-colors">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </a>
      <button onClick={handleCopy} aria-label="Copy link"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70 transition-colors">
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Working hours ─────────────────────────────────────────────────────────────
const DAY_LABELS: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

function WorkingHours({ hours }: { hours: Record<string, { open: string; close: string } | null> }) {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        Hours
      </h2>
      <ul className="grid gap-0 text-sm">
        {days.map((day) => {
          const slot = hours[day];
          return (
            <li key={day} className="flex justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
              <span className="font-medium w-24">{DAY_LABELS[day]}</span>
              {slot ? (
                <span className="text-muted-foreground">{slot.open} – {slot.close}</span>
              ) : (
                <span className="text-muted-foreground/50 italic">Closed</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const ProfileDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: p, isLoading } = usePractitioner(id);

  const metaDesc = p
    ? p.about
      ? p.about.slice(0, 155)
      : `${p.name} — ${p.services.slice(0, 3).join(', ')} practitioner in Hawaiʻi. View profile, services, and contact info.`
    : "View practitioner profile and services on Hawaiʻi Wellness.";
  usePageMeta(p ? p.name : "Practitioner Profile", metaDesc);

  if (isLoading) {
    return (
      <main>
        <section className="relative">
          <Skeleton className="h-48 w-full md:h-64" />
          <div className="container">
            <div className="flex flex-col gap-4 pb-6 pt-4 md:flex-row md:gap-6">
              <Skeleton className="-mt-16 h-32 w-32 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
        </section>
        <section className="container grid gap-8 py-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </section>
      </main>
    );
  }

  if (!p) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Profile not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/directory">Back to Directory</Link>
        </Button>
      </div>
    );
  }

  const isClaimed = !!p.ownerId;

  // ── Structured data ──────────────────────────────────────────────────────
  const profileUrl = `${SITE_URL}/profile/${p.id}`;

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: p.name,
    description: p.about ?? undefined,
    url: p.website ?? profileUrl,
    image: p.profileImage,
    telephone: p.phone ?? undefined,
    email: p.email ?? undefined,
    address: p.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: p.address,
          addressRegion: 'HI',
          addressCountry: 'US',
        }
      : undefined,
    geo:
      p.lat && p.lng
        ? { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng }
        : undefined,
    ...(p.services.length > 0 && { hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: p.services.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s } })),
    }}),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: `${SITE_URL}/directory` },
      { '@type': 'ListItem', position: 3, name: p.name, item: profileUrl },
    ],
  };

  // ── Review schema — only when testimonials exist ─────────────────────────
  const reviewSchema = p.testimonials.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: p.name,
    url: p.website ?? profileUrl,
    review: p.testimonials.map(t => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: t.author },
      reviewBody: t.text,
      ...(t.date ? { datePublished: t.date } : {}),
      reviewRating: {
        '@type': 'Rating',
        ratingValue: 5,
        bestRating: 5,
      },
    })),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      reviewCount: String(p.testimonials.length),
    },
  } : null;

  // ── Last updated label ────────────────────────────────────────────────────
  const lastUpdatedLabel = (() => {
    if (!p.updatedAt) return null;
    try {
      return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(p.updatedAt));
    } catch { return null; }
  })();

  // ── Working hours (present if usePractitioner exposes it) ────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workingHours = (p as any).workingHours as Record<string, { open: string; close: string } | null> | undefined;
  const hasHours = workingHours && Object.values(workingHours).some(Boolean);

  return (
    <main>
      <JsonLd id="profile-localbusiness" data={localBusinessSchema} />
      <JsonLd id="profile-breadcrumb" data={breadcrumbSchema} />
      {reviewSchema && <JsonLd id="profile-reviews" data={reviewSchema} />}

      {/* Breadcrumb nav */}
      <div className="container pt-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/directory">Directory</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[240px] truncate">{p.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Profile Header — island-tinted gradient, no stock cover image */}
      <section className="mt-4">
        <div className="container">
          <div
            className="rounded-xl overflow-hidden border border-border"
            style={{ background: islandHeaderGradient(p.island) }}
          >
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5">
              {/* Avatar — larger, circular, face-first */}
              {p.profileImage ? (
                <img
                  src={p.profileImage}
                  alt={p.name}
                  className="h-24 w-24 flex-shrink-0 rounded-full border-4 border-background object-cover shadow-lg sm:h-28 sm:w-28"
                />
              ) : (
                <div className="h-24 w-24 flex-shrink-0 rounded-full border-4 border-background bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-2xl font-semibold text-white shadow-lg sm:h-28 sm:w-28">
                  {p.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
              )}

              {/* Name + business + location + badges */}
              <div className="flex-1 min-w-0">
                {/* Personal name is always the primary identity */}
                <h1 className="font-display text-2xl font-bold leading-tight md:text-3xl">{p.name}</h1>
                {/* Business name always muted subtitle — never primary */}
                {p.businessName && (
                  <p className="mt-0.5 text-sm font-medium text-muted-foreground">{p.businessName}</p>
                )}

                {/* Island + location row */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {p.island && <IslandBadge island={p.island} />}
                  {p.location && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {p.location.split(',')[0]}
                    </span>
                  )}
                </div>

                {/* Status + top modalities */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {p.verified && (
                    <Badge className="gap-1 bg-sage text-white">
                      <CheckCircle className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                  {p.acceptingClients && (
                    <Badge className="gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Accepting New Clients
                    </Badge>
                  )}
                  {p.services.slice(0, 2).map((s) => (
                    <span key={s} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${modalityChipClass(s)}`}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Share + last-updated footer strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 bg-background/40 px-5 py-2.5">
              <ShareProfileButton name={p.name} />
              {lastUpdatedLabel && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {isClaimed ? 'Managed by practitioner' : 'Profile updated'} · {lastUpdatedLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container grid gap-8 py-8 lg:grid-cols-3">
        {/* Left - Main Content */}
        <div className="space-y-8 lg:col-span-2">
          {p.about && (
            <div>
              <h2 className="mb-3 font-display text-xl font-bold">About</h2>
              <p className="leading-relaxed text-muted-foreground">{p.about}</p>
            </div>
          )}

          {p.services.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-xl font-bold">Services &amp; Modalities</h2>
              <div className="flex flex-wrap gap-2">
                {p.services.map((service) => (
                  <span
                    key={service}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border ${modalityChipClass(service)}`}
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {p.whatToExpect && (
            <div>
              <h2 className="mb-3 font-display text-xl font-bold">What to Expect</h2>
              <p className="leading-relaxed text-muted-foreground">{p.whatToExpect}</p>
            </div>
          )}

          {/* Working Hours */}
          {hasHours && workingHours && (
            <WorkingHours hours={workingHours} />
          )}

          {p.gallery.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-xl font-bold">Gallery</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {p.gallery.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Gallery ${i + 1}`}
                    className="aspect-[4/3] rounded-lg object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Testimonials */}
          {p.testimonials.length > 0 && (
            <div>
              <h2 className="mb-4 font-display text-xl font-bold">What Clients Say</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {p.testimonials.map((t, i) => (
                  <Card key={i} className="border border-border bg-card shadow-sm">
                    <CardContent className="p-4">
                      {/* Star rating — these are curated testimonials, always 5-star */}
                      <div className="mb-2 text-sm text-amber-400 leading-none" aria-label="5 star rating">
                        ★★★★★
                      </div>
                      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                        {t.text}
                      </p>
                      <div className="flex items-center justify-between border-t border-border/40 pt-2">
                        <span className="text-sm font-semibold">{t.author}</span>
                        {t.date && (
                          <span className="text-xs text-muted-foreground">{t.date}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Booking calendar embed — premium/featured only */}
          {p.externalBookingUrl && (p.tier === 'premium' || p.tier === 'featured') && (
            <BookingEmbed
              bookingUrl={p.externalBookingUrl}
              practitionerName={p.name}
              tier={p.tier}
            />
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* Primary CTA — top of sidebar (desktop) */}
          {p.externalBookingUrl ? (
            <Button className="w-full gap-2" size="lg" asChild>
              <a href={p.externalBookingUrl} target="_blank" rel="noopener noreferrer">
                {p.bookingLabel || 'Book Appointment'}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <RequestInfoModal
              practitionerName={p.name}
              practitionerEmail={p.email}
              practitionerWebsite={p.website}
              fullWidth
            />
          )}

          <Card>
            <CardContent className="p-0">
              {/* Map — OSM iframe when lat/lng available, styled fallback otherwise */}
              {p.lat && p.lng ? (
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${p.lng - 0.015},${p.lat - 0.01},${p.lng + 0.015},${p.lat + 0.01}&layer=mapnik&marker=${p.lat},${p.lng}`}
                  width="100%"
                  height="160"
                  className="w-full block rounded-t-lg border-0"
                  title={`Map showing location of ${p.name}`}
                  loading="lazy"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-t-lg bg-ocean-light">
                  <div className="text-center">
                    <MapPin className="mx-auto h-7 w-7 text-ocean mb-1" />
                    <span className="text-xs font-medium text-ocean">{p.location || 'Hawaiʻi'}</span>
                  </div>
                </div>
              )}
              <div className="space-y-3 p-4">
                {p.address && <p className="text-sm font-medium">{p.address}</p>}
                <div className="space-y-2 text-sm">
                  {p.phone && (
                    <a href={`tel:${p.phone}`} className="flex items-center gap-2 font-medium text-primary hover:text-primary/80 transition-colors">
                      <Phone className="h-4 w-4 flex-shrink-0" /> {p.phone}
                    </a>
                  )}
                  {p.email && (
                    <a href={`mailto:${p.email}`} className="flex items-center gap-2 font-medium text-primary hover:text-primary/80 transition-colors min-w-0">
                      <Mail className="h-4 w-4 flex-shrink-0" /> <span className="truncate">{p.email}</span>
                    </a>
                  )}
                  {p.website && (
                    <a href={p.website} className="flex items-center gap-2 font-medium text-primary hover:text-primary/80 transition-colors min-w-0" target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    </a>
                  )}
                </div>

                {/* Social links */}
                {p.socialLinks && Object.values(p.socialLinks).some(Boolean) && (
                  <div className="flex flex-wrap gap-3 pt-1 border-t border-border/50">
                    {p.socialLinks.instagram && (
                      <a href={p.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <Instagram className="h-4 w-4" /> Instagram
                      </a>
                    )}
                    {p.socialLinks.facebook && (
                      <a href={p.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <Facebook className="h-4 w-4" /> Facebook
                      </a>
                    )}
                    {p.socialLinks.linkedin && (
                      <a href={p.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <Linkedin className="h-4 w-4" /> LinkedIn
                      </a>
                    )}
                    {p.socialLinks.x && (
                      <a href={p.socialLinks.x} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        X / Twitter
                      </a>
                    )}
                    {p.socialLinks.substack && (
                      <a href={p.socialLinks.substack} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 17.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
                        </svg>
                        Substack
                      </a>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Claim this listing */}
          {!isClaimed && (
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-4 text-center">
                <Store className="mx-auto mb-2 h-5 w-5 text-primary" />
                <p className="mb-1 text-sm font-medium">Is this your practice?</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Claim this listing to manage your profile, add photos, and respond to clients.
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link to={`/auth?claim=${id}`}>
                    Claim this listing →
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Report inaccurate / expired listing */}
          <div className="flex justify-center pt-1">
            <FlagListingButton
              listingType="practitioner"
              listingId={p.id}
              listingName={p.name}
            />
          </div>
        </div>
      </section>

      {/* Bottom nav */}
      <div className="container pb-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/directory">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Directory
          </Link>
        </Button>
      </div>

      {/* Mobile sticky CTA — always visible on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-3 backdrop-blur-sm lg:hidden">
        {p.externalBookingUrl ? (
          <Button className="w-full gap-2" size="lg" asChild>
            <a href={p.externalBookingUrl} target="_blank" rel="noopener noreferrer">
              {p.bookingLabel || 'Book Appointment'}
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <RequestInfoModal
            practitionerName={p.name}
            practitionerEmail={p.email}
            practitionerWebsite={p.website}
            fullWidth
          />
        )}
      </div>
    </main>
  );
};

export default ProfileDetail;
