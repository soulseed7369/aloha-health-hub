# Data Model Reference

## practitioners table

```
id                   uuid PK
name                 text
bio                  text
island               text  -- 'big_island' | 'maui' | 'oahu' | 'kauai'
city                 text
address              text
phone                text
email                text
website_url          text
external_booking_url text
modalities           text[]   -- ARRAY, not a comma-separated string
tier                 text     -- 'free' | 'premium' | 'featured'
status               text     -- 'draft' | 'published'
owner_id             uuid FK → auth.users
accepts_new_clients  boolean
lat                  float8
lng                  float8
photo_url            text
social_links         jsonb    -- { instagram, facebook, linkedin, x, substack }
session_type         text     -- 'in_person' | 'online' | 'both'
credentials          text[]   -- ARRAY of credential abbreviations: ["LMT", "ND", "LAc", "PhD"]
created_at           timestamptz
updated_at           timestamptz
```

## centers table

Same shape as `practitioners`, plus:

```
center_type   text     -- 'spa' | 'wellness_center' | 'clinic' | 'retreat_center' | 'fitness_center'
photos        text[]   -- array of image URLs (max 5)
working_hours jsonb    -- { mon: {open, close} | null, tue: ..., ... }
testimonials  jsonb[]
description   text
```

## featured_slots table

```
id            uuid PK
listing_id    uuid     -- FK to practitioners.id OR centers.id
listing_type  text     -- 'practitioner' | 'center'
island        text
owner_id      uuid FK → auth.users
created_at    timestamptz
```

5/island cap enforced by DB trigger. See `supabase/CLAUDE.md` for full behavior.

## user_profiles table

```
id                      uuid PK  (= auth.users.id)
tier                    text
stripe_customer_id      text
stripe_subscription_id  text
stripe_price_id         text
subscription_status     text
subscription_period_end timestamptz
updated_at              timestamptz
```

## Other tables

- `retreats` — separate from practitioners/centers; gated by Premium tier
- `articles` — admin-managed blog posts, slug-routed
- `listing_flags` — user-submitted listing reports for admin review

---

## Directory Filtering

| Filter | Applied at | Notes |
|--------|-----------|-------|
| `island` | Supabase `.eq('island', value)` | Always applied first |
| `status` | Supabase `.eq('status', 'published')` | Hard-coded in hooks |
| `modality` | Client-side `Array.includes()` | `modalities` is `text[]` |
| `city` | Client-side string match | Cities vary per island |
| `session_type` | Client-side | `'in_person'` \| `'online'` \| `'both'` |
| `tier` | Client-side | For filtering premium/featured |

**Sort order:** Featured listings always sort first (`tier = 'featured'`), then alphabetically by name. Featured rotation on island homepages is driven by `featured_slots`.

**Where filtering lives:**
- `src/hooks/usePractitioners.ts` — Supabase-level filters for practitioners
- `src/hooks/useCenters.ts` — same for centers
- `src/pages/Directory.tsx` — combines both, applies client-side sort/filter UI

---

## Island → Cities Mapping

Defined in `DashboardProfile.tsx` and `AdminPanel.tsx`. Default island is `'big_island'` — always set explicitly when creating listings.

```
big_island: Kailua-Kona, Hilo, Waimea/Kamuela, Pahoa, Captain Cook, Keaau,
            Holualoa, Volcano, Waikoloa, Ocean View, Hawi, Kapaau, Honokaa
maui:       Lahaina, Kihei, Wailea, Kahului, Wailuku, Makawao, Paia,
            Haiku, Kula, Pukalani, Napili, Kapalua, Hana
oahu:       Honolulu, Waikiki, Kailua, Kaneohe, Pearl City, Kapolei,
            Haleiwa, Mililani, Hawaii Kai, Manoa, Kaimuki
kauai:      Lihue, Kapaa, Hanalei, Princeville, Poipu, Koloa,
            Hanapepe, Waimea, Kilauea, Kalaheo
```

---

## Canonical Modalities (44 total)

Source of truth: `DashboardProfile.tsx` and `AdminPanel.tsx` (`MODALITIES` / `MODALITIES_LIST` arrays).
Pipeline script `11_gm_classify.py` **must stay in sync** with this list — see `pipeline/CLAUDE.md`.

Acupuncture, Alternative Therapy, Art Therapy, Astrology, Ayurveda,
Birth Doula, Breathwork, Chiropractic, Counseling, Craniosacral,
Dentistry, Energy Healing, Family Constellation, Fitness, Functional Medicine,
Hawaiian Healing, Herbalism, Hypnotherapy, IV Therapy, Life Coaching,
Lomilomi / Hawaiian Healing, Longevity, Massage, Meditation, Midwife,
Nature Therapy, Naturopathic, Nervous System Regulation, Network Chiropractic,
Nutrition, Osteopathic, Physical Therapy, Psychic, Psychotherapy, Reiki,
Ritualist, Somatic Therapy, Soul Guidance, Sound Healing,
TCM (Traditional Chinese Medicine), Trauma-Informed Care,
Watsu / Water Therapy, Women's Health, Yoga
