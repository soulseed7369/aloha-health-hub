import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { usePractitioner } from "@/hooks/usePractitioner";
import { useSimilarPractitioners } from "@/hooks/usePractitioners";
import { usePractitionerOfferings } from "@/hooks/usePractitionerOfferings";
import { usePractitionerClasses } from "@/hooks/usePractitionerClasses";
import { usePractitionerTestimonials } from "@/hooks/usePractitionerTestimonials";
import { useVerifiedTestimonials } from "@/hooks/useVerifiedTestimonials";
import { useArticlesByModality } from "@/hooks/useArticlesByModality";
import { useTrackView, useTrackClick } from "@/hooks/useTrackEvent";
import { ProviderCard } from "@/components/ProviderCard";
import { ArticleCard } from "@/components/ArticleCard";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
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
  CalendarClock, Lock, Flag, Building2, ArrowRight,
} from "lucide-react";
import { FlagListingButton } from "@/components/FlagListingButton";
import { RequestInfoModal } from "@/components/RequestInfoModal";
import { BookingEmbed } from "@/components/BookingEmbed";
import { ContactReveal } from "@/components/ContactReveal";
import { ShareButtons } from "@/components/ShareButtons";
import { usePageMeta } from "@/hooks/usePageMeta";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/siteConfig";
import { generateProfileBreadcrumb, breadcrumbSchema } from "@/hooks/useProfileBreadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSubmitFlag } from "@/hooks/useListingFlags";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { modalityBadgeClass as modalityChipClass, ISLAND_CFG, islandHeaderGradient } from "@/lib/cardUtils";


function IslandBadge({ island }: { island: string }) {
  const cfg = ISLAND_CFG[island] ?? ISLAND_CFG.big_island;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
    >
      {cfg.icon} {cfg.fullLabel}
    </span>
  );
}

// ShareProfileButton removed — replaced by shared ShareButtons component

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

// ── Type for active tab ───────────────────────────────────────────────────
type TabType = 'about' | 'classes' | 'offerings' | 'testimonials';

// ── Helper: format time HH:mm:ss → "HH:mm AM/PM" ────────────────────────
function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return timeStr;
  }
}

// ── Helper: format price ───────────────────────────────────────────────────
function formatPrice(mode: string | undefined, fixed: number | null, min: number | null, max: number | null): string {
  if (!mode) return '';
  if (mode === 'free') return 'Free';
  if (mode === 'contact') return 'Contact for pricing';
  if (mode === 'fixed' && fixed !== null) return `$${fixed}`;
  if ((mode === 'range' || mode === 'sliding') && min !== null && max !== null) return `$${min}–$${max}`;
  return '';
}

// ── Helper: format date ISO → "Month Year" ─────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ── Helper: day of week to label ───────────────────────────────────────────
const DAY_LABELS_SHORT: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function dayToLabel(day: string | null): string {
  if (!day) return '';
  const label = DAY_LABELS_SHORT[day];
  return label ? `Every ${label}` : '';
}

// ── Offering type badge color ──────────────────────────────────────────────
function offeringTypeColor(type: string | undefined): string {
  switch (type) {
    case 'retreat':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'workshop':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'mentorship':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'ceremony':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'immersion':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'event':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    default:
      return 'bg-secondary text-secondary-foreground border-border';
  }
}

const ProfileDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: p, isLoading } = usePractitioner(id);
  const { data: similarProviders } = useSimilarPractitioners(p?.island, p?.modalities ?? [], p?.id);
  const { data: classes } = usePractitionerClasses(p?.id ?? null);
  const { data: offerings } = usePractitionerOfferings(p?.id ?? null);
  const { data: newTestimonials } = usePractitionerTestimonials(p?.id ?? null);
  const { data: verifiedTestimonials } = useVerifiedTestimonials(p?.id ?? null);
  const { data: relatedArticles = [] } = useArticlesByModality(
    p?.services ?? [],
    !!p,
  );

  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [expandedTestimonials, setExpandedTestimonials] = useState<Set<string>>(new Set());

  useTrackView(id, 'practitioner');
  const trackClick = useTrackClick(id, 'practitioner');

  const submitFlag = useSubmitFlag();
  const { toast } = useToast();

  const handleSubmitReport = async () => {
    if (!reportReason) {
      toast({ title: "Please select a reason", variant: "destructive" });
      return;
    }
    try {
      await submitFlag.mutateAsync({
        listing_type: 'practitioner',
        listing_id: id || '',
        listing_name: p?.name || 'Unknown',
        reason: reportReason as any,
        details: reportDetails || undefined,
      });
      toast({ title: "Report submitted", description: "Thank you for helping keep our directory accurate." });
      setReportOpen(false);
      setReportReason('');
      setReportDetails('');
    } catch (error) {
      toast({ title: "Error submitting report", variant: "destructive" });
    }
  };

  const metaDesc = p
    ? p.about
      ? p.about.slice(0, 155)
      : `${p.name} — ${p.services.slice(0, 3).join(', ')} practitioner in Hawaiʻi. View profile, services, and contact info.`
    : "View practitioner profile and services on Hawaiʻi Wellness.";
  usePageMeta(p ? p.name : "Practitioner Profile", metaDesc, p?.profileImage ?? null, 'profile');

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
  const isTiered = p.tier === 'premium' || p.tier === 'featured';

  // ── Tab visibility ───────────────────────────────────────────────────────
  const showClassesTab = isTiered && (classes?.length ?? 0) > 0;
  const showOfferingsTab = isTiered && (offerings?.length ?? 0) > 0;
  // Hide testimonials tab when no verified, practitioner, or legacy testimonials exist.
  // verifiedTestimonials, newTestimonials are undefined while loading; fall back to p.testimonials to avoid flickering the tab away on load.
  const showTestimonialsTab = isTiered && (verifiedTestimonials != null || newTestimonials != null
    ? (verifiedTestimonials?.length ?? 0) > 0 || (newTestimonials?.length ?? 0) > 0 || p.testimonials.length > 0
    : p.testimonials.length > 0);

  // ── Structured data ──────────────────────────────────────────────────────
  const profileUrl = `${SITE_URL}/profile/${p.id}`;

  // ── Breadcrumb navigation and schema ──────────────────────────────────────
  const breadcrumbItems = generateProfileBreadcrumb({
    id: p.id,
    name: p.name,
    island: p.island,
    modalities: p.modalities,
  });
  const bcSchema = breadcrumbSchema(breadcrumbItems, SITE_URL);

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: p.name,
    description: p.about ?? undefined,
    url: p.website ?? profileUrl,
    image: p.profileImage,
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

  // ── FAQ schema — only for featured tier with "whatToExpect" content ─────
  const faqSchema = p.tier === 'featured' && p.whatToExpect ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{
      '@type': 'Question',
      name: `What to expect from a session with ${p.name}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: p.whatToExpect,
      },
    }],
  } : null;

  // ── Enhanced service catalog schema — only for featured tier ──────────
  const serviceCatalogSchema = p.tier === 'featured' && p.services.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: p.name,
    url: profileUrl,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Wellness Services',
      itemListElement: p.services.map((s, i) => ({
        '@type': 'OfferCatalog',
        position: i + 1,
        itemOffered: {
          '@type': 'Service',
          name: s,
          provider: { '@type': 'Person', name: p.name },
          areaServed: { '@type': 'State', name: 'Hawaii' },
        },
      })),
    },
  } : null;

  // ── Event schema for upcoming offerings ──────────────────────────────────
  const upcomingOfferings = (offerings ?? []).filter(o => o.start_date);
  const eventSchemas = upcomingOfferings.map(o => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: o.title,
    description: o.description ?? undefined,
    startDate: o.start_date,
    endDate: o.end_date ?? undefined,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: o.location ? {
      '@type': 'Place',
      name: o.location,
      address: { '@type': 'PostalAddress', addressRegion: 'HI', addressCountry: 'US' },
    } : {
      '@type': 'Place',
      name: p.location ?? 'Hawaiʻi',
      address: { '@type': 'PostalAddress', addressRegion: 'HI', addressCountry: 'US' },
    },
    organizer: { '@type': 'Person', name: p.name, url: profileUrl },
    url: o.registration_url ?? profileUrl,
    ...(o.price_fixed != null ? {
      offers: {
        '@type': 'Offer',
        price: String(o.price_fixed),
        priceCurrency: 'USD',
        url: o.registration_url ?? profileUrl,
      },
    } : {}),
  }));

  return (
    <main>
      <JsonLd id="profile-localbusiness" data={localBusinessSchema} />
      <JsonLd id="profile-breadcrumb" data={bcSchema} />
      {reviewSchema && <JsonLd id="profile-reviews" data={reviewSchema} />}
      {faqSchema && <JsonLd id="profile-faq" data={faqSchema} />}
      {serviceCatalogSchema && <JsonLd id="profile-services" data={serviceCatalogSchema} />}
      {eventSchemas.map((schema, i) => (
        <JsonLd key={`event-${i}`} id={`profile-event-${i}`} data={schema} />
      ))}

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
                <OptimizedImage
                  src={p.profileImage}
                  alt={p.name}
                  width={112}
                  height={112}
                  className="h-24 w-24 flex-shrink-0 rounded-full border-4 border-background object-cover shadow-lg sm:h-28 sm:w-28"
                  loading="eager"
                  fetchPriority="high"
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
                  {p.verified && p.tier === 'featured' && (
                    <VerifiedBadge />
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
              {isTiered ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Share:</span>
                  <ShareButtons title={`Check out ${p.name} on Hawaiʻi Wellness`} compact />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Free listing</span>
              )}
              <div className="flex items-center gap-3">
                {p.createdAt && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Member since {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
                {lastUpdatedLabel && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {isClaimed ? 'Managed by practitioner' : 'Profile updated'} · {lastUpdatedLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Bar */}
      <section className="border-b border-border bg-background sticky top-16 z-30">
        <div className="container overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {/* About tab */}
            <button
              onClick={() => setActiveTab('about')}
              className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'about'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              About
              {activeTab === 'about' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />
              )}
            </button>

            {/* Classes tab */}
            {showClassesTab && (
              <button
                onClick={() => setActiveTab('classes')}
                className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'classes'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Classes
                {activeTab === 'classes' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />
                )}
              </button>
            )}

            {/* Offerings tab */}
            {showOfferingsTab && (
              <button
                onClick={() => setActiveTab('offerings')}
                className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'offerings'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Offerings
                {activeTab === 'offerings' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />
                )}
              </button>
            )}

            {/* Testimonials tab — hidden when no testimonials exist */}
            {showTestimonialsTab && (
              <button
                onClick={() => setActiveTab('testimonials')}
                className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'testimonials'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Testimonials
                {activeTab === 'testimonials' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />
                )}
              </button>
            )}

          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container grid gap-8 py-8 lg:grid-cols-3">
        {/* Left - Main Content */}
        <div className="space-y-8 lg:col-span-2">
          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <>
              {p.about && (
                <div>
                  <h2 className="mb-3 font-display text-xl font-bold">About</h2>
                  <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                    {isTiered ? p.about : p.about.slice(0, 250)}
                    {!isTiered && p.about.length > 250 && '…'}
                  </p>
                </div>
              )}

              {/* Verified testimonials teaser — Featured tier only */}
              {p.tier === 'featured' && verifiedTestimonials && verifiedTestimonials.length > 0 && (
                <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4">
                  <h3 className="mb-3 font-semibold text-sm text-amber-900">Client Testimonials</h3>
                  <div className="space-y-3 mb-3">
                    {verifiedTestimonials.slice(0, 2).map((t) => (
                      <div key={t.id} className="text-sm">
                        <p className="italic text-amber-900 leading-relaxed mb-1">
                          "{t.highlight || t.full_text?.slice(0, 100)}"
                        </p>
                        <div className="text-xs text-amber-800">
                          {t.client_display_name && (
                            <>
                              <span className="font-medium">{t.client_display_name}</span>
                              {t.client_island && <span> · {ISLAND_CFG[t.client_island]?.label ?? t.client_island}</span>}
                              <span className="inline-flex items-center gap-1 ml-2">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                Verified client
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('testimonials')}
                    className="text-xs text-amber-700 hover:text-amber-800 font-medium"
                  >
                    Read all {verifiedTestimonials.length} client testimonials →
                  </button>
                </div>
              )}

              {/* CTA Block for tiered listings */}
              {isTiered && (
                <div className="border border-teal-200 bg-teal-50 rounded-lg p-5">
                  <h3 className="mb-3 font-semibold text-sm text-teal-900">Connect with {p.name}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {p.bookingLabel && p.externalBookingUrl && (
                      <Button
                        className="gap-2 bg-teal-600 text-white hover:bg-teal-700"
                        asChild
                      >
                        <a href={p.externalBookingUrl} onClick={() => trackClick('booking')} target="_blank" rel="noopener noreferrer">
                          {p.bookingLabel}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {p.discoveryCallUrl && (
                      <Button
                        variant="outline"
                        className="gap-2 bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                        asChild
                      >
                        <a href={p.discoveryCallUrl} onClick={() => trackClick('discovery_call')} target="_blank" rel="noopener noreferrer">
                          Discovery Call
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {!p.externalBookingUrl && p.email && (
                      <RequestInfoModal
                        practitionerName={p.name}
                        practitionerEmail={p.email}
                        practitionerWebsite={p.website}
                      />
                    )}
                  </div>

                  {/* Teasers for classes and offerings */}
                  {(showClassesTab || showOfferingsTab) && (
                    <div className="space-y-2 pt-3 border-t border-teal-200/50">
                      <p className="text-xs font-medium text-teal-900">Featured</p>
                      <div className="flex flex-wrap gap-2">
                        {showClassesTab && classes && classes.slice(0, 3).map((cls) => (
                          <button
                            key={cls.id}
                            onClick={() => setActiveTab('classes')}
                            className="inline-flex items-center gap-1 text-xs bg-white border border-teal-200 rounded px-2 py-1 text-teal-700 hover:bg-teal-50 transition-colors"
                          >
                            {cls.title}
                            <span className="text-teal-500">→</span>
                          </button>
                        ))}
                        {showOfferingsTab && offerings && offerings.slice(0, 2).map((off) => (
                          <button
                            key={off.id}
                            onClick={() => setActiveTab('offerings')}
                            className="inline-flex items-center gap-1 text-xs bg-white border border-teal-200 rounded px-2 py-1 text-teal-700 hover:bg-teal-50 transition-colors"
                          >
                            {off.title}
                            <span className="text-teal-500">→</span>
                          </button>
                        ))}
                        {showClassesTab && classes && classes.length > 3 && (
                          <button
                            onClick={() => setActiveTab('classes')}
                            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                          >
                            View all classes →
                          </button>
                        )}
                        {showOfferingsTab && offerings && offerings.length > 2 && (
                          <button
                            onClick={() => setActiveTab('offerings')}
                            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                          >
                            View all offerings →
                          </button>
                        )}
                      </div>
                    </div>
                  )}
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

              {isTiered && p.whatToExpect && (
                <div>
                  <h2 className="mb-3 font-display text-xl font-bold">What to Expect</h2>
                  <p className="leading-relaxed text-muted-foreground">{p.whatToExpect}</p>
                </div>
              )}

              {/* Working Hours */}
              {isTiered && hasHours && workingHours && (
                <WorkingHours hours={workingHours} />
              )}

              {isTiered && p.gallery.length > 0 && (
                <div>
                  <h2 className="mb-3 font-display text-xl font-bold">Gallery</h2>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {p.gallery.map((img, i) => (
                      <OptimizedImage
                        key={i}
                        src={img}
                        alt={`Gallery ${i + 1}`}
                        width={300}
                        height={225}
                        className="aspect-[4/3] rounded-lg object-cover"
                        loading="lazy"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
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

              {/* Claim this listing card — only show if no owner */}
              {!p.ownerId && (
                <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-200">
                          <Building2 className="h-6 w-6 text-teal-700" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-1 font-semibold text-teal-900">Is this your practice?</h3>
                        <p className="mb-4 text-sm text-teal-800">
                          Claim this listing to update your information, respond to reviews, and grow your practice.
                        </p>
                        <Button
                          className="bg-teal-600 text-white hover:bg-teal-700"
                          asChild
                        >
                          <Link to={`/claim/${p.id}`}>
                            Claim this listing
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Profile last updated timestamp */}
              {p.updatedAt && (
                <div className="text-xs text-gray-400">
                  Profile last updated: {formatDate(p.updatedAt)}
                </div>
              )}
            </>
          )}

          {/* CLASSES TAB */}
          {activeTab === 'classes' && (
            <div>
              <h2 className="mb-4 font-display text-xl font-bold">Classes & Sessions</h2>
              {classes && classes.length > 0 ? (
                <div className="space-y-4">
                  {classes.map((cls) => (
                    <Card key={cls.id} className="border border-border">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {cls.day_of_week && (
                                <Badge variant="outline" className="text-xs">
                                  {dayToLabel(cls.day_of_week)}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-sm mb-1">{cls.title}</h3>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                              {cls.start_time && (
                                <span>{formatTime(cls.start_time)}</span>
                              )}
                              {cls.duration_minutes && (
                                <span>·</span>
                              )}
                              {cls.duration_minutes && (
                                <span>{cls.duration_minutes} min</span>
                              )}
                              {cls.location && (
                                <span>·</span>
                              )}
                              {cls.location && (
                                <span>{cls.location}</span>
                              )}
                            </div>
                            {cls.price_mode && (
                              <p className="text-sm font-medium text-foreground">{formatPrice(cls.price_mode, cls.price_fixed, cls.price_min, cls.price_max)}</p>
                            )}
                            {cls.max_spots && cls.spots_booked / cls.max_spots >= 0.5 && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {cls.max_spots - cls.spots_booked} spots remaining
                              </div>
                            )}
                          </div>
                          {cls.registration_url && (
                            <Button size="sm" className="mt-2 sm:mt-0 gap-1" asChild>
                              <a href={cls.registration_url} target="_blank" rel="noopener noreferrer">
                                Register
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No classes scheduled — check back soon.</p>
              )}
            </div>
          )}

          {/* OFFERINGS TAB */}
          {activeTab === 'offerings' && (
            <div>
              <h2 className="mb-4 font-display text-xl font-bold">Offerings & Events</h2>
              {offerings && offerings.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {offerings.map((off) => {
                    const isSoldOut = off.max_spots && off.spots_booked >= off.max_spots;
                    const hasSpotsBadge = off.max_spots && off.spots_booked / off.max_spots >= 0.5;
                    return (
                      <Card key={off.id} className="border border-border overflow-hidden">
                        {off.image_url && (
                          <OptimizedImage
                            src={off.image_url}
                            alt={off.title}
                            width={600}
                            height={192}
                            className="w-full h-48 object-cover"
                            loading="lazy"
                            sizes="100vw"
                          />
                        )}
                        <CardContent className="p-4">
                          <div className="mb-2">
                            <Badge className={`text-xs ${offeringTypeColor(off.offering_type)}`}>
                              {off.offering_type}
                            </Badge>
                          </div>
                          <h3 className="font-semibold mb-1 line-clamp-2">{off.title}</h3>
                          {off.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{off.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                            {off.price_mode && (
                              <span className="font-medium text-foreground">{formatPrice(off.price_mode, off.price_fixed, off.price_min, off.price_max)}</span>
                            )}
                            {off.start_date ? (
                              <span>
                                {formatDate(off.start_date)}
                                {off.end_date && ` – ${formatDate(off.end_date)}`}
                              </span>
                            ) : (
                              <span>Ongoing — flexible start</span>
                            )}
                            {off.location && (
                              <span>·</span>
                            )}
                            {off.location && (
                              <span>{off.location}</span>
                            )}
                          </div>
                          {hasSpotsBadge && !isSoldOut && (
                            <div className="mb-3 text-xs text-muted-foreground">
                              {off.max_spots! - off.spots_booked} spots remaining
                            </div>
                          )}
                          {off.registration_url && (
                            <Button
                              size="sm"
                              variant={isSoldOut ? 'outline' : 'default'}
                              className="w-full gap-1"
                              asChild
                            >
                              <a href={off.registration_url} target="_blank" rel="noopener noreferrer">
                                {isSoldOut ? 'Join Waitlist' : 'Register'}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No offerings posted — check back soon.</p>
              )}
            </div>
          )}

          {/* TESTIMONIALS TAB */}
          {activeTab === 'testimonials' && (
            <div>
              <h2 className="mb-4 font-display text-xl font-bold">What Clients Say</h2>

              {/* Verified testimonials (if any) */}
              {verifiedTestimonials && verifiedTestimonials.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {verifiedTestimonials.map((t) => {
                    const isExpanded = expandedTestimonials.has(t.id);
                    return (
                      <Card key={t.id} className="border border-border bg-card shadow-sm">
                        <CardContent className="p-4">
                          {/* AI highlight in larger, italic text with amber left border */}
                          <div className="pl-3 border-l-3 border-amber-300 mb-3">
                            <p className="text-base italic text-foreground leading-relaxed">
                              "{t.highlight || t.full_text?.slice(0, 100)}"
                            </p>
                          </div>

                          {/* Read more / expanded text */}
                          {t.full_text && !isExpanded && (
                            <button
                              onClick={() => setExpandedTestimonials(new Set([...expandedTestimonials, t.id]))}
                              className="text-xs text-teal-600 hover:text-teal-700 font-medium mb-3"
                            >
                              Read more →
                            </button>
                          )}
                          {isExpanded && t.full_text && (
                            <>
                              <p className="text-sm leading-relaxed text-muted-foreground mb-3">
                                {t.full_text}
                              </p>
                              <button
                                onClick={() => {
                                  const newSet = new Set(expandedTestimonials);
                                  newSet.delete(t.id);
                                  setExpandedTestimonials(newSet);
                                }}
                                className="text-xs text-teal-600 hover:text-teal-700 font-medium mb-3"
                              >
                                Show less
                              </button>
                            </>
                          )}

                          {/* Client info & verified badge */}
                          <div className="border-t border-border/40 pt-3 mb-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="text-sm">
                                {t.client_display_name && (
                                  <p className="font-semibold text-foreground">{t.client_display_name}</p>
                                )}
                                {(t.client_island || t.submitted_at) && (
                                  <p className="text-xs text-muted-foreground">
                                    {t.client_island && <span>{ISLAND_CFG[t.client_island]?.label ?? t.client_island}</span>}
                                    {t.client_island && t.submitted_at && <span> · </span>}
                                    {t.submitted_at && <span>{formatDate(t.submitted_at)}</span>}
                                  </p>
                                )}
                              </div>
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                                <CheckCircle className="h-3 w-3" />
                                <span>Verified</span>
                              </div>
                            </div>
                          </div>

                          {/* Practitioner response (if present) */}
                          {t.practitioner_response && (
                            <div className="ml-3 pl-3 border-l border-teal-200 py-2 bg-teal-50 rounded p-2">
                              <p className="text-xs font-semibold text-teal-900 mb-1">
                                Response from {p.name}
                              </p>
                              <p className="text-xs text-teal-800 leading-relaxed">
                                {t.practitioner_response}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : null}

              {/* Legacy practitioner testimonials (if no verified ones) */}
              {(!verifiedTestimonials || verifiedTestimonials.length === 0) && newTestimonials && newTestimonials.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {newTestimonials.map((t) => (
                    <Card key={t.id} className="border border-border bg-card shadow-sm">
                      <CardContent className="p-4">
                        <div className="mb-3 text-lg text-amber-400">"</div>
                        <p className="mb-3 text-sm leading-relaxed text-muted-foreground italic">
                          {t.text}
                        </p>
                        <div className="border-t border-border/40 pt-2">
                          <p className="text-sm font-semibold">{t.author}</p>
                          {t.author_location && (
                            <p className="text-xs text-muted-foreground">{t.author_location}</p>
                          )}
                          {t.testimonial_date && (
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(t.testimonial_date)}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (!verifiedTestimonials || verifiedTestimonials.length === 0) && p.testimonials && p.testimonials.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {p.testimonials.map((t, i) => (
                    <Card key={i} className="border border-border bg-card shadow-sm">
                      <CardContent className="p-4">
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
              ) : (
                <p className="text-muted-foreground text-center py-8">No testimonials yet.</p>
              )}
            </div>
          )}

          {/* Similar practitioners — mini cards */}
          {similarProviders && similarProviders.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Similar practitioners on {ISLAND_CFG[p.island ?? '']?.label ?? 'Hawaiʻi'}
              </p>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {similarProviders.slice(0, 4).map(sp => {
                  const hasImg = !!sp.image && !sp.image.includes('unsplash.com');
                  const initials = sp.name.split(' ').filter(Boolean).slice(0,2).map((w: string) => w[0]).join('').toUpperCase();
                  const GRADIENTS = ['from-teal-400 to-cyan-500','from-violet-400 to-purple-500','from-amber-400 to-orange-500','from-rose-400 to-pink-500','from-emerald-400 to-green-500'];
                  const grad = GRADIENTS[sp.name.charCodeAt(0) % GRADIENTS.length];
                  const topModality = sp.modalities?.[0] ?? '';
                  return (
                    <Link key={sp.id} to={`/profile/${sp.id}`}
                      className="group block rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md hover:border-border/80 transition-all">
                      <div className="flex items-center gap-2.5">
                        {hasImg ? (
                          <OptimizedImage src={sp.image} alt={sp.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 flex-shrink-0 rounded-full object-cover" loading="lazy" />
                        ) : (
                          <div className={`h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-xs font-semibold`}>
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-tight group-hover:text-primary transition-colors">{sp.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{sp.location?.split(',')[0]}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-1.5">
                        {topModality && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-normal truncate ${modalityChipClass(topModality)}`}>
                            {topModality}
                          </span>
                        )}
                        {sp.acceptsNewClients && (
                          <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Related articles — medium reading list */}
          {relatedArticles.length > 0 && (
            <div className="border-t border-border/50 pt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Related reading
              </p>
              <div className="divide-y divide-border/40">
                {relatedArticles.slice(0, 3).map(a => {
                  const CATEGORY_COLORS: Record<string, string> = {
                    'Traditions':'#5c7a5a','Wellness':'#1e5f8e','Herbalism':'#5c7a5a',
                    'Community':'#8b4513','Therapy':'#1e5f8e','Medicine':'#5c7a5a',
                    'Hawaiian Healing':'#5c7a5a','Breathwork':'#1e5f8e','Somatic Therapy':'#8b4513',
                  };
                  const accent = CATEGORY_COLORS[a.category] ?? '#94a3b8';
                  return (
                    <Link
                      key={a.id}
                      to={`/articles/${a.slug}`}
                      className="flex items-start gap-3 rounded-lg px-2 py-3 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="mt-0.5 h-9 w-1 flex-shrink-0 rounded-full" style={{ background: accent, opacity: 0.65 }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {a.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{a.category}</p>
                      </div>
                      <ArrowRight className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar — only on About tab */}
        {activeTab === 'about' && (
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* Primary CTA — top of sidebar (desktop) */}
          {p.externalBookingUrl ? (
            <Button className="w-full gap-2" size="lg" asChild>
              <a href={p.externalBookingUrl} target="_blank" rel="noopener noreferrer">
                {p.bookingLabel || 'Book Appointment'}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : p.email ? (
            <RequestInfoModal
              practitionerName={p.name}
              practitionerEmail={p.email}
              practitionerWebsite={p.website}
              fullWidth
            />
          ) : null}

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
                    <ContactReveal listingId={p.id} listingType="practitioner" type="phone" />
                  )}
                  {p.email && (
                    <ContactReveal listingId={p.id} listingType="practitioner" type="email" />
                  )}
                  {p.website && (
                    <a href={p.website} onClick={() => trackClick('website')} className="flex items-center gap-2 font-medium text-primary hover:text-primary/80 transition-colors min-w-0" target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    </a>
                  )}
                </div>

                {/* Response time badge */}
                {p.responseTime && (() => {
                  const RT_LABELS: Record<string, string> = {
                    within_hours:    'Responds within a few hours',
                    within_day:      'Responds within 24 hours',
                    within_2_3_days: 'Responds within 2–3 days',
                    within_week:     'Responds within a week',
                  };
                  const label = RT_LABELS[p.responseTime];
                  return label ? (
                    <div className="flex items-center gap-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
                      <Clock className="h-4 w-4 flex-shrink-0 text-sky-600" />
                      <span className="text-sm font-medium text-sky-700">{label}</span>
                    </div>
                  ) : null;
                })()}

                {/* Social links */}
                {isTiered && p.socialLinks && Object.values(p.socialLinks).some(Boolean) && (
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

        </div>
        )}
      </section>


      {/* Bottom nav */}
      <div className="container pb-8 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/directory">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Directory
          </Link>
        </Button>

        {/* Report listing button */}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogTrigger asChild>
            <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors">
              <Flag className="h-3 w-3" />
              Report listing
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report this listing</DialogTitle>
              <DialogDescription>
                Help us keep the directory accurate by reporting any issues with this listing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Select value={reportReason} onValueChange={setReportReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inaccurate">Incorrect information</SelectItem>
                    <SelectItem value="closed">Business is closed</SelectItem>
                    <SelectItem value="duplicate">Spam or duplicate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional details (optional)</label>
                <Textarea
                  placeholder="Please provide any additional context..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="min-h-24 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitReport} disabled={submitFlag.isPending || !reportReason}>
                {submitFlag.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile sticky CTA — always visible on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-3 backdrop-blur-sm lg:hidden">
        {p.externalBookingUrl ? (
          <Button className="w-full gap-2" size="lg" asChild>
            <a href={p.externalBookingUrl} onClick={() => trackClick('booking')} target="_blank" rel="noopener noreferrer">
              {p.bookingLabel || 'Book Appointment'}
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : p.email ? (
          <RequestInfoModal
            practitionerName={p.name}
            practitionerEmail={p.email}
            practitionerWebsite={p.website}
            fullWidth
          />
        ) : null}
      </div>
    </main>
  );
};

export default ProfileDetail;
