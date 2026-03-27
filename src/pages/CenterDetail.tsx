import { useParams, Link } from "react-router-dom";
import { useState } from "react";

type CenterTabType = 'about' | 'locations' | 'events' | 'testimonials';
import { useCenter, usePublicCenterLocations } from "@/hooks/useCenter";
import { usePublicCenterEvents } from "@/hooks/useCenterEvents";
import { useTrackView, useTrackClick } from "@/hooks/useTrackEvent";
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
  MapPin, Phone, Mail, Globe, ExternalLink,
  Quote, Flag, Instagram, Facebook, Linkedin, Clock,
  Star, Users, CalendarDays, Repeat, ChevronLeft, ChevronRight, CheckCircle,
} from "lucide-react";
import { FlagListingButton } from "@/components/FlagListingButton";
import { ContactReveal } from "@/components/ContactReveal";
import { ShareButtons } from "@/components/ShareButtons";
import { usePageMeta } from "@/hooks/usePageMeta";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/siteConfig";
import { generateCenterBreadcrumb, breadcrumbSchema } from "@/hooks/useProfileBreadcrumb";
import type { CenterLocationRow } from "@/types/database";
import type { CenterEventRow } from "@/hooks/useCenterEvents";
import {
  islandHeaderGradient,
  ISLAND_CFG,
  getOpenStatus,
  isRecentlyUpdated,
  getObjectPosition,
  getEmbedUrl,
} from "@/lib/cardUtils";

// ── Island labels ──────────────────────────────────────────────────────────────
const ISLAND_LABELS: Record<string, string> = {
  big_island: 'Big Island',
  maui:       'Maui',
  oahu:       'Oʻahu',
  kauai:      'Kauaʻi',
};

