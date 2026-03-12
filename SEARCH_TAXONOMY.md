# Aloha Health Hub — Search Taxonomy & Architecture

*Context for reviewing and improving the site's search/filter system.*
*Site: hawaiiwellness.net — a wellness directory for the Hawaiian islands.*

---

## What the directory contains

Two listing types, each with its own tab in the directory:
- **Practitioners** — individual wellness providers (massage therapists, acupuncturists, coaches, etc.)
- **Centers** — wellness businesses (spas, yoga studios, clinics, retreat centers)

Each listing has: name, bio/description, modalities (array), city, island, session type (in-person / online / both), tier (free / premium / featured), and whether they're accepting new clients.

---

## How search works today (technical overview)

### Entry points
Search can be triggered from:
1. The **homepage search bar** — user types a query + location, gets routed to `/directory?q=...&location=...&island=...`
2. The **directory page** — live search box + filter dropdowns

### Island detection
Island is determined in this priority order:
1. Explicit `?island=` URL param (always wins)
2. Auto-detected from the query/location text via keyword matching:
   - "big island" → `big_island`
   - "oahu" → `oahu`
   - "maui" → `maui`
   - "kauai" → `kauai`
   - "molokai" → `molokai`
3. Town name lookup — each known town is mapped to its island (see Town → Island map below)

Once an island is identified, only listings from that island are fetched from the database (server-side filter).

### Filter pipeline (client-side, applied after DB fetch)

1. **City filter** — filters by city string match. *Exception: premium and featured listings bypass the city filter* — they appear island-wide for any matching modality (islands are small enough that this makes sense for high-visibility listings).
2. **Free-text search** — runs `filterProviders` / `filterCenters`, which:
   - Expands the query via the synonym map (see below)
   - Appends synonym expansions to the listing's match target
   - Matches each query token against: `name + modalities + city` (bio is explicitly excluded to prevent false positives)
   - Uses a light stemmer for fuzzy matching (e.g. "coach" matches "coaching")
3. **Modality dropdown** — hard match against the listing's modalities array
4. **Session type filter** — in-person / online / both
5. **Accepting clients filter** — boolean flag

### Sort order
`featured → premium → free`, then alphabetical by name within each tier.

---

## Canonical modality list (36 modalities)

These are the official modalities stored in the `modalities text[]` column and shown in filter dropdowns:

```
Acupuncture
Alternative Therapy
Art Therapy
Astrology
Ayurveda
Birth Doula
Breathwork
Chiropractic
Counseling
Craniosacral
Dentistry
Energy Healing
Family Constellation
Functional Medicine
Hawaiian Healing
Herbalism
Hypnotherapy
IV Therapy
Life Coaching
Lomilomi / Hawaiian Healing
Longevity
Massage
Meditation
Midwife
Nature Therapy
Naturopathic
Nervous System Regulation
Network Chiropractic
Nutrition
Osteopathic
Physical Therapy
Psychic
Psychotherapy
Reiki
Ritualist
Somatic Therapy
Soul Guidance
Sound Healing
TCM (Traditional Chinese Medicine)
Trauma-Informed Care
Watsu / Water Therapy
Yoga
```

---

## Synonym / semantic expansion map

When a user types a query, it is run against this map. Any matching phrases append their canonical modality names to the search target. The original query is preserved so location/name tokens still work.

**Example:** User types "soul guide kona" → expands to "soul guide kona soul guidance" → listings with `Soul Guidance` modality now match.

### Soul / Spiritual
| User types | Maps to |
|---|---|
| soul retrieval | soul guidance |
| soul work | soul guidance |
| soul healing | soul guidance |
| soul guide | soul guidance |
| soul coach | soul guidance |
| spirit | soul guidance |
| spiritual | soul guidance, energy healing |
| sacred | soul guidance, energy healing, ritualist |
| ceremony | ritualist, soul guidance |
| ritual | ritualist, soul guidance |
| medicine woman | ritualist, hawaiian healing, soul guidance |
| medicine man | ritualist, hawaiian healing, soul guidance |
| akashic | soul guidance |
| channeling / channelling | soul guidance, psychic |

### Shamanic / Ritualist
| User types | Maps to |
|---|---|
| shamanic / shaman / shamanism | soul guidance, energy healing, ritualist |
| curandera / curandero | ritualist, hawaiian healing, herbalism |
| medicine wheel | ritualist, soul guidance |

### Hawaiian Healing
| User types | Maps to |
|---|---|
| lomi / lomilomi | lomilomi, hawaiian healing, massage |
| hawaiian massage | lomilomi, hawaiian healing, massage |
| hawaiian healing | hawaiian healing, lomilomi |
| ho oponopono / ho'oponopono | hawaiian healing, soul guidance |
| huna | hawaiian healing, soul guidance, energy healing |
| kahuna | hawaiian healing, ritualist |
| aloha spirit | hawaiian healing |
| indigenous healing | hawaiian healing, ritualist |

