import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, X, ExternalLink, Loader2, Lock, Crown, ShieldCheck, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useMyPractitioner, useSavePractitioner, uploadMyPhoto, type PractitionerFormData } from "@/hooks/useMyPractitioner";
import { ContactVerification } from "@/components/ContactVerification";
import { useRequestReview } from "@/hooks/useVerification";

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

const BOOKING_LABELS = [
  { value: 'Book Appointment', label: 'Book Appointment' },
  { value: 'Schedule Discovery Call', label: 'Schedule Discovery Call' },
  { value: 'Book a Session', label: 'Book a Session' },
  { value: 'Request a Consultation', label: 'Request a Consultation' },
];

const RESPONSE_TIME_OPTIONS = [
  { value: '',                label: 'Not set'              },
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
};

export default function DashboardProfile() {
  const { data: practitioner, isLoading } = useMyPractitioner();
  const saveMutation = useSavePractitioner();
  const requestReview = useRequestReview();
  const [form, setForm] = useState<PractitionerFormData>(emptyForm);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

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
        booking_label: (practitioner as any).booking_label ?? '',
        accepts_new_clients: practitioner.accepts_new_clients ?? true,
        response_time: (practitioner as any).response_time ?? '',
      });
      setAvatarUrl(practitioner.avatar_url ?? null);
    }
  }, [practitioner]);

  // Revoke blob URL to prevent memory leak when component unmounts
  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview); // revoke previous before creating new
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const toggleModality = (m: string) => {
    setForm(prev => ({
      ...prev,
      modalities: prev.modalities.includes(m)
        ? prev.modalities.filter(x => x !== m)
        : [...prev.modalities, m],
    }));
  };

  const handleIslandChange = (island: string) => {
    setForm(prev => ({ ...prev, island, city: '' }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Full name is required.'); return; }
    try {
      setUploading(true);
      let finalAvatarUrl = avatarUrl;
      if (photoFile) {
        finalAvatarUrl = await uploadMyPhoto(photoFile);
        setAvatarUrl(finalAvatarUrl);
        setPhotoFile(null);
        setPhotoPreview(null);
      }
      // Include avatar_url in the save payload so it persists to the DB
      await saveMutation.mutateAsync({ ...form, avatar_url: finalAvatarUrl });
      toast.success('Profile saved! It will appear in the directory once reviewed.');
    } catch (err) {
      toast.error('Failed to save profile. Please try again.');
      if (import.meta.env.DEV) console.error(err);
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

  const currentPhoto = photoPreview || avatarUrl;
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
          {/* Photo upload */}
          <div className="flex items-center gap-4">
            {currentPhoto ? (
              <div className="relative">
                <img src={currentPhoto} alt="Profile" className="w-20 h-20 rounded-full object-cover border" />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); setAvatarUrl(null); }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-input bg-muted flex items-center justify-center">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {currentPhoto ? 'Change Photo' : 'Upload Photo'}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">JPG or PNG, up to 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
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
                {practitioner?.id && (
                  <ContactVerification
                    listingId={practitioner.id}
                    listingType="practitioner"
                    channel="email"
                    value={form.email}
                    verified={!!(practitioner as any).email_verified_at}
                  />
                )}
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
                {practitioner?.id && (
                  <ContactVerification
                    listingId={practitioner.id}
                    listingType="practitioner"
                    channel="phone"
                    value={form.phone}
                    verified={!!(practitioner as any).phone_verified_at}
                  />
                )}
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

      {/* Modalities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Services & Modalities</CardTitle>
          <CardDescription>Select all that apply to your practice.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
            {MODALITIES.map(m => (
              <label key={m} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary">
                <input
                  type="checkbox"
                  checked={form.modalities.includes(m)}
                  onChange={() => toggleModality(m)}
                  className="w-3.5 h-3.5 accent-primary"
                />
                {m}
              </label>
            ))}
          </div>
          {form.modalities.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Selected: {form.modalities.join(', ')}
            </p>
          )}
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
            <p className="text-sm text-muted-foreground">
              Social media links feature coming soon. Your social profiles will be displayed on your public profile.
            </p>
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
              value={form.response_time}
              onValueChange={v => setForm(p => ({ ...p, response_time: v }))}
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
