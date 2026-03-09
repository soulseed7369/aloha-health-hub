import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useCenter } from "@/hooks/useCenter";
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
  Quote, Flag, Instagram, Facebook, Linkedin, Link2, Check, Clock,
} from "lucide-react";
import { FlagListingButton } from "@/components/FlagListingButton";
import { usePageMeta } from "@/hooks/usePageMeta";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/siteConfig";

// ── Share button ───────────────────────────────────────────────────────────────
function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xUrl = `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out ${name} on Hawaiʻi Wellness`)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Share:</span>
      <a href={fbUrl} target="_blank" rel="noopener noreferrer"
        className="rounded border border-border px-2 py-1 text-xs hover:bg-muted">Facebook</a>
      <a href={xUrl} target="_blank" rel="noopener noreferrer"
        className="rounded border border-border px-2 py-1 text-xs hover:bg-muted">X</a>
      <button onClick={handleCopy}
        className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted">
        {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Link2 className="h-3 w-3" /> Copy link</>}
      </button>
    </div>
  );
}

// ── Working hours ──────────────────────────────────────────────────────────────
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

function WorkingHours({ hours }: { hours: Record<string, { open: string; close: string } | null | undefined> }) {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
        <Clock className="h-5 w-5 text-primary" /> Hours
      </h2>
      <ul className="space-y-1.5 text-sm">
        {days.map(d => {
          const slot = hours[d];
          return (
            <li key={d} className="flex items-center justify-between">
              <span className="w-28 text-muted-foreground">{DAY_LABELS[d]}</span>
              <span className="font-medium">
                {slot ? `${slot.open} – ${slot.close}` : <span className="text-muted-foreground">Closed</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const PLACEHOLDER_COVER =
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=400&fit=crop';

export default function CenterDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: c, isLoading } = useCenter(id);

  const metaDesc = c
    ? `${c.name} — ${c.centerTypeLabel} in Hawaiʻi. View services, hours, and contact info.`
    : 'Wellness Center Profile';
  usePageMeta(c ? c.name : 'Wellness Center', metaDesc);

  const centerUrl = `${SITE_URL}/center/${id}`;

  const localBusinessSchema = c
    ? {
        '@context': 'https://schema.org',
        '@type': 'HealthAndBeautyBusiness',
        name: c.name,
        description: c.about ?? undefined,
        url: centerUrl,
        telephone: c.phone ?? undefined,
        email: c.email ?? undefined,
        address: c.address
          ? { '@type': 'PostalAddress', streetAddress: c.address, addressRegion: 'HI', addressCountry: 'US' }
          : undefined,
        geo: c.lat && c.lng ? { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } : undefined,
        image: c.profileImage,
        hasMap: `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`,
      }
    : null;

  const breadcrumbSchema = c
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Directory', item: `${SITE_URL}/directory` },
          { '@type': 'ListItem', position: 3, name: c.name, item: centerUrl },
        ],
      }
    : null;

  const isClaimed = !!c?.ownerId;
  const hasHours = c?.workingHours && Object.values(c.workingHours).some(Boolean);

  // ── Loading state ──────────────────────────────────────────────────────────
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
        <p className="mb-6 text-muted-foreground">This listing may have been removed or the link is incorrect.</p>
        <Button asChild variant="outline"><Link to="/directory">← Back to Directory</Link></Button>
      </div>
    );
  }

  return (
    <main>
      {localBusinessSchema && <JsonLd id="center-localbusiness" data={localBusinessSchema} />}
      {breadcrumbSchema && <JsonLd id="center-breadcrumb" data={breadcrumbSchema} />}

      {/* Breadcrumb */}
      <div className="container pt-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/directory">Directory</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[240px] truncate">{c.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero */}
      <section className="relative mt-4">
        <div className="h-48 overflow-hidden md:h-64">
          <img
            src={c.photos[0] || PLACEHOLDER_COVER}
            alt={`${c.name} cover`}
            className="h-full w-full object-cover"
            loading="eager"
          />
        </div>
        <div className="container relative">
          <div className="flex flex-col items-start gap-4 pb-6 pt-0 md:flex-row md:items-end md:gap-6">
            <img
              src={c.profileImage}
              alt={c.name}
              className="-mt-16 h-32 w-32 rounded-xl border-4 border-background object-cover shadow-lg"
            />
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold md:text-3xl">{c.name}</h1>
              <p className="mt-0.5 text-base font-medium text-muted-foreground">{c.centerTypeLabel}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {c.location && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {c.location}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <ShareButton name={c.name} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container grid gap-8 py-8 lg:grid-cols-3">
        {/* Left — main content */}
        <div className="space-y-8 lg:col-span-2">
          {c.about && (
            <div>
              <h2 className="mb-3 font-display text-xl font-bold">About</h2>
              <p className="leading-relaxed text-muted-foreground">{c.about}</p>
            </div>
          )}

          {c.modalities.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-xl font-bold">Services &amp; Modalities</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {c.modalities.map((m) => (
                  <li key={m} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasHours && c.workingHours && (
            <WorkingHours hours={c.workingHours as Record<string, { open: string; close: string } | null>} />
          )}

          {c.photos.length > 1 && (
            <div>
              <h2 className="mb-3 font-display text-xl font-bold">Gallery</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {c.photos.slice(1).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${c.name} photo ${i + 2}`}
                    className="aspect-[4/3] rounded-lg object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          )}

          {c.testimonials.length > 0 && (
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
                        {t.date && <span className="text-xs text-muted-foreground">{t.date}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="p-0">
              <div className="flex h-40 items-center justify-center rounded-t-lg bg-ocean-light">
                <MapPin className="h-8 w-8 text-ocean" />
              </div>
              <div className="space-y-3 p-4">
                {c.address && <p className="text-sm font-medium">{c.address}</p>}
                <div className="space-y-2 text-sm text-muted-foreground">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:text-foreground">
                      <Phone className="h-4 w-4" /> {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:text-foreground">
                      <Mail className="h-4 w-4" /> {c.email}
                    </a>
                  )}
                  {c.website && (
                    <a href={c.website} className="flex items-center gap-2 hover:text-foreground"
                      target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4" /> Website
                    </a>
                  )}
                </div>

                {/* Social links */}
                {c.socialLinks && Object.values(c.socialLinks).some(Boolean) && (
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

          {c.externalBookingUrl && (
            <Button className="w-full gap-2" size="lg" asChild>
              <a href={c.externalBookingUrl} target="_blank" rel="noopener noreferrer">
                Book / Visit Website
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}

          {/* Claim listing */}
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