// ── Amenity labels ─────────────────────────────────────────────────────────────
const AMENITY_LABELS: Record<string, string> = {
  parking:        'Parking',
  wifi:           'WiFi',
  changing_rooms: 'Changing Rooms',
  showers:        'Showers',
  wheelchair:     'Wheelchair Accessible',
  private_rooms:  'Private Rooms',
  group_space:    'Group Space',
  outdoor_area:   'Outdoor Area',
  sauna:          'Sauna / Steam Room',
  pool:           'Pool / Hot Tub',
  cafe:           'Juice Bar / Café',
  retail:         'Retail / Shop',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string | null, timeStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (!timeStr) return date;
  const [h, m] = timeStr.split(':');
  const t = new Date(); t.setHours(parseInt(h, 10), parseInt(m, 10));
  return `${date} · ${t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function eventPriceLabel(ev: CenterEventRow): string {
  if (ev.price_mode === 'free')    return 'Free';
  if (ev.price_mode === 'contact') return 'Contact for price';
  if (ev.price_mode === 'fixed' && ev.price_fixed != null) return `$${ev.price_fixed}`;
  if ((ev.price_mode === 'range' || ev.price_mode === 'sliding') && ev.price_min != null && ev.price_max != null)
    return `$${ev.price_min}–$${ev.price_max}`;
  return '';
}

// ── Public event card ──────────────────────────────────────────────────────────
function PublicEventCard({ event: ev }: { event: CenterEventRow }) {
  const dateLabel = ev.is_recurring
    ? (ev.recurrence_rule || 'Recurring')
    : formatEventDate(ev.event_date, ev.start_time);
  const price = eventPriceLabel(ev);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-semibold">{ev.title}</p>
              {ev.is_recurring && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Repeat className="h-3 w-3" /> Recurring
                </Badge>
              )}
            </div>
            {dateLabel && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> {dateLabel}
              </p>
            )}
            {ev.description && (
              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{ev.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {price && <span className="font-medium text-foreground">{price}</span>}
              {ev.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{ev.location}
                </span>
              )}
              {ev.max_attendees && (
                <span>
                  {ev.attendees_booked}/{ev.max_attendees} spots
                  {ev.attendees_booked >= ev.max_attendees && (
                    <span className="ml-1 text-destructive font-medium">· Full</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {ev.registration_url && (
            <Button size="sm" asChild className="shrink-0">
              <a href={ev.registration_url} target="_blank" rel="noopener noreferrer">
                Register <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ShareButton removed — replaced by shared ShareButtons component

// ── Working hours ──────────────────────────────────────────────────────────────
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

function WorkingHoursTable({ hours }: { hours: Record<string, Array<{ open: string; close: string }> | null | undefined> }) {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return m ? `${h12}:${m.toString().padStart(2,'0')} ${ampm}` : `${h12} ${ampm}`;
  }

  return (
    <ul className="space-y-1.5 text-sm">
      {days.map(d => {
        const slots = hours[d];
        const hasSlots = slots && slots.length > 0;
        return (
          <li key={d} className="flex items-center justify-between">
            <span className="w-28 text-muted-foreground">{DAY_LABELS[d]}</span>
            <span className="font-medium">
              {hasSlots ? (
                <span>
                  {slots.map((s, i) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      {formatTime(s.open)}–{formatTime(s.close)}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-muted-foreground">Closed</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Locations section ──────────────────────────────────────────────────────────
function LocationsSection({ locations }: { locations: CenterLocationRow[] }) {
  if (locations.length === 0) return null;

  // Single location — render inline, no section header needed
  if (locations.length === 1) {
    const loc = locations[0];
    const hasHours = loc.working_hours && Object.values(loc.working_hours).some(Boolean);
    return (
      <>
        {hasHours && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
              <Clock className="h-5 w-5 text-primary" /> Hours
            </h2>
            <WorkingHoursTable hours={loc.working_hours as Record<string, { open: string; close: string } | null>} />
          </div>
        )}
      </>
    );
  }

  // Multiple locations
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
        <MapPin className="h-5 w-5 text-primary" /> Locations
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {locations.map((loc) => {
          const hasHours = loc.working_hours && Object.values(loc.working_hours).some(Boolean);
          const label = loc.name
            || [loc.city, ISLAND_LABELS[loc.island] ?? loc.island].filter(Boolean).join(', ');
          return (
            <Card key={loc.id} className={loc.is_primary ? "ring-1 ring-primary/30" : ""}>
              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{label}</p>
                    {loc.is_primary && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Star className="h-3 w-3" /> Primary
                      </Badge>
                    )}
                  </div>
                  {loc.address && (
                    <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                  )}
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {loc.phone && (
                    <a href={`tel:${loc.phone}`} onClick={() => trackClick('phone')} className="flex items-center gap-2 hover:text-foreground">
                      <Phone className="h-3.5 w-3.5" /> {loc.phone}
                    </a>
                  )}
                  {loc.email && (
                    <a href={`mailto:${loc.email}`} onClick={() => trackClick('email')} className="flex items-center gap-2 hover:text-foreground">
                      <Mail className="h-3.5 w-3.5" /> {loc.email}
                    </a>
                  )}
                  {loc.lat && loc.lng && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      <MapPin className="h-3.5 w-3.5" /> Get directions
                    </a>
                  )}
                </div>
                {hasHours && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground flex items-center gap-1 list-none">
                      <Clock className="h-3.5 w-3.5" />
                      <span>View hours</span>
                    </summary>
                    <div className="mt-2">
                      <WorkingHoursTable hours={loc.working_hours as Record<string, { open: string; close: string } | null>} />
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const PLACEHOLDER_COVER =
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=400&fit=crop';

export default function CenterDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: c, isLoading }         = useCenter(id);
  const { data: locations = [] }       = usePublicCenterLocations(id);
  const { data: events = [] }          = usePublicCenterEvents(id);
  const [activeTab, setActiveTab] = useState<CenterTabType>('about');
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [showAllModalities, setShowAllModalities] = useState(false);

  useTrackView(id, 'center');
  const trackClick = useTrackClick(id, 'center');

  const metaDesc = c
    ? `${c.name} — ${c.centerTypeLabel} in Hawaiʻi. View services, hours, and contact info.`
    : 'Wellness Center Profile';
  // Use first photo or avatar as OG image; falls back to site logo
  const ogImage = c?.photos?.[0] || c?.profileImage || null;
  usePageMeta(c ? c.name : 'Wellness Center', metaDesc, ogImage, 'profile');

  const isClaimed = !!c?.ownerId;
  const isTiered = c && (c.tier === 'premium' || c.tier === 'featured');

  // Tab visibility logic
  const showLocationsTab = locations.length > 1;
  const showEventsTab = isTiered && events.length > 0;
  const showTestimonialsTab = isTiered && c?.testimonials && c.testimonials.length > 0;

  const centerUrl = `${SITE_URL}/center/${id}`;

  // ── Breadcrumb navigation and schema ──────────────────────────────────────
  const breadcrumbItems = c
    ? generateCenterBreadcrumb({
        id: c.id,
        name: c.name,
        island: c.island,
        center_type: c.centerType,
      })
    : [];
  const bcSchema = c ? breadcrumbSchema(breadcrumbItems, SITE_URL) : null;

  const localBusinessSchema = c
    ? {
        '@context': 'https://schema.org',
        '@type': 'HealthAndBeautyBusiness',
        name: c.name,
        description: c.about ?? undefined,
        url: centerUrl,
        address: c.address
          ? { '@type': 'PostalAddress', streetAddress: c.address, addressRegion: 'HI', addressCountry: 'US' }
          : undefined,
        geo: c.lat && c.lng ? { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } : undefined,
        image: c.profileImage,
        hasMap: c.lat && c.lng
          ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`
          : undefined,
      }
    : null;

  // ── Service catalog schema — only for featured tier ──────────────────
  const serviceCatalogSchema = c && c.tier === 'featured' && c.modalities.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: c.name,
    url: centerUrl,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Wellness Services',
      itemListElement: c.modalities.map((m, i) => ({
        '@type': 'OfferCatalog',
        position: i + 1,
        itemOffered: {
          '@type': 'Service',
          name: m,
          provider: { '@type': 'Organization', name: c.name },
          areaServed: { '@type': 'State', name: 'Hawaii' },
        },
      })),
    },
  } : null;

  // ── FAQ schema — only for featured tier with description ──────────────
  const faqSchema = c && c.tier === 'featured' && c.about ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{
      '@type': 'Question',
      name: `What services are offered at ${c.name}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: c.about,
      },
    }],
  } : null;

  // Primary location (for sidebar contact info override when multiple locations)
  const primaryLocation = locations.find((l) => l.is_primary) ?? locations[0] ?? null;
  const hasMultipleLocations = locations.length > 1;

  // Hours: prefer primary location hours, fall back to center root working_hours
  const hoursSource = primaryLocation?.working_hours ?? c?.workingHours;
  const hasHours = hoursSource && Object.values(hoursSource).some(Boolean);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="container py-10">
        <Skeleton className="mb-6 h-6 w-48" />
        <Skeleton className="mb-4 h-64 w-full rounded-xl" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="container py-20 text-center">
        <h1 className="mb-4 font-display text-2xl font-bold">Center not found</h1>
        <p className="mb-6 text-muted-foreground">
          This listing may have been removed or the link is incorrect.
        </p>
        <Button asChild variant="outline">
          <Link to="/directory">← Back to Directory</Link>
        </Button>
      </div>
    );
  }

  // Sidebar contact: use primary location fields if they exist, else center root
  const contactPhone   = primaryLocation?.phone   ?? c.phone;
  const contactEmail   = primaryLocation?.email   ?? c.email;
  const contactAddress = primaryLocation?.address ?? c.address;

  return (
    <main>
      {localBusinessSchema && <JsonLd id="center-localbusiness" data={localBusinessSchema} />}
      {bcSchema    && <JsonLd id="center-breadcrumb"    data={bcSchema} />}
      {serviceCatalogSchema && <JsonLd id="center-services" data={serviceCatalogSchema} />}
      {faqSchema && <JsonLd id="center-faq" data={faqSchema} />}

      {/* Breadcrumb */}
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
              <BreadcrumbPage className="max-w-[240px] truncate">{c.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero — island-gradient card with avatar + info */}
      <section className="mt-4">
        <div className="container">
          <div
            className="rounded-xl overflow-hidden border border-border"
            style={{ background: islandHeaderGradient(c.island) }}
          >
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5">
              {/* Avatar — rounded-xl, not circle */}
              {c.profileImage ? (
                <OptimizedImage
                  src={c.profileImage}
                  alt={c.name}
                  width={112}
                  height={112}
                  className="h-28 w-28 flex-shrink-0 rounded-xl border-4 border-background object-cover shadow-lg"
                  style={{ objectPosition: getObjectPosition((c as any).photoPosition) }}
                  loading="eager"
                  fetchPriority="high"
                />
              ) : (
                <div className="h-28 w-28 flex-shrink-0 rounded-xl border-4 border-background bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-2xl font-semibold text-white shadow-lg">
                  {c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
              )}

              {/* Name + center type + location + modalities */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-2xl font-bold leading-tight md:text-3xl">{c.name}</h1>
                  {(c.tier === 'premium' || c.tier === 'featured') && (
                    <VerifiedBadge />
                  )}
                </div>

                {/* Center type label */}
                <p className="mt-0.5 text-base font-medium text-muted-foreground">{c.centerTypeLabel}</p>

                {/* Island + location row */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {c.island && (
                    <Badge variant="outline" className="text-xs gap-1">
                      {ISLAND_CFG[c.island]?.icon} {ISLAND_CFG[c.island]?.label}
                    </Badge>
                  )}
                  {c.location && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {c.location}
                    </span>
                  )}
                  {hasMultipleLocations && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <MapPin className="h-3 w-3" /> {locations.length} locations
                    </Badge>
                  )}
                </div>

                {/* Accepting clients badge */}
                {c.acceptsNewClients && (
                  <div className="mt-2">
                    <Badge className="gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Accepting New Clients
                    </Badge>
                  </div>
                )}

                {/* Modality pills — linked, expandable, matches practitioner header */}
                {c.modalities.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {c.modalities.slice(0, 5).map((m) => (
                      <Link key={m} to={`/directory?island=${encodeURIComponent(c.island ?? 'big_island')}&modality=${encodeURIComponent(m)}`} className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-700 transition-colors">{m}</Link>
                    ))}
                    {c.modalities.length > 5 && !showAllModalities && (
                      <button
                        onClick={() => setShowAllModalities(true)}
                        className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        +{c.modalities.length - 5} more
                      </button>
                    )}
                    {showAllModalities && c.modalities.slice(5).map((m) => (
                      <Link key={m} to={`/directory?island=${encodeURIComponent(c.island ?? 'big_island')}&modality=${encodeURIComponent(m)}`} className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-700 transition-colors">{m}</Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer strip — share + last updated */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 bg-background/40 px-5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Share this listing:</span>
                <ShareButtons title={`Check out ${c.name} on Hawaiʻi Wellness`} compact />
              </div>
              <div className="flex items-center gap-3">
                {c.created_at && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Member since {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
                {c.updated_at && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Updated · {new Date(c.updated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
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

            {/* Locations tab */}
            {showLocationsTab && (
              <button
                onClick={() => setActiveTab('locations')}
                className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'locations'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Locations
                {activeTab === 'locations' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />
                )}
              </button>
            )}

            {/* Events tab */}
            {showEventsTab && (
              <button
                onClick={() => setActiveTab('events')}
                className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'events'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Events
                {activeTab === 'events' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />
                )}
              </button>
            )}

            {/* Testimonials tab */}
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
        {/* Left — main content */}
        <div className="space-y-8 lg:col-span-2">

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <>
              {c.about && (
                <div>
                  <h2 className="mb-3 font-display text-xl font-bold">About</h2>
                  <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                    {isTiered ? c.about : c.about.slice(0, 500)}
                    {!isTiered && c.about.length > 500 && '…'}
                  </p>
                </div>
              )}

              {/* Claim listing — shown inline after bio for visibility */}
              {!isClaimed && (
                <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <Flag className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                    <p className="mb-1 text-sm font-medium">Is this your center?</p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Claim this listing to manage your profile, add photos, and more.
                    </p>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to={`/auth?claim=${id}`}>Claim this listing</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Healing Modalities — visible on mobile only, sidebar has desktop version */}
              {c.modalities.length > 0 && (
                <div className="lg:hidden">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Healing Modalities
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {c.modalities.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities */}
              {isTiered && c.amenities.length > 0 && (
                <div>
                  <h2 className="mb-3 font-display text-xl font-bold">Amenities</h2>
                  <div className="flex flex-wrap gap-2">
                    {c.amenities.map((a) => (
                      <Badge key={a} variant="secondary" className="text-sm px-3 py-1">
                        {AMENITY_LABELS[a] ?? a}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Video embed — Featured tier only */}
              {c.tier === 'featured' && (c as any).videoUrl && (() => {
                const embedUrl = getEmbedUrl((c as any).videoUrl);
                return embedUrl ? (
                  <div>
                    <h2 className="mb-3 font-display text-xl font-bold">Video</h2>
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border shadow-sm">
                      <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Photo gallery carousel */}
              {isTiered && c.photos && c.photos.length > 1 && (() => {
                const galleryPhotos = (c.photos ?? []).filter(p => p !== c.profileImage).slice(0, 5);
                return galleryPhotos.length > 0 ? (
                  <div>
                    <h2 className="mb-3 font-display text-xl font-bold">Gallery</h2>
                    <div className="relative rounded-xl overflow-hidden bg-black">
                      {/* Carousel container — 16:9 aspect ratio */}
                      <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                        {/* Track with carousel slides */}
                        <div className="absolute inset-0 flex overflow-hidden">
                          {galleryPhotos.map((photo, i) => (
                            <div
                              key={i}
                              className="min-w-full transition-transform duration-300 ease-out"
                              style={{ transform: `translateX(-${galleryIdx * 100}%)` }}
                            >
                              <OptimizedImage
                                src={photo}
                                alt={`${c.name} photo ${i + 1}`}
                                width={1200}
                                height={675}
                                className="w-full h-full object-cover"
                                loading={i === galleryIdx ? "eager" : "lazy"}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Prev button */}
                        <button
                          onClick={() => setGalleryIdx((galleryIdx - 1 + galleryPhotos.length) % galleryPhotos.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>

                        {/* Next button */}
                        <button
                          onClick={() => setGalleryIdx((galleryIdx + 1) % galleryPhotos.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>

                        {/* Photo counter — top right */}
                        <div className="absolute top-3 right-3 z-10 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded">
                          {galleryIdx + 1} / {galleryPhotos.length}
                        </div>

                        {/* Dot indicators — bottom center */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                          {galleryPhotos.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setGalleryIdx(i)}
                              className={`h-2 w-2 rounded-full transition-all ${
                                i === galleryIdx
                                  ? 'bg-white w-4'
                                  : 'bg-white/50 hover:bg-white/80'
                              }`}
                              aria-label={`Go to photo ${i + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </>
          )}

          {/* LOCATIONS TAB */}
          {activeTab === 'locations' && showLocationsTab && (
            <LocationsSection locations={locations} />
          )}

          {/* EVENTS TAB */}
          {activeTab === 'events' && showEventsTab && (
            <div>
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
                <CalendarDays className="h-5 w-5 text-primary" /> Upcoming Events
              </h2>
              <div className="space-y-3">
                {events.map((ev) => (
                  <PublicEventCard key={ev.id} event={ev} />
                ))}
              </div>
            </div>
          )}

          {/* TESTIMONIALS TAB */}
          {activeTab === 'testimonials' && showTestimonialsTab && (
            <div>
              <h2 className="mb-4 font-display text-xl font-bold">What Clients Say</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {c.testimonials.map((t, i) => (
                  <Card key={i} className="bg-secondary/30">
                    <CardContent className="p-4">
                      <Quote className="mb-2 h-5 w-5 text-primary/40" />
                      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t.author}</span>
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
        </div>

        {/* Right sidebar — always in DOM to prevent layout shift, hidden on non-About tabs */}
        <div className={`space-y-4 lg:sticky lg:top-20 lg:self-start ${activeTab !== 'about' ? 'hidden lg:block lg:invisible' : ''}`}>
          <Card>
            <CardContent className="p-0">
              {/* Map placeholder */}
              <div className="flex h-40 items-center justify-center rounded-t-lg bg-ocean-light">
                {c.lat && c.lng ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 text-ocean hover:opacity-80"
                  >
                    <MapPin className="h-8 w-8" />
                    <span className="text-xs font-medium">Get directions</span>
                  </a>
                ) : (
                  <MapPin className="h-8 w-8 text-ocean" />
                )}
              </div>

              <div className="space-y-3 p-4">
                {contactAddress && (
                  <p className="text-sm font-medium">{contactAddress}</p>
                )}

                {hasMultipleLocations && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {locations.length} locations — see full list above
                  </p>
                )}

                {/* Open/Closed status indicator + hours */}
                {hasHours && hoursSource && (() => {
                  const statusInfo = getOpenStatus(hoursSource);
                  return (
                    <div className="space-y-2 border-t border-border/50 pt-3">
                      {statusInfo && (
                        <div className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full ${
                          statusInfo.isOpen
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                            statusInfo.isOpen ? 'bg-emerald-500' : 'bg-muted-foreground'
                          }`} />
                          {statusInfo.isOpen && statusInfo.closesAt
                            ? `Open · Closes at ${statusInfo.closesAt}`
                            : 'Closed'
                          }
                        </div>
                      )}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground flex items-center gap-1 list-none font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          <span>View hours</span>
                        </summary>
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <WorkingHoursTable hours={hoursSource as Record<string, { open: string; close: string } | null>} />
                        </div>
                      </details>
                    </div>
                  );
                })()}

                <div className="space-y-2 text-sm text-muted-foreground">
                  {contactPhone && (
                    <ContactReveal listingId={c.id} listingType="center" type="phone" />
                  )}
                  {contactEmail && (
                    <ContactReveal listingId={c.id} listingType="center" type="email" />
                  )}
                  {c.website && (
                    <a href={c.website} onClick={() => trackClick('website')} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-foreground">
                      <Globe className="h-4 w-4" /> Website
                    </a>
                  )}
                </div>

                {/* Social links */}
                {isTiered && c.socialLinks && Object.values(c.socialLinks).some(Boolean) && (
                  <div className="flex flex-wrap gap-3 border-t border-border/50 pt-1">
                    {c.socialLinks.instagram && (
                      <a href={c.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <Instagram className="h-4 w-4" /> Instagram
                      </a>
                    )}
                    {c.socialLinks.facebook && (
                      <a href={c.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <Facebook className="h-4 w-4" /> Facebook
                      </a>
                    )}
                    {c.socialLinks.linkedin && (
                      <a href={c.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <Linkedin className="h-4 w-4" /> LinkedIn
                      </a>
                    )}
                    {c.socialLinks.x && (
                      <a href={c.socialLinks.x} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        X / Twitter
                      </a>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Book CTA — paid tiers only (matches practitioner behaviour) */}
          {isTiered && c.externalBookingUrl && (
            <Button className="w-full gap-2" size="lg" asChild>
              <a href={c.externalBookingUrl} onClick={() => trackClick('booking')} target="_blank" rel="noopener noreferrer">
                Book / Visit Website
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}


          <div className="flex justify-center pt-1">
            <FlagListingButton
              listingType="center"
              listingId={id!}
              listingName={c.name}
            />
          </div>

          <div className="pt-2">
            <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
              <Link to="/directory">← Back to Directory</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
