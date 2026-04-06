import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Loader2, Lock, Crown, ShieldCheck, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useMyPractitioner, useSavePractitioner, uploadMyPhoto, type PractitionerFormData } from "@/hooks/useMyPractitioner";
import { useRequestReview } from "@/hooks/useVerification";
import MultiPhotoUpload, { type PhotoSlot } from "@/components/MultiPhotoUpload";
import { isValidVideoUrl } from "@/lib/cardUtils";
import { RankedModalities, type ModalityTier } from "@/components/RankedModalities";

const MODALITIES = [
  'Acupuncture', 'Alternative Therapy', 'Art Therapy', 'Astrology', 'Ayurveda',
  'Birth Doula', 'Breathwork', 'Chiropractic', 'Counseling',
  'Craniosacral', 'Dentistry', 'Energy Healing', 'Family Constellation', 'Fitness', 'Functional Medicine',
  'Hawaiian Healing', 'Herbalism', 'Hypnotherapy', 'IV Therapy', 'Life Coaching',
  'Lomilomi / Hawaiian Healing', 'Longevity', 'Massage', 'Meditation', 'Midwife',
  'Nature Therapy', 'Naturopathic', 'Nervous System Regulation', 'Network Chiropractic',
  'Nutrition', 'Osteopathic', 'Physical Therapy',
  'Psychic', 'Psychotherapy', 'Reiki', 'Ritualist', 'Somatic Therapy', 'Soul Guidance',
  'Sound Healing', 'TCM (Traditional Chinese Medicine)',
  'Trauma-Informed Care', 'Watsu / Water Therapy', "Women's Health", 'Yoga',
];

const ISLANDS = [
  { value: 'big_island', label: 'Big Island' },
  { value: 'oahu',       label: 'Oahu' },
  { value: 'maui',       label: 'Maui' },
  { value: 'kauai',      label: 'Kauai' },
  { value: 'molokai',    label: 'Molokai' },
];

const CITIES_BY_ISLAND: Record<string, string[]> = {
  big_island: ['Hilo', 'Kailua-Kona', 'Waimea', 'Captain Cook', 'Pahoa', 'Holualoa', 'Hawi', 'Honokaa', 'Volcano', 'Waikoloa', 'Keaau', 'Ocean View', 'Kapaau', 'Na Alehu'],
  oahu:       ['Honolulu', 'Waikiki', 'Kailua', 'Kaneohe', 'Pearl City', 'Aiea', 'Mililani', 'Kapolei', 'Ewa Beach', 'Haleiwa', 'Waipahu', 'Hawaii Kai', 'Manoa', 'Nuuanu'],
  maui:       ['Kahului', 'Wailuku', 'Lahaina', 'Kihei', 'Wailea', 'Hana', 'Makawao', 'Paia', 'Haiku', 'Kula', 'Pukalani', 'Napili', 'Kapalua', 'Kaanapali', 'Lanai City'],
  kauai:      ['Lihue', 'Kapaa', 'Hanalei', 'Princeville', 'Poipu', 'Koloa', 'Hanapepe', 'Eleele', 'Kalaheo', 'Lawai', 'Anahola', 'Kilauea'],
  molokai:    ['Kaunakakai', 'Hoolehua', 'Maunaloa', 'Kualapuu', 'Halawa'],
};


const BOOKING_LABELS = [
  { value: 'Book a Session', label: 'Book a Session' },
  { value: 'Schedule Discovery Call', label: 'Schedule Discovery Call' },
  { value: 'Book Appointment', label: 'Book Appointment' },
];

const RESPONSE_TIME_OPTIONS = [
  { value: 'not_set',          label: 'Not set'              },
  { value: 'within_hours',    label: 'Within a few hours'   },
  { value: 'within_day',      label: 'Within 24 hours'      },
  { value: 'within_2_3_days', label: 'Within 2–3 days'      },
  { value: 'within_week',     label: 'Within a week'        },
];

const emptyForm: PractitionerFormData = {
  name: '',
  island: 'big_island',
  modalities: [],
  bio: '',
  what_to_expect: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  website_url: '',
  external_booking_url: '',
  booking_label: '',
  accepts_new_clients: true,
  response_time: '',
  booking_enabled: true,
  messaging_enabled: true,
  discovery_call_enabled: false,
  discovery_call_url: '',
  video_url: '',
  social_links: {},
  working_hours: {},
  services_list: [],
};

