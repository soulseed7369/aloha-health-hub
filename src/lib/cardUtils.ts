/**
 * Shared utilities used by both ProviderCard / ProfileDetail and CenterCard / CenterDetail.
 * Single source of truth for modality colours, tier classes, island config, avatar fallback,
 * freshness checks, and open/closed helpers.
 */

// ── Modality → colour category ──────────────────────────────────────────────

export const MODALITY_SAGE = new Set([
  "Massage","Craniosacral","Reiki","Energy Healing","Lomilomi / Hawaiian Healing",
  "Hawaiian Healing","Watsu / Water Therapy","Physical Therapy","Osteopathic",
  "Chiropractic","Network Chiropractic","Acupuncture","TCM (Traditional Chinese Medicine)",
  "Ayurveda","Naturopathic","Functional Medicine","Herbalism","IV Therapy","Longevity",
  "Dentistry","Nervous System Regulation",
]);

export const MODALITY_OCEAN = new Set([
  "Yoga","Breathwork","Meditation","Nature Therapy","Sound Healing","Art Therapy",
]);

export const MODALITY_TERRA = new Set([
  "Psychotherapy","Counseling","Life Coaching","Hypnotherapy","Family Constellation",
  "Soul Guidance","Astrology","Psychic","Ritualist","Birth Doula","Midwife",
  "Women's Health","Trauma-Informed Care","Somatic Therapy",
]);

/** Returns a Tailwind className string for a modality pill based on its category */
export function modalityBadgeClass(m: string): string {
  if (MODALITY_SAGE.has(m))  return "bg-sage-light text-sage border border-sage/30";
  if (MODALITY_OCEAN.has(m)) return "bg-ocean-light text-ocean border border-ocean/30";
  if (MODALITY_TERRA.has(m)) return "bg-terracotta-light text-terracotta border border-terracotta/30";
  return "bg-secondary text-secondary-foreground";
}

// ── Tier → border / shadow classes ──────────────────────────────────────────

export function tierCardClasses(tier?: string): string {
  if (tier === "featured") return "border-2 border-amber-300 shadow-lg bg-amber-50/30";
  if (tier === "premium")  return "border border-sage/40 shadow";
  return "border border-border shadow-sm";
}

// ── Island configuration ────────────────────────────────────────────────────

export const ISLAND_CFG: Record<string, { label: string; fullLabel: string; icon: string; color: string; bg: string; gradient: string }> = {
  big_island: { label: "Big Island", fullLabel: "Big Island of Hawaiʻi", icon: "🌋", color: "#7c3aed", bg: "#f5f3ff", gradient: "linear-gradient(135deg, hsl(260,25%,96%), hsl(200,20%,96%))" },
  maui:       { label: "Maui",       fullLabel: "Maui",                  icon: "🌿", color: "#065f46", bg: "#ecfdf5", gradient: "linear-gradient(135deg, hsl(143,25%,95%), hsl(160,20%,96%))" },
  oahu:       { label: "Oʻahu",      fullLabel: "Oʻahu",                icon: "🏙️",  color: "#1e40af", bg: "#eff6ff", gradient: "linear-gradient(135deg, hsl(215,30%,96%), hsl(200,25%,96%))" },
  kauai:      { label: "Kauaʻi",    fullLabel: "Kauaʻi",              icon: "🌺",  color: "#92400e", bg: "#fef3c7", gradient: "linear-gradient(135deg, hsl(35,30%,96%), hsl(25,25%,96%))" },
};

export function islandHeaderGradient(island: string | null | undefined): string {
  return ISLAND_CFG[island ?? '']?.gradient ?? "linear-gradient(135deg, hsl(143,15%,96%), hsl(200,15%,96%))";
}

// ── Avatar fallback gradient pairs ──────────────────────────────────────────

export const GRADIENT_PAIRS: [string, string][] = [
  ["from-teal-400 to-cyan-500", "text-white"],
  ["from-emerald-400 to-green-500", "text-white"],
  ["from-violet-400 to-purple-500", "text-white"],
  ["from-amber-400 to-orange-500", "text-white"],
  ["from-rose-400 to-pink-500", "text-white"],
];

export function avatarGradient(name: string): { gradient: string; textColor: string } {
  const idx = name.charCodeAt(0) % GRADIENT_PAIRS.length;
  return { gradient: GRADIENT_PAIRS[idx][0], textColor: GRADIENT_PAIRS[idx][1] };
}

// ── Freshness check ─────────────────────────────────────────────────────────

export function isRecentlyUpdated(updatedAt?: string): boolean {
  if (!updatedAt) return false;
  try {
    return (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24) <= 30;
  } catch { return false; }
}

// ── Image validation ────────────────────────────────────────────────────────

/** Returns true if the image URL is a real listing photo (not a placeholder or stock photo) */
export function isValidListingImage(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false;
  if (imageUrl.includes("no%20image")) return false;
  if (imageUrl.includes("no image")) return false;
  if (imageUrl.includes("unsplash.com")) return false;
  return true;
}

// ── Open/Closed status from working hours ───────────────────────────────────

type HoursSlot = { open: string; close: string } | null | undefined;
type WorkingHours = Record<string, HoursSlot>;

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Determines if a center is currently open based on its working_hours.
 * Returns { isOpen, closesAt } or null if hours data is insufficient.
 */
