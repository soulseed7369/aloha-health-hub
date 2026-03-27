import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Loader2, Lock, Crown } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useMyCenters, useSaveCenter, uploadCenterPhoto, type CenterFormData } from "@/hooks/useMyCenters";
import { useMyBillingProfile } from "@/hooks/useStripe";
import MultiPhotoUpload, { type PhotoSlot } from "@/components/MultiPhotoUpload";
import { RankedModalities, type ModalityTier } from "@/components/RankedModalities";
import { isValidVideoUrl } from "@/lib/cardUtils";

const ISLANDS = [
  { value: 'big_island', label: 'Big Island' },
  { value: 'oahu',       label: 'Oahu' },
  { value: 'maui',       label: 'Maui' },
  { value: 'kauai',      label: 'Kauai' },
  { value: 'molokai',    label: 'Molokaʻi' },
];

const CITIES_BY_ISLAND: Record<string, string[]> = {
  big_island: ['Hilo', 'Kailua-Kona', 'Waimea', 'Captain Cook', 'Pahoa', 'Holualoa', 'Hawi', 'Honokaa', 'Volcano', 'Waikoloa', 'Keaau', 'Ocean View', 'Kapaau', 'Na Alehu'],
  oahu:       ['Honolulu', 'Waikiki', 'Kailua', 'Kaneohe', 'Pearl City', 'Aiea', 'Mililani', 'Kapolei', 'Ewa Beach', 'Haleiwa', 'Waipahu', 'Hawaii Kai', 'Manoa', 'Nuuanu'],
  maui:       ['Kahului', 'Wailuku', 'Lahaina', 'Kihei', 'Wailea', 'Hana', 'Makawao', 'Paia', 'Haiku', 'Kula', 'Pukalani', 'Napili', 'Kapalua', 'Kaanapali'],
  kauai:      ['Lihue', 'Kapaa', 'Hanalei', 'Princeville', 'Poipu', 'Koloa', 'Hanapepe', 'Eleele', 'Kalaheo', 'Lawai', 'Anahola', 'Kilauea'],
  molokai:    ['Kaunakakai', 'Hoolehua', 'Maunaloa', 'Kualapuʻu', 'Halawa'],
};


const CENTER_TYPES = [
  { value: 'spa' as const, label: 'Spa' },
  { value: 'wellness_center' as const, label: 'Wellness Center' },
  { value: 'yoga_studio' as const, label: 'Yoga Studio' },
  { value: 'clinic' as const, label: 'Clinic' },
  { value: 'retreat_center' as const, label: 'Retreat Center' },
  { value: 'fitness_center' as const, label: 'Fitness Center' },
];

const SESSION_TYPES = [
  { value: 'in_person' as const, label: 'In Person' },
  { value: 'online' as const, label: 'Online' },
  { value: 'both' as const, label: 'Both In Person & Online' },
];

const emptyForm: CenterFormData = {
  name: '',
  center_type: 'wellness_center',
  description: '',
  island: 'big_island',
  city: '',
  address: '',
  phone: '',
  email: '',
  website_url: '',
  external_website_url: '',
  accepts_new_clients: true,
  modalities: [],
  session_type: 'in_person',
  video_url: '',
  social_links: {},
  working_hours: {},
};