### Energy Healing
| User types | Maps to |
|---|---|
| energy work / energy heal | energy healing |
| energy healer | energy healing, reiki |
| energy medicine | energy healing |
| biofield / quantum / quantum healing | energy healing |
| pranic / prana | energy healing, breathwork, yoga |
| matrix | energy healing |
| aura | energy healing, reiki |
| chakra | energy healing, reiki, yoga |
| hands on healing / healing touch | energy healing, reiki |
| reiki master | reiki |

### Bodywork / Massage
| User types | Maps to |
|---|---|
| bodywork / body work | massage |
| deep tissue / swedish massage / therapeutic massage / sports massage | massage |
| hot stone / trigger point / neuromuscular | massage |
| myofascial | massage, somatic therapy |
| lymphatic / lymph | massage |

### Craniosacral
| User types | Maps to |
|---|---|
| cranio sacral / cranio / cst | craniosacral |
| biodynamic | craniosacral |

### Water Therapy
| User types | Maps to |
|---|---|
| water therapy / watsu / aquatic / water healing | watsu, water therapy |

### Sound Healing
| User types | Maps to |
|---|---|
| sound bath / sound heal | sound healing |
| gong bath / singing bowl / tuning fork / tibetan bowl | sound healing |
| vibrational | sound healing |
| frequency | sound healing, energy healing |

### Nervous System / Somatic / Trauma
| User types | Maps to |
|---|---|
| nervous system | nervous system regulation, somatic therapy |
| somatic / soma | somatic therapy, nervous system regulation |
| regulation / dysregulation / polyvagal | nervous system regulation, somatic therapy |
| trauma | trauma-informed care |
| emdr | trauma-informed care, psychotherapy, counseling |
| ptsd | trauma-informed care, psychotherapy |
| inner child | psychotherapy, counseling, somatic therapy |
| shadow work | psychotherapy, counseling, soul guidance |

### Mental Health / Therapy
| User types | Maps to |
|---|---|
| therapist / therapy | psychotherapy, counseling, somatic therapy |
| psychologist / talk therapy | psychotherapy, counseling |
| grief | counseling, psychotherapy |
| anxiety | counseling, psychotherapy, nervous system regulation |
| depression / marriage / couples / addiction | counseling, psychotherapy |
| family therapy | counseling, psychotherapy, family constellation |
| relationship | counseling, psychotherapy |
| eating disorder | counseling, psychotherapy, nutrition |

### Life Coaching
| User types | Maps to |
|---|---|
| life coach / coach / coaching | life coaching |
| guide / guidance | life coaching, soul guidance |
| mentor / mindset | life coaching |
| executive coach / business coach / wellness coach | life coaching |
| transformation | life coaching, soul guidance |

### Chiropractic
| User types | Maps to |
|---|---|
| chiropractor / chiro | chiropractic |
| spinal / adjustment | chiropractic |
| network / nse | network chiropractic |

### Acupuncture / TCM
| User types | Maps to |
|---|---|
| acupuncturist | acupuncture |
| chinese medicine / oriental medicine / tcm | tcm, traditional chinese medicine, acupuncture |
| cupping / moxibustion | tcm, acupuncture |
| herbs | herbalism, tcm |

### Naturopathic / Functional / Longevity
| User types | Maps to |
|---|---|
| naturopath | naturopathic |
| functional medicine / integrative medicine / holistic doctor / holistic medicine | functional medicine, naturopathic |
| regenerative medicine | longevity, functional medicine |
| biohack / biohacking | longevity, functional medicine |
| anti-aging / longevity | longevity, functional medicine |

### Nutrition
| User types | Maps to |
|---|---|
| nutritionist / nutritional / dietitian / diet | nutrition |
| gut health | nutrition, functional medicine |
| weight loss | nutrition, life coaching |

### Herbalism / Plant Medicine
| User types | Maps to |
|---|---|
| herbalist / botanical / apothecary | herbalism |
| plant medicine | herbalism, naturopathic, ayurveda, ritualist |
| flower essence | herbalism, energy healing |

### Ayurveda
| User types | Maps to |
|---|---|
| ayurvedic / panchakarma / dosha | ayurveda |

### Yoga / Breathwork
| User types | Maps to |
|---|---|
| pranayama | breathwork, yoga |
| breath work / wim hof | breathwork |
| yoga teacher / yogi / vinyasa / hatha / yin yoga / kundalini | yoga |

### Meditation
| User types | Maps to |
|---|---|
| mindfulness / guided meditation / zen / stillness | meditation |

### Hypnotherapy
| User types | Maps to |
|---|---|
| hypnosis / hypnotist | hypnotherapy |
| nlp | hypnotherapy, life coaching |

### Birth / Women's Health
| User types | Maps to |
|---|---|
| doula | birth doula |
| birth support | birth doula, midwife |
| midwifery / prenatal | birth doula, midwife |
| postpartum | birth doula |
| fertility | birth doula, midwife, naturopathic |
| womens health / women's health | birth doula, midwife, naturopathic |