export default function DashboardProfile() {
  const { data: practitioner, isLoading } = useMyPractitioner();
  const saveMutation = useSavePractitioner();
  const requestReview = useRequestReview();
  const [form, setForm] = useState<PractitionerFormData>(emptyForm);
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([]);
  const [profilePhotoIndex, setProfilePhotoIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const initialized = useRef(false);
  // Stable initial values for MultiPhotoUpload (set once when practitioner loads)
  const [initialPhotos, setInitialPhotos] = useState<string[]>([]);
  const [initialProfileIdx, setInitialProfileIdx] = useState(0);
  const [photoKey, setPhotoKey] = useState(0); // bump to remount MultiPhotoUpload

  useEffect(() => {
    // Only initialize once — prevents background refetches from overwriting unsaved edits
    if (practitioner && !initialized.current) {
      initialized.current = true;
      setForm({
        name: practitioner.name ?? '',
        island: practitioner.island ?? 'big_island',
        modalities: practitioner.modalities ?? [],
        bio: practitioner.bio ?? '',
        what_to_expect: (practitioner as any).what_to_expect ?? '',
        city: practitioner.city ?? '',
        address: practitioner.address ?? '',
        phone: practitioner.phone ?? '',
        email: practitioner.email ?? '',
        website_url: practitioner.website_url ?? '',
        external_booking_url: practitioner.external_booking_url ?? '',
        booking_label: (practitioner as any).booking_label || 'Book a Session',
        accepts_new_clients: practitioner.accepts_new_clients ?? true,
        response_time: (practitioner as any).response_time ?? '',
        booking_enabled: (practitioner as any).booking_enabled ?? true,
        messaging_enabled: (practitioner as any).messaging_enabled ?? true,
        discovery_call_enabled: (practitioner as any).discovery_call_enabled ?? false,
        discovery_call_url: (practitioner as any).discovery_call_url ?? '',
        video_url: practitioner.video_url ?? '',
        social_links: (practitioner as any).social_links ?? {},
        working_hours: (() => {
          const raw = (practitioner as any).working_hours ?? {};
          const normalized: Record<string, Array<{ open: string; close: string }> | null> = {};
          for (const day of ['mon','tue','wed','thu','fri','sat','sun']) {
            const val = raw[day];
            if (!val) {
              normalized[day] = null;
            } else if (Array.isArray(val)) {
              normalized[day] = val;
            } else if (val.open && val.close) {
              // Migrate old single-slot format to array
              normalized[day] = [{ open: val.open, close: val.close }];
            } else {
              normalized[day] = null;
            }
          }
          return normalized;
        })(),
        services_list: (practitioner as any).services_list ?? [],
      });
      // Initialize photos from the practitioner's photos array (or fallback to avatar_url)
      const existingPhotos = (practitioner as any).photos?.filter(Boolean) ?? [];
      const photoUrls = existingPhotos.length > 0
        ? existingPhotos
        : practitioner.avatar_url ? [practitioner.avatar_url] : [];
      const pIdx = (practitioner as any).profile_photo_index ?? 0;
      setInitialPhotos(photoUrls);
      setInitialProfileIdx(pIdx);
      setPhotoKey(k => k + 1); // remount MultiPhotoUpload with fresh data
      setPhotoSlots(photoUrls.map((url: string) => ({ url })));
      setProfilePhotoIndex(pIdx);
    }
  }, [practitioner]);

  const handlePhotosChange = (slots: PhotoSlot[], idx: number) => {
    setPhotoSlots(slots);
    setProfilePhotoIndex(idx);
  };


  const handleIslandChange = (island: string) => {
    setForm(prev => ({ ...prev, island, city: '' }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Full name is required.'); return; }
    if (MODALITIES.some(m => m.toLowerCase() === form.name.trim().toLowerCase())) {
      toast.error('Please use your real name. Modality names like "Somatic Therapy" belong in the Services section.');
      return;
    }
    try {
      setUploading(true);

      // Upload pending photos sequentially to avoid orphaned files on partial failure
      const finalSlots: PhotoSlot[] = [];
      for (const slot of photoSlots) {
        if (slot.file) {
          const url = await uploadMyPhoto(slot.file);
          finalSlots.push({ url });
        } else {
          finalSlots.push({ url: slot.url });
        }
      }

      // Build photos array of URLs
      const photoUrls = finalSlots.map(s => s.url).filter(Boolean);
      const safeIdx = photoUrls.length > 0
        ? Math.min(profilePhotoIndex, photoUrls.length - 1)
        : 0;
      const avatarUrl = photoUrls[safeIdx] ?? null;

      // Update local state with uploaded URLs (clear file refs)
      setPhotoSlots(finalSlots);

      await saveMutation.mutateAsync({
        ...form,
        avatar_url: avatarUrl,
        photos: photoUrls,
        profile_photo_index: safeIdx,
      });

      // After successful save, explicitly reset photo state from the saved payload
      // This ensures the form reinitializes properly when the useEffect runs after the refetch
      setInitialPhotos(photoUrls);
      setInitialProfileIdx(safeIdx);
      setPhotoKey(k => k + 1); // remount MultiPhotoUpload with fresh data
      setPhotoSlots(finalSlots);
      setProfilePhotoIndex(safeIdx);

      toast.success('Profile saved! It will appear in the directory once reviewed.');
    } catch (err: any) {
      console.error('Profile save error:', err);
      toast.error(`Failed to save profile: ${err?.message ?? 'unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const cities = CITIES_BY_ISLAND[form.island] ?? [];
  const tier = practitioner?.tier ?? 'free';
  const isPremiumOrFeatured = tier === 'premium' || tier === 'featured';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">My Practitioner Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your public directory listing. Changes are saved as draft until reviewed.
        </p>
      </div>

      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo upload — up to 3 photos with profile designation */}
          <div>
            <Label className="mb-2 block">Photos {tier === 'featured' ? '(up to 10)' : tier === 'premium' ? '(up to 5)' : '(1 photo)'}</Label>
            <MultiPhotoUpload
              key={photoKey}
              photos={initialPhotos}
              profileIndex={initialProfileIdx}
              maxPhotos={tier === 'featured' ? 10 : tier === 'premium' ? 5 : 1}
              onChange={handlePhotosChange}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="Dr. Leilani Kamaka"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email">Contact Email (public)</Label>
              </div>
              <Input
                id="email"
                type="email"
                placeholder="dr.kamaka@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="phone">Phone</Label>
                {/* Phone verification disabled until Twilio A2P approval */}
              </div>
              <Input
                id="phone"
                type="tel"
                placeholder="(808) 555-0123"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Accepting New Clients</p>
              <p className="text-xs text-muted-foreground">Show "Accepting New Clients" badge on your profile</p>
            </div>
            <Switch
              checked={form.accepts_new_clients}
              onCheckedChange={v => setForm(p => ({ ...p, accepts_new_clients: v }))}
            />
          </div>

        </CardContent>
      </Card>

      {/* Modalities — Ranked by Search Priority */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Healing Modalities</CardTitle>
          <CardDescription>All your modalities appear on your public profile. Drag to reorder — top modalities are searchable based on your tier.</CardDescription>
        </CardHeader>
        <CardContent>
          <RankedModalities
            modalities={form.modalities}
            tier={(tier as ModalityTier) || 'free'}
            onChange={modalities => setForm(prev => ({ ...prev, modalities }))}
          />
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Island</Label>
              <Select value={form.island} onValueChange={handleIslandChange}>
                <SelectTrigger><SelectValue placeholder="Select island" /></SelectTrigger>
                <SelectContent>
                  {ISLANDS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City / Town</Label>
              <Select value={form.city} onValueChange={v => setForm(p => ({ ...p, city: v }))}>
                <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              placeholder="75-5660 Palani Rd"
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Tell potential clients about your practice, philosophy, and experience..."
            className="min-h-[140px]"
            value={form.bio}
            maxLength={isPremiumOrFeatured ? undefined : 250}
            onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {isPremiumOrFeatured ? 'Unlimited' : `${form.bio.length}/250 characters`}
            </p>
            {!isPremiumOrFeatured && (
              <p className="text-xs text-amber-600">
                Upgrade to Premium for unlimited bio
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video URL — Featured tier only */}
      <Card className={tier === 'featured' ? "border-primary/30 bg-terracotta-light/30" : "border-border"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {tier === 'featured'
              ? <ExternalLink className="h-4 w-4 text-primary" />
              : <Lock className="h-4 w-4 text-muted-foreground" />}
            Video
            {tier !== 'featured' && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <Crown className="h-3 w-3" /> Featured Only
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {tier === 'featured'
              ? "Add a YouTube or Vimeo video to showcase your services (displayed above your photo gallery)."
              : "Upgrade to Featured tier to add a promotional video."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tier === 'featured' ? (
            <div className="space-y-2">
              <Input
                placeholder="YouTube or Vimeo URL (e.g., https://youtube.com/watch?v=dQw4w9WgXcQ)"
                value={form.video_url || ''}
                onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))}
                className={!isValidVideoUrl(form.video_url) ? 'border-red-400' : ''}
              />
              {!isValidVideoUrl(form.video_url) ? (
                <p className="text-xs text-red-500">
                  Please enter a valid YouTube or Vimeo URL.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Paste the full URL from YouTube or Vimeo. It will be embedded on your profile.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-accent/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Video embeds are available for Featured tier listings only.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services — Premium / Featured only (mirrors listing detail order) */}
      <Card className={isPremiumOrFeatured ? "border-primary/30 bg-terracotta-light/30" : "border-border"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isPremiumOrFeatured
              ? <ExternalLink className="h-4 w-4 text-primary" />
              : <Lock className="h-4 w-4 text-muted-foreground" />}
            Services
            {!isPremiumOrFeatured && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Crown className="h-3 w-3" /> Premium
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {isPremiumOrFeatured
              ? "List specific services you offer — shown on your public profile before \"What to Expect\"."
              : "Upgrade to list your specific services with descriptions and pricing."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPremiumOrFeatured ? (
            <div className="space-y-2">
              {form.services_list?.map((svc, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Service name (e.g. Lomilomi Massage)"
                        value={svc.name}
                        onChange={e => {
                          const updated = [...(form.services_list || [])];
                          updated[idx] = { ...svc, name: e.target.value };
                          setForm(p => ({ ...p, services_list: updated }));
                        }}
                        className="flex-1 h-8 text-sm"
                      />
                      <Input
                        placeholder="Price"
                        value={svc.price ?? ''}
                        onChange={e => {
                          const updated = [...(form.services_list || [])];
                          updated[idx] = { ...svc, price: e.target.value };
                          setForm(p => ({ ...p, services_list: updated }));
                        }}
                        className="w-28 h-8 text-sm"
                      />
                    </div>
                    <Input
                      placeholder="Brief description (optional)"
                      value={svc.description ?? ''}
                      onChange={e => {
                        const updated = [...(form.services_list || [])];
                        updated[idx] = { ...svc, description: e.target.value };
                        setForm(p => ({ ...p, services_list: updated }));
                      }}
                      className="h-8 text-sm text-muted-foreground"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(p => ({
                        ...p,
                        services_list: (p.services_list || []).filter((_, i) => i !== idx),
                      }));
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-1.5"
                    aria-label="Remove service"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm(p => ({
                    ...p,
                    services_list: [...(p.services_list || []), { name: '', description: '', price: '' }],
                  }));
                }}
              >
                + Add a service
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                List your specific services with descriptions and optional pricing. Available on Premium and Featured plans.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/list-your-practice">
                  <Crown className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Upgrade to Premium
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* What to Expect — Premium / Featured only */}
      <Card className={isPremiumOrFeatured ? "border-primary/30 bg-terracotta-light/30" : "border-border bg-muted/40"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isPremiumOrFeatured
              ? <ExternalLink className="h-4 w-4 text-primary" />
              : <Lock className="h-4 w-4 text-muted-foreground" />}
            What to Expect
            {!isPremiumOrFeatured && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Crown className="h-3 w-3" /> Premium
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Help clients understand what a session with you looks like — format, duration, what to bring, how to prepare.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPremiumOrFeatured ? (
            <Textarea
              placeholder="e.g. Sessions are 60–90 minutes. We begin with a brief intake conversation, followed by hands-on bodywork..."
              className="min-h-[120px]"
              value={form.what_to_expect}
              onChange={e => setForm(p => ({ ...p, what_to_expect: e.target.value }))}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                Upgrade to Premium to tell clients what to expect during a session with you.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/list-your-practice">
                  <Crown className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Upgrade to Premium
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Online presence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Online Presence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website_url">Website</Label>
            <Input
              id="website_url"
              type="url"
              placeholder="https://yourwebsite.com"
              value={form.website_url}
              onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Links — Premium / Featured only */}
      <Card className={isPremiumOrFeatured ? "border-primary/30 bg-terracotta-light/30" : "border-border bg-muted/40"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isPremiumOrFeatured
              ? <ExternalLink className="h-4 w-4 text-primary" />
              : <Lock className="h-4 w-4 text-muted-foreground" />}
            Social Media Links
            {!isPremiumOrFeatured && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Crown className="h-3 w-3" /> Premium
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPremiumOrFeatured ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input
                  placeholder="https://instagram.com/yourusername"
                  value={form.social_links?.instagram ?? ''}
                  onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, instagram: e.target.value } }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Facebook</Label>
                <Input
                  placeholder="https://facebook.com/yourpage"
                  value={form.social_links?.facebook ?? ''}
                  onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, facebook: e.target.value } }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>LinkedIn</Label>
                <Input
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={form.social_links?.linkedin ?? ''}
                  onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, linkedin: e.target.value } }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>X (Twitter)</Label>
                <Input
                  placeholder="https://x.com/yourusername"
                  value={form.social_links?.x ?? ''}
                  onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, x: e.target.value } }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Substack</Label>
                <Input
                  placeholder="https://substack.com/@yourusername"
                  value={form.social_links?.substack ?? ''}
                  onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, substack: e.target.value } }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave fields blank to hide them on your public profile.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                Social media links are available on Premium and Featured plans. Add your Instagram, Facebook, and other profiles to help clients connect with you.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/list-your-practice">
                  <Crown className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Upgrade to Premium
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Working Hours — Premium / Featured only */}
      <Card className={isPremiumOrFeatured ? "border-primary/30 bg-terracotta-light/30" : "border-border"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isPremiumOrFeatured
              ? <ExternalLink className="h-4 w-4 text-primary" />
              : <Lock className="h-4 w-4 text-muted-foreground" />}
            Working Hours
            {!isPremiumOrFeatured && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Crown className="h-3 w-3" /> Premium
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {isPremiumOrFeatured
              ? "Set your availability by day. Clients will see this on your profile."
              : "Display your working hours so clients know when you're available."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPremiumOrFeatured ? (
            <div className="space-y-1">
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
                const dayLabel: Record<string, string> = {
                  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
                  fri: 'Fri', sat: 'Sat', sun: 'Sun',
                };
                const slots = form.working_hours?.[day];
                const isOpen = slots !== null && slots !== undefined && slots.length > 0;
                return (
                  <div key={day} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                    <Switch
                      checked={isOpen}
                      onCheckedChange={checked => {
                        setForm(p => ({
                          ...p,
                          working_hours: {
                            ...p.working_hours,
                            [day]: checked ? [{ open: '09:00', close: '17:00' }] : null,
                          },
                        }));
                      }}
                      className="scale-90"
                    />
                    <span className="w-10 text-sm font-medium">{dayLabel[day]}</span>
                    {!isOpen && <span className="text-xs text-muted-foreground">Closed</span>}
                    {isOpen && slots && (
                      <div className="flex-1 flex flex-wrap items-center gap-1.5">
                        {slots.map((slot, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <Input
                              type="time"
                              className="w-[6.5rem] h-7 text-xs"
                              value={slot.open}
                              onChange={e => {
                                const updated = [...slots];
                                updated[idx] = { ...slot, open: e.target.value };
                                setForm(p => ({
                                  ...p,
                                  working_hours: { ...p.working_hours, [day]: updated },
                                }));
                              }}
                            />
                            <span className="text-xs text-muted-foreground">–</span>
                            <Input
                              type="time"
                              className="w-[6.5rem] h-7 text-xs"
                              value={slot.close}
                              onChange={e => {
                                const updated = [...slots];
                                updated[idx] = { ...slot, close: e.target.value };
                                setForm(p => ({
                                  ...p,
                                  working_hours: { ...p.working_hours, [day]: updated },
                                }));
                              }}
                            />
                            {slots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = slots.filter((_, i) => i !== idx);
                                  setForm(p => ({
                                    ...p,
                                    working_hours: { ...p.working_hours, [day]: updated.length ? updated : null },
                                  }));
                                }}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                aria-label="Remove time slot"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                            {idx < slots.length - 1 && <span className="text-xs text-muted-foreground">,</span>}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setForm(p => ({
                              ...p,
                              working_hours: {
                                ...p.working_hours,
                                [day]: [...(slots || []), { open: '13:00', close: '17:00' }],
                              },
                            }));
                          }}
                          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                Working hours are available on Premium and Featured plans. Display your availability to help clients schedule with you.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/list-your-practice">
                  <Crown className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Upgrade to Premium
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking link — Premium / Featured only */}
      <Card className={isPremiumOrFeatured ? "border-primary/30 bg-terracotta-light/30" : "border-border"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isPremiumOrFeatured
              ? <ExternalLink className="h-4 w-4 text-primary" />
              : <Lock className="h-4 w-4 text-muted-foreground" />}
            Direct Booking Link
            {!isPremiumOrFeatured && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Crown className="h-3 w-3" /> Premium
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {isPremiumOrFeatured
              ? "Paste your Calendly, Acuity, Square, or booking page URL. Clients will see a button on your profile."
              : "Add a direct link to your booking calendar so clients can schedule with one click."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPremiumOrFeatured ? (
            <>
              <div className="space-y-1.5">
                <Label>Booking URL</Label>
                <Input
                  placeholder="https://calendly.com/your-name"
                  type="url"
                  value={form.external_booking_url}
                  onChange={e => setForm(p => ({ ...p, external_booking_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Supports Calendly and Acuity Scheduling. Your booking calendar will be embedded directly on your public profile.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Button label</Label>
                <Select
                  value={form.booking_label || 'Book Appointment'}
                  onValueChange={v => setForm(p => ({ ...p, booking_label: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Book Appointment" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKING_LABELS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This is the text shown on the button visitors see on your profile.
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                Upgrade to Premium to add a direct booking link and custom button label to your profile.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/list-your-practice">
                  <Crown className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Upgrade to Premium
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Response Time</CardTitle>
          <CardDescription>
            Let visitors know how quickly you typically respond to enquiries. Shown as a badge on your public profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>Typical response time</Label>
            <Select
              value={form.response_time || undefined}
              onValueChange={v => setForm(p => ({ ...p, response_time: v === 'not_set' ? '' : v }))}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_TIME_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This is shown to visitors on your profile to help set expectations.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Verification + Request Review CTA */}
      {practitioner?.id && practitioner.status === 'draft' && (
        <Card className={
          (practitioner as any).email_verified_at || (practitioner as any).phone_verified_at
            ? 'border-sage/30 bg-sage/5'
            : 'border-amber-200 bg-amber-50/50'
        }>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                (practitioner as any).email_verified_at || (practitioner as any).phone_verified_at
                  ? 'text-sage' : 'text-amber-600'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {(practitioner as any).email_verified_at || (practitioner as any).phone_verified_at
                    ? 'Contact info verified — ready for review!'
                    : 'Verify your contact info to go live'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(practitioner as any).email_verified_at || (practitioner as any).phone_verified_at
                    ? 'Click "Request Review" to submit your listing for admin approval.'
                    : 'Verify at least your email or phone number above, then request a review to publish your listing.'}
                </p>
              </div>
            </div>
            {((practitioner as any).email_verified_at || (practitioner as any).phone_verified_at) && (
              <div className="flex items-center gap-3 ml-8">
                <div className="flex gap-2 text-xs">
                  {(practitioner as any).email_verified_at && (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="h-3 w-3" /> Email verified
                    </span>
                  )}
                  {(practitioner as any).phone_verified_at && (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="h-3 w-3" /> Phone verified
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={async () => {
                    try {
                      await requestReview.mutateAsync({
                        listingId: practitioner.id,
                        listingType: 'practitioner',
                      });
                      toast.success('Review requested! Our team will review your listing within 1–2 business days.');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to request review');
                    }
                  }}
                  disabled={requestReview.isPending}
                >
                  {requestReview.isPending
                    ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Requesting…</>
                    : 'Request Review'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending review status */}
      {practitioner?.status === 'pending_review' && (
        <Card className="border-ocean/30 bg-ocean-light/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-ocean flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ocean">Review in progress</p>
              <p className="text-xs text-muted-foreground">Your listing is being reviewed. You'll be notified when it goes live.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={saveMutation.isPending || uploading}>
          {saveMutation.isPending || uploading
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
            : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