export function getOpenStatus(hours: WorkingHours | null | undefined): { isOpen: boolean; closesAt: string | null } | null {
  if (!hours) return null;

  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const slot = hours[dayKey];

  if (!slot) return { isOpen: false, closesAt: null };

  try {
    const [openH, openM] = slot.open.split(':').map(Number);
    const [closeH, closeM] = slot.close.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);

    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    return { isOpen, closesAt: isOpen ? slot.close : null };
  } catch {
    return null;
  }
}

// ── Center type labels ──────────────────────────────────────────────────────

export const CENTER_TYPE_LABELS: Record<string, string> = {
  spa: 'Spa',
  wellness_center: 'Wellness Center',
  yoga_studio: 'Yoga Studio',
  clinic: 'Clinic',
  retreat_center: 'Retreat Center',
  fitness_center: 'Fitness Center',
};

export function centerTypeLabel(centerType?: string): string | undefined {
  if (!centerType) return undefined;
  return CENTER_TYPE_LABELS[centerType] ?? centerType;
}

// ── Sort modalities with highlighted one first ──────────────────────────────

// ── Photo position → CSS object-position ─────────────────────────────────

/** Maps a photo_position value ('top'|'center'|'bottom') to a CSS object-position string */
export function getObjectPosition(position?: string | null): string {
  switch (position) {
    case 'top': return 'center top';
    case 'bottom': return 'center bottom';
    default: return 'center';
  }
}

// ── Video embed helpers ──────────────────────────────────────────────────

/** Returns true if the URL is a valid YouTube or Vimeo link */
export function isValidVideoUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true; // empty is fine
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

/** Converts a YouTube or Vimeo URL to its embed variant. Returns null if unrecognised. */
export function getEmbedUrl(url?: string | null): string | null {
  if (!url) return null;

  // Already an embed URL? Pass through as-is.
  if (url.includes('youtube.com/embed/')) return url;
  if (url.includes('player.vimeo.com/video/')) return url;

  // YouTube: watch?v=ID, /shorts/ID, or youtu.be/ID
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo: https://vimeo.com/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

// ── Sort modalities with highlighted one first ──────────────────────────

export function sortModalities(modalities: string[], highlight?: string): string[] {
  if (!highlight) return modalities;
  return [...modalities].sort((a, b) => {
    const hl = highlight.toLowerCase();
    const aMatch = a.toLowerCase().includes(hl) || hl.includes(a.toLowerCase());
    const bMatch = b.toLowerCase().includes(hl) || hl.includes(b.toLowerCase());
    return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
  });
}

// ── Infer a human-readable job title from a primary modality ────────────────
// Used as the subtitle under the practitioner's name on cards.
// Next sprint: replace/override with a dedicated `title` DB column.

const MODALITY_TITLE_MAP: Record<string, string> = {
  "Acupuncture":                    "Acupuncturist",
  "Alternative Therapy":            "Alternative Therapist",
  "Art Therapy":                    "Art Therapist",
  "Astrology":                      "Astrologer",
  "Ayurveda":                       "Ayurvedic Practitioner",
  "Birth Doula":                    "Birth Doula",
  "Breathwork":                     "Breathwork Facilitator",
  "Chiropractic":                   "Chiropractor",
  "Counseling":                     "Counselor",
  "Craniosacral":                   "Craniosacral Therapist",
  "Dentistry":                      "Dentist",
  "Energy Healing":                 "Energy Healer",
  "Family Constellation":           "Family Constellation Facilitator",
  "Fitness":                        "Fitness Coach",
  "Functional Medicine":            "Functional Medicine Practitioner",
  "Hawaiian Healing":               "Hawaiian Healing Practitioner",
  "Herbalism":                      "Herbalist",
  "Hypnotherapy":                   "Hypnotherapist",
  "IV Therapy":                     "IV Therapy Specialist",
  "Life Coaching":                  "Life Coach",
  "Lomilomi / Hawaiian Healing":    "Lomilomi Practitioner",
  "Longevity":                      "Longevity Specialist",
  "Massage":                        "Massage Therapist",
  "Meditation":                     "Meditation Teacher",
  "Midwife":                        "Midwife",
  "Nature Therapy":                 "Nature Therapy Guide",
  "Naturopathic":                   "Naturopathic Doctor",
  "Nervous System Regulation":      "Nervous System Specialist",
  "Network Chiropractic":           "Network Chiropractor",
  "Nutrition":                      "Nutritionist",
  "Osteopathic":                    "Osteopathic Practitioner",
  "Physical Therapy":               "Physical Therapist",
  "Psychic":                        "Psychic Intuitive",
  "Psychotherapy":                  "Psychotherapist",
  "Reiki":                          "Reiki Practitioner",
  "Ritualist":                      "Ritualist",
  "Somatic Therapy":                "Somatic Therapist",
  "Soul Guidance":                  "Soul Guide",
  "Sound Healing":                  "Sound Healer",
  "TCM (Traditional Chinese Medicine)": "TCM Practitioner",
  "Trauma-Informed Care":           "Trauma-Informed Therapist",
  "Watsu / Water Therapy":          "Watsu Practitioner",
  "Women's Health":                 "Women's Health Specialist",
  "Yoga":                           "Yoga Teacher",
};

/**
 * Returns a human-readable job title for a primary modality.
 * Falls back to the raw modality string if no mapping exists.
 */
export function inferTitleFromModality(modality?: string | null): string | undefined {
  if (!modality) return undefined;
  return MODALITY_TITLE_MAP[modality] ?? modality;
}