### Astrology / Psychic
| User types | Maps to |
|---|---|
| astrologer / birth chart | astrology |
| psychic reading | psychic |
| tarot / oracle | psychic, soul guidance, ritualist |
| intuitive | psychic, soul guidance, energy healing |
| medium / clairvoyant | psychic |
| numerology | astrology, psychic |
| human design | astrology, soul guidance |
| gene keys | soul guidance |

### Physical Therapy / Osteopathic
| User types | Maps to |
|---|---|
| physical therapist / rehab / rehabilitation | physical therapy |
| sports injury | physical therapy, chiropractic |
| osteopath / osteopathy | osteopathic |

### Nature Therapy
| User types | Maps to |
|---|---|
| nature / forest bathing / ecotherapy | nature therapy |

### Misc
| User types | Maps to |
|---|---|
| art therapy | art therapy |
| family constellation | family constellation |
| iv drip | iv therapy |
| dental / dentist | dentistry |

---

## Location taxonomy

### Islands
```
big_island   (Hawai'i Island)
maui
oahu
kauai
molokai
```

### Town → Island mapping

**Big Island:**
Hilo, Kailua-Kona (also: "kona"), Waimea, Captain Cook, Pahoa, Holualoa, Hawi, Honokaa, Volcano, Waikoloa, Keaau, Ocean View, Kapaau, Kamuela, Naalehu, Milolii

**Maui:**
Lahaina, Kihei, Wailea, Kahului, Wailuku, Makawao, Paia, Haiku, Kula, Pukalani, Napili, Kapalua, Hana, Upcountry

**Oahu:**
Honolulu, Waikiki, Kailua, Kaneohe, Pearl City, Kapolei, Haleiwa, Mililani, Hawaii Kai, Manoa, Kaimuki, Ewa Beach, Aiea, Downtown Honolulu

**Kauai:**
Lihue, Kapaa, Hanalei, Princeville, Poipu, Koloa, Hanapepe, Kilauea, Kalaheo, Waimea (Kauai), Kekaha

**Molokai:**
Kaunakakai

### Known collision
`Waimea` exists on both Big Island and Kauai. The town-to-island map uses Big Island's Waimea; Kauai's Waimea is represented in the code as `'waimea (kauai)'` to avoid the collision.

---

## Current limitations and known gaps

### Search architecture limitations

1. **Client-side only** — all filtering happens in the browser after fetching the full island's listings. No server-side full-text search (no Postgres `tsvector`, no Algolia, no embedding-based semantic search). This means:
   - Search quality degrades as listing count grows
   - No relevance ranking — it's include/exclude, not scored
   - No typo tolerance (mistype "acupuncure" and get zero results)

2. **Stemmer is minimal** — a hand-rolled suffix-stripping function. It handles common endings (`-ing`, `-er`, `-ist`, `-tion`) but misses:
   - Irregular plurals
   - `-ance` / `-ence` endings (e.g. "guide" vs "guidance" required an explicit synonym entry)
   - Compound words

3. **No partial/fuzzy matching** — if the user misspells anything, nothing matches. No edit-distance / Levenshtein tolerance.

4. **Synonym map is flat** — one level deep; no hierarchical or ontology-based structure. Adding a new spiritual modality requires manual addition to multiple places.

5. **Bio is excluded from search** — intentional (prevents false positives like a massage therapist mentioning "soul" in their bio), but means practitioners who describe their work in narrative bios aren't discoverable by those terms.

6. **Single search bar, no structured input** — users type everything into one box. "massage waimea" and "waimea massage" both work, but structured faceted search (pick island → pick modality → refine) only exists as separate dropdowns, not integrated with the free-text box.

7. **Modality dropdown is exhaustive** — 36 modalities in the dropdown is a lot. No grouping, no hierarchy.

### Data quality issues affecting search

- ~40% of listings have no modalities set (they return for any search but don't rank for specific modality searches)
- Many listings have only one modality listed even when they offer more
- City is inconsistently populated (affects city filter)

---

## What would make search better (areas to explore)

- **Server-side full-text search** using Postgres `tsvector` / `ts_rank` with weighted columns (name > modalities > bio) — would handle relevance ranking and stemming natively
- **Semantic / embedding search** — embed modality descriptions + listing content, use cosine similarity for "what's most like what I'm describing"
- **Typo tolerance** — trigram similarity (`pg_trgm`) or a dedicated search service (Algolia, Typesense)
- **Faceted/structured search UI** — let users select intent (e.g. "I want to heal from trauma") and get back pre-filtered results, rather than typing free text
- **Auto-suggest / autocomplete** — suggest canonical modality names as the user types
- **Intent-based landing pages** — e.g. `/big-island/trauma-healing` that pre-sets filters rather than relying on search
- **Relevance scoring** — featured/premium already sort first; could add match quality scoring (exact modality match > synonym match > name match)
- **Better modality UX** — group the 36 modalities into categories (Body, Mind, Spirit, Medical, Birth) for easier browsing