export default function DashboardCenterProfile() {
  const { data: centers, isLoading } = useMyCenters();
  const { data: billing } = useMyBillingProfile();
  const saveMutation = useSaveCenter();
  const [form, setForm] = useState<CenterFormData>(emptyForm);
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([]);
  const [profilePhotoIndex, setProfilePhotoIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const initialized = useRef(false);
  const [initialPhotos, setInitialPhotos] = useState<string[]>([]);
  const [initialProfileIdx, setInitialProfileIdx] = useState(0);
  const [photoKey, setPhotoKey] = useState(0);

  const center = centers?.[0] ?? null;

  useEffect(() => {
    // Only initialize once
    if (center && !initialized.current) {
      initialized.current = true;
      const validCenterTypes = ['spa', 'wellness_center', 'yoga_studio', 'clinic', 'retreat_center', 'fitness_center'];
      setForm({
        name: center.name ?? '',
        center_type: (validCenterTypes.includes(center.center_type) ? center.center_type : 'wellness_center') as CenterFormData['center_type'],
        description: center.description ?? '',
        island: center.island ?? 'big_island',
        city: center.city ?? '',
        address: center.address ?? '',
        phone: center.phone ?? '',
        email: center.email ?? '',
        website_url: center.website_url ?? '',
        external_website_url: center.external_website_url ?? '',
        accepts_new_clients: center.accepts_new_clients ?? true,
        modalities: center.modalities ?? [],
        session_type: center.session_type ?? 'in_person',
        video_url: center.video_url ?? '',
        social_links: center.social_links ?? {},
        working_hours: (() => {
          const raw = center.working_hours ?? {};
          const normalized: Record<string, Array<{ open: string; close: string }> | null> = {};
          for (const day of ['mon','tue','wed','thu','fri','sat','sun']) {
            const val = raw[day];
            if (!val) {
              normalized[day] = null;
            } else if (Array.isArray(val)) {
              normalized[day] = val;
            } else if (typeof val === 'object' && val !== null && 'open' in val && 'close' in val) {
              // Migrate old single-slot format to array
              normalized[day] = [{ open: String((val as {open: string}).open), close: String((val as {close: string}).close) }];
            } else {
              normalized[day] = null;
            }
          }
          return normalized;
        })(),
      });
      // Initialize photos
      const existingPhotos = center.photos?.filter(Boolean) ?? [];
      const photoUrls = existingPhotos.length > 0
        ? existingPhotos
        : center.avatar_url ? [center.avatar_url] : [];
      setInitialPhotos(photoUrls);
      setInitialProfileIdx(0);
      setPhotoKey(k => k + 1);
      setPhotoSlots(photoUrls.map((url: string) => ({ url })));
      setProfilePhotoIndex(0);
    }
  }, [center]);

  const handlePhotosChange = (slots: PhotoSlot[], idx: number) => {
    setPhotoSlots(slots);
    setProfilePhotoIndex(idx);
  };


  const handleIslandChange = (island: string) => {
    setForm(prev => ({ ...prev, island, city: '' }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Center name is required.'); return; }
    try {
      setUploading(true);

      // Upload pending photos sequentially
      const finalSlots: PhotoSlot[] = [];
      for (const slot of photoSlots) {
        if (slot.file) {
          try {
            const url = await uploadCenterPhoto(slot.file);
            finalSlots.push({ url });
          } catch (err: any) {
            console.error('Photo upload error:', err);
            toast.error(`Photo upload failed: ${err?.message ?? 'unknown error'}`);
            setUploading(false);
            return;
          }
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

      // Update local state
      setPhotoSlots(finalSlots);

      await saveMutation.mutateAsync({
        ...form,
        avatar_url: avatarUrl,
        photos: photoUrls,
      });

      // After successful save, explicitly reset photo state from the saved payload
      // This ensures the form reinitializes properly when the useEffect runs after the refetch
      setInitialPhotos(photoUrls);
      setInitialProfileIdx(safeIdx);
      setPhotoKey(k => k + 1); // remount MultiPhotoUpload with fresh data
      setPhotoSlots(finalSlots);
      setProfilePhotoIndex(safeIdx);

      toast.success('Center profile saved! It will appear in the directory once reviewed.');
    } catch (err: any) {
      console.error('Center save error:', err);
      toast.error(`Failed to save: ${err?.message ?? 'unknown error'}`);
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

  if (!center) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">My Center Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage your center listing in the Hawaii Wellness directory.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                You don't have a center listing yet. Create one from the My Centers page to get started.
              </p>
              <Button asChild>
                <Link to="/dashboard/centers">
                  Go to My Centers
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cities = CITIES_BY_ISLAND[form.island] ?? [];
  const tier = billing?.tier ?? center?.tier ?? 'free';
  const isPremiumOrFeatured = tier === 'premium' || tier === 'featured';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">My Center Profile</h1>
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
            <Label htmlFor="centerName">
              Center Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="centerName"
              placeholder="Aloha Wellness Center"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="centerType">Center Type</Label>
            <Select value={form.center_type} onValueChange={v => setForm(p => ({ ...p, center_type: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CENTER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email">Contact Email (public)</Label>
              </div>
              <Input
                id="email"
                type="email"
                placeholder="info@aloha-wellness.com"
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
              checked={form.accepts_new_clients ?? true}
              onCheckedChange={v => setForm(p => ({ ...p, accepts_new_clients: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Healing Modalities — Ranked by Search Priority */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Healing Modalities</CardTitle>
          <CardDescription>All your modalities appear on your public profile. Drag to reorder — top modalities are searchable based on your tier.</CardDescription>
        </CardHeader>
        <CardContent>
          <RankedModalities
            modalities={form.modalities ?? []}
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
              placeholder="75 Kealakehe St"
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
          <CardDescription>Tell potential clients about your center.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Describe your center's mission, philosophy, and offerings..."
            className="min-h-[120px]"
            value={form.description}
            maxLength={isPremiumOrFeatured ? undefined : 500}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {isPremiumOrFeatured ? 'Unlimited' : `${form.description.length}/500 characters`}
            </p>
            {!isPremiumOrFeatured && (
              <p className="text-xs text-amber-600">
                Upgrade to Premium for unlimited description
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
              ? "Add a YouTube or Vimeo video to showcase your center (displayed above your photo gallery)."
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

      {/* Session Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={form.session_type ?? 'in_person'} onValueChange={v => setForm(p => ({ ...p, session_type: v as any }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Online Presence */}
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
          <div className="space-y-2">
            <Label htmlFor="external_website_url">External Booking/Contact URL</Label>
            <Input
              id="external_website_url"
              type="url"
              placeholder="https://booking.yourservice.com"
              value={form.external_website_url}
              onChange={e => setForm(p => ({ ...p, external_website_url: e.target.value }))}
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
                  placeholder="https://instagram.com/yourpage"
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
                  placeholder="https://linkedin.com/company/yourpage"
                  value={form.social_links?.linkedin ?? ''}
                  onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, linkedin: e.target.value } }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>X (Twitter)</Label>
                <Input
                  placeholder="https://x.com/yourpage"
                  value={form.social_links?.x ?? ''}
                  onChange={e => setForm(p => ({ ...p, social_links: { ...p.social_links, x: e.target.value } }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Substack</Label>
                <Input
                  placeholder="https://substack.com/@yourpage"
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
                Social media links are available on Premium and Featured plans.
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
                Working hours are available on Premium and Featured plans.
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

      {/* Save Button */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSave}
          disabled={uploading || saveMutation.isPending}
          size="lg"
        >
          {uploading || saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Profile'
          )}
        </Button>
      </div>
    </div>
  );
}
