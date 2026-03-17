"""
11_gm_classify.py
─────────────────
Convert raw Google Maps Place Detail records (gm_raw.jsonl) into the JSONL
schema used by the existing pipeline.

New in this version:
  - Confidence scoring per field (modality, type, bio) stored in _confidence
  - Bio extracted from editorial summary with fallback to type-based stub
  - _review_flags list highlights fields admins should check
  - _bio_source indicates where the bio came from

Output:
    pipeline/output/gm_classified.jsonl

Usage:
    cd pipeline
    python scripts/11_gm_classify.py [--min-ratings 0]
"""

from __future__ import annotations
import sys, json, re, argparse
from pathlib import Path

sys.path.insert(0, '.')
from src.config import OUTPUT_DIR, BIG_ISLAND_TOWNS, ISLAND_TOWN_LISTS

# ── Island detection ───────────────────────────────────────────────────────────
_CITY_TO_ISLAND: dict[str, str] = {}
for _island, _towns in ISLAND_TOWN_LISTS.items():
    for _town in _towns:
        _CITY_TO_ISLAND[_town.lower()] = _island
for _town in BIG_ISLAND_TOWNS:
    _CITY_TO_ISLAND[_town.lower()] = "big_island"


def detect_island(city: str, fallback: str) -> str:
    return _CITY_TO_ISLAND.get(city.lower().strip(), fallback)


# ── Canonical modalities (keep in sync with DashboardProfile.tsx / AdminPanel.tsx) ──
MODALITIES = [
    'Acupuncture', 'Alternative Therapy', 'Art Therapy', 'Astrology', 'Ayurveda',
    'Birth Doula', 'Breathwork', 'Chiropractic', 'Counseling',
    'Craniosacral', 'Dentistry', 'Energy Healing', 'Family Constellation',
    'Fitness', 'Functional Medicine', 'Hawaiian Healing', 'Herbalism', 'Hypnotherapy',
    'IV Therapy', 'Life Coaching', 'Lomilomi / Hawaiian Healing', 'Longevity',
    'Massage', 'Meditation', 'Midwife', 'Nature Therapy', 'Naturopathic',
    'Nervous System Regulation', 'Network Chiropractic', 'Nutrition',
    'Osteopathic', 'Physical Therapy', 'Psychic', 'Psychotherapy', 'Reiki',
    'Ritualist', 'Somatic Therapy', 'Soul Guidance', 'Sound Healing',
    'TCM (Traditional Chinese Medicine)', 'Trauma-Informed Care',
    'Watsu / Water Therapy', "Women's Health", 'Yoga',
]

TYPE_TO_MODALITIES: dict[str, list[str]] = {
    "spa":            ["Massage"],
    "beauty_salon":   ["Massage"],
    "physiotherapist":["Physical Therapy"],
    "gym":            ["Fitness"],
    "yoga_studio":    ["Yoga"],
    "chiropractor":   ["Chiropractic"],
    "dentist":        ["Dentistry"],
    "doctor":         [],
    "health":         [],
    "point_of_interest": [],
    "establishment":  [],
}

NAME_KEYWORDS: list[tuple[str, str]] = [
    # Acupuncture & TCM
    ("acupunct",         "Acupuncture"),
    ("acupressure",      "Acupuncture"),
    ("tcm",              "TCM (Traditional Chinese Medicine)"),
    ("chinese medicine", "TCM (Traditional Chinese Medicine)"),
    ("traditional chinese", "TCM (Traditional Chinese Medicine)"),

    # Ayurveda
    ("ayurved",          "Ayurveda"),
    ("vaidya",           "Ayurveda"),

    # Massage (including variants & specialized)
    ("massage",          "Massage"),
    ("lomi",             "Massage"),
    ("rolfing",          "Massage"),
    ("structural integration", "Massage"),
    ("myofascial",       "Massage"),
    ("trigger point",    "Massage"),
    ("thai massage",     "Massage"),
    ("swedish massage",  "Massage"),
    ("deep tissue",      "Massage"),
    ("sports massage",   "Massage"),
    ("prenatal massage", "Massage"),
    ("postnatal massage", "Massage"),
    ("spa",              "Massage"),

    # Lomilomi / Hawaiian Healing (distinct from regular massage)
    ("lomilomi",         "Lomilomi / Hawaiian Healing"),
    ("kahuna",           "Lomilomi / Hawaiian Healing"),
    ("la'au lapa'au",    "Hawaiian Healing"),
    ("ho'oponopono",     "Hawaiian Healing"),
    ("traditional hawaiian", "Hawaiian Healing"),

    # Reiki
    ("reiki",            "Reiki"),

    # Sound Healing
    ("sound heal",       "Sound Healing"),
    ("sound bath",       "Sound Healing"),
    ("singing bowl",     "Sound Healing"),

    # Breathwork
    ("breathwork",       "Breathwork"),
    ("breath work",      "Breathwork"),
    ("pranayama",        "Breathwork"),

    # Yoga
    ("yoga",             "Yoga"),
    ("pilates",          "Yoga"),

    # Fitness
    ("fitness",          "Fitness"),
    ("personal train",   "Fitness"),
    ("personal trainer", "Fitness"),
    ("crossfit",         "Fitness"),
    ("bootcamp",         "Fitness"),
    ("boot camp",        "Fitness"),
    ("strength coach",   "Fitness"),
    ("strength train",   "Fitness"),
    ("hiit",             "Fitness"),
    ("functional fitness", "Fitness"),
    ("athletic training", "Fitness"),
    ("gym",              "Fitness"),

    # Meditation
    ("meditation",       "Meditation"),
    ("mindfulness",      "Meditation"),

    # Chiropractic & Network Chiropractic
    ("chiropractic",     "Chiropractic"),
    ("chiropract",       "Chiropractic"),
    ("network chiro",    "Network Chiropractic"),
    ("network spinal",   "Network Chiropractic"),
    ("nse",              "Network Chiropractic"),

    # Naturopathic & Functional Medicine
    ("naturopath",       "Naturopathic"),
    ("functional med",   "Functional Medicine"),
    ("integrative med",  "Functional Medicine"),
    ("integrative medicine", "Functional Medicine"),

    # Nutrition
    ("nutrition",        "Nutrition"),
    ("nutritionist",     "Nutrition"),
    ("dietitian",        "Nutrition"),
    ("nutritional",      "Nutrition"),

    # Osteopathic
    ("osteopath",        "Osteopathic"),
    ("osteopathic",      "Osteopathic"),

    # Physical Therapy
    ("physical therapy", "Physical Therapy"),
    ("physiotherap",     "Physical Therapy"),
    ("pt clinic",        "Physical Therapy"),

    # Craniosacral
    ("craniosacral",     "Craniosacral"),
    ("cranial sacral",   "Craniosacral"),
    ("craniosacralpractitioner", "Craniosacral"),

    # Somatic Therapy
    ("somatic",          "Somatic Therapy"),
    ("somatic therapy",  "Somatic Therapy"),
    ("somatic experiencing", "Somatic Therapy"),

    # Trauma-Informed Care
    ("trauma",           "Trauma-Informed Care"),
    ("emdr",             "Trauma-Informed Care"),
    ("trauma-informed",  "Trauma-Informed Care"),
    ("se practitioner",  "Trauma-Informed Care"),
    ("trauma recovery",  "Trauma-Informed Care"),

    # Psychotherapy & Counseling
    ("psychotherap",     "Psychotherapy"),
    ("counseling",       "Counseling"),
    ("counsellor",       "Counseling"),
    ("therapist",        "Counseling"),

    # Life Coaching
    ("life coach",       "Life Coaching"),
    ("wellness coach",   "Life Coaching"),
    ("health coach",     "Life Coaching"),

    # Hypnotherapy
    ("hypno",            "Hypnotherapy"),
    ("hypnotherap",      "Hypnotherapy"),

    # Energy Healing
    ("energy heal",      "Energy Healing"),
    ("energy work",      "Energy Healing"),
    ("biofield",         "Energy Healing"),

    # Herbalism
    ("herbali",          "Herbalism"),
    ("herbal ",          "Herbalism"),
    ("botanical",        "Herbalism"),

    # Birth Doula & Midwife
    ("doula",            "Birth Doula"),
    ("birth doula",      "Birth Doula"),
    ("midwife",          "Midwife"),
    ("midwifer",         "Midwife"),
    ("cnm",              "Midwife"),
    ("midwifery",        "Midwife"),

    # Watsu / Water Therapy
    ("watsu",            "Watsu / Water Therapy"),
    ("water therapy",    "Watsu / Water Therapy"),
    ("aquatic therapy",  "Watsu / Water Therapy"),
    ("hydrotherapy",     "Watsu / Water Therapy"),

    # Astrology
    ("astrology",        "Astrology"),
    ("astrologer",       "Astrology"),
    ("birth chart",      "Astrology"),
    ("natal chart",      "Astrology"),

    # Nervous System Regulation
    ("nervous system",   "Nervous System Regulation"),
    ("polyvagal",        "Nervous System Regulation"),
    ("polyvagal theory", "Nervous System Regulation"),

    # Psychic & Intuitive
    ("psychic",          "Psychic"),
    ("medium",           "Psychic"),
    ("clairvoyant",      "Psychic"),
    ("intuitive healer", "Psychic"),
    ("tarot",            "Psychic"),

    # Soul Guidance
    ("soul guid",        "Soul Guidance"),
    ("akashic",          "Soul Guidance"),
    ("past life",        "Soul Guidance"),
    ("soul coach",       "Soul Guidance"),
    ("soul reading",     "Soul Guidance"),
    ("spiritual guidance", "Soul Guidance"),

    # Ritualist & Ceremony
    ("ritualist",        "Ritualist"),
    ("ceremony",         "Ritualist"),
    ("ceremonial",       "Ritualist"),
    ("plant medicine",   "Ritualist"),
    ("cacao ceremony",   "Ritualist"),
    ("sacred ceremony",  "Ritualist"),
    ("shaman",           "Ritualist"),
    ("shamanic",         "Ritualist"),

    # Family Constellation
    ("family constellation", "Family Constellation"),
    ("constellation work", "Family Constellation"),
    ("systemic constellation", "Family Constellation"),
    ("constellation therapy", "Family Constellation"),

    # Nature Therapy
    ("nature therapy",   "Nature Therapy"),
    ("ecotherapy",       "Nature Therapy"),
    ("forest bath",      "Nature Therapy"),
    ("wilderness therapy", "Nature Therapy"),
    ("equine therapy",   "Nature Therapy"),
    ("equine",           "Nature Therapy"),

    # Art Therapy
    ("art therapy",      "Art Therapy"),
    ("art therapist",    "Art Therapy"),
    ("expressive art",   "Art Therapy"),
    ("creative therapy", "Art Therapy"),
    ("dance therapy",    "Art Therapy"),
    ("movement therapy", "Art Therapy"),

    # Longevity & Anti-Aging
    ("longevity",        "Longevity"),
    ("anti-aging",       "Longevity"),
    ("anti aging",       "Longevity"),
    ("biohacking",       "Longevity"),
    ("longevity medicine", "Longevity"),
    ("longevity coach",  "Longevity"),

    # IV Therapy & Infusions
    ("iv therapy",       "IV Therapy"),
    ("iv drip",          "IV Therapy"),
    ("vitamin drip",     "IV Therapy"),
    ("infusion therapy", "IV Therapy"),
    ("nad therapy",      "IV Therapy"),
    ("nad+",             "IV Therapy"),
    ("peptide therapy",  "IV Therapy"),
    ("ozone therapy",    "IV Therapy"),
    ("hyperbaric",       "IV Therapy"),

    # Women's Health
    ("women's health",   "Women's Health"),
    ("womens health",    "Women's Health"),
    ("pelvic floor",     "Women's Health"),
    ("pelvic health",    "Women's Health"),
    ("prenatal",         "Women's Health"),
    ("postpartum",       "Women's Health"),
    ("postnatal",        "Women's Health"),
    ("fertility",        "Women's Health"),
    ("menopause",        "Women's Health"),

    # Dentistry
    ("dental",           "Dentistry"),
    ("dentist",          "Dentistry"),
    ("holistic dentist", "Dentistry"),
    ("biological dentist", "Dentistry"),
    ("integrative dentist", "Dentistry"),
]

# ── Exclusion filters (learned from Big Island audit 2026-03-15) ──────────────
# These Google types indicate non-wellness businesses that should never be ingested
EXCLUDED_GOOGLE_TYPES = {
    "hospital", "emergency_room", "fire_station", "police",
    "pharmacy", "drugstore",
    "veterinary_care", "pet_store",
    "grocery_or_supermarket", "supermarket", "convenience_store",
    "restaurant", "cafe", "bakery", "bar", "meal_delivery", "meal_takeaway",
    "hair_care", "hair_salon", "barber_shop",
    "real_estate_agency", "insurance_agency", "bank", "atm",
    "car_repair", "car_dealer", "gas_station",
    "school", "university", "library", "museum",
    "church", "synagogue", "mosque", "hindu_temple",
    "funeral_home", "cemetery",
    "post_office", "courthouse", "city_hall",
    "laundry", "locksmith", "storage",
}

# Name patterns that indicate non-wellness businesses (case-insensitive)
EXCLUDED_NAME_PATTERNS = [
    r'\bhospital\b',
    r'\bemergency\s*(room|department|services)\b',
    r'\bfamily\s*medicine\b',
    r'\bfamily\s*practice\b',
    r'\bprimary\s*care\b',
    r'\bpediatric(s|ian)?\b',
    r'\bdermatolog',
    r'\bcardiolog',
    r'\borthop(a?ed)',
    r'\burology\b',
    r'\bgastroenterolog',
    r'\boncolog',
    r'\bophthalmolog',
    r'\bradiology\b',
    r'\bpathology\b',
    r'\b(oral\s*)?surgery\b',
    r'\bsurgeon\b',
    r'\bsurgical\b',
    r'\bpharmac',
    r'\bveterinar',
    r'\banimal\s*(hospital|clinic)\b',
    r'\bcommunity\s*center\b',
    r'\bsenior\s*center\b',
    r'\bYMCA\b',
    r'\bgrocery\b',
    r'\bsupermarket\b',
    r'\bhealth\s*food\s*store\b',
    r'\bnail\s*(salon|bar)\b',
    r'\bbeauty\s*(salon|shop)\b',
    r'\bhair\s*salon\b',
    r'\bbarber\s*shop\b',
    r'\btanning\s*(salon|bed)\b',
    r'\binsurance\b',
    r'\binternal\s*medicine\b',
    r'\bmedical\s*(group|associates|office)\b',
    r'\brehabilitation\s*hospital\b',
]


def should_exclude(name: str, types: list[str]) -> str | None:
    """Return exclusion reason if this listing should be skipped, else None."""
    # Check Google types
    for t in types:
        if t in EXCLUDED_GOOGLE_TYPES:
            return f"excluded_google_type:{t}"

    # Check name patterns
    name_lower = name.lower()
    for pattern in EXCLUDED_NAME_PATTERNS:
        if re.search(pattern, name_lower):
            return f"excluded_name_pattern:{pattern}"

    return None


CENTER_TYPES = {"spa", "gym", "yoga_studio", "health", "wellness_center"}
PRACTITIONER_TYPES = {"physiotherapist", "chiropractor", "dentist", "doctor"}
CENTER_NAME_KEYWORDS = [
    "center", "centre", "studio", "clinic", "spa", "wellness",
    "institute", "school", "collective", "sanctuary", "retreat",
    "holistic", "integrative", "associates", "group", "practice",
    "gym", "fitness", "crossfit",
]

# Credential suffixes that indicate an individual practitioner
CREDENTIAL_SUFFIXES = {
    "LAc", "LMT", "ND", "DC", "PhD", "MD", "RN", "MSW", "LCSW", "LPC",
    "LPCC", "RPT", "LMFT", "PA", "CNM", "CPM", "DPT", "PT", "OTR",
    "DSOM", "DOM", "L.Ac", "C.Ht", "HHP", "INHC", "CHC", "CHN", "MA",
}

# Title prefixes that indicate personal names
TITLE_PREFIXES = {
    "Dr.", "Mr.", "Ms.", "Mrs.", "Miss", "Prof.", "Rev.", "Sr.", "Jr.",
}


# ── Inference ─────────────────────────────────────────────────────────────────

def looks_like_personal_name(name: str) -> bool:
    """
    Return True if name looks like an individual practitioner's personal name.

    Signals:
    - Contains a title prefix (Dr., Ms., etc.)
    - Contains credential suffixes (LAc, ND, MD, etc.)
    - Contains " By " (e.g., "Acupuncture By Sarah West")
    - Contains " | " with name-like parts (e.g., "Ruthie Moss | Acupuncture")
    - Matches pattern: 1–3 capitalized words, no business keywords

    Exclude:
    - Any name containing CENTER_NAME_KEYWORDS
    """
    name_lower = name.lower()

    # Exclude names with business keywords
    if any(kw in name_lower for kw in CENTER_NAME_KEYWORDS):
        return False

    # Check for title prefixes
    for prefix in TITLE_PREFIXES:
        if name.startswith(prefix):
            return True

    # Check for credential suffixes
    for cred in CREDENTIAL_SUFFIXES:
        # Match " LAc", ", ND", etc. at word boundaries
        if re.search(rf'\b{re.escape(cred)}\b', name):
            return True

    # Check for " By " pattern (e.g., "Acupuncture By Sarah West")
    if " by " in name_lower:
        return True

    # Check for " | " pattern (e.g., "Ruthie Moss | Acupuncture in Hilo")
    if " | " in name:
        parts = name.split(" | ")
        # If first part looks like a name (1-3 words, mostly letters), it's personal
        first_part = parts[0].strip()
        words = first_part.split()
        if 1 <= len(words) <= 3 and all(re.match(r"^[A-Za-z\-']+$", w) for w in words):
            return True

    # Simple heuristic: 1-3 capitalized words, no numbers, no business keywords
    words = name.split()
    if 1 <= len(words) <= 3:
        # Check if all words start with capital letter and contain mostly letters
        all_capitalized = all(
            w[0].isupper() and re.match(r"^[A-Za-z\-'.]+$", w) for w in words if w
        )
        if all_capitalized:
            return True

    return False


def infer_modalities(name: str, types: list[str]) -> tuple[list[str], float]:
    """Return (modalities, confidence 0–1)."""
    found = set()
    name_lower = name.lower()
    kw_hits = 0

    for kw, modality in NAME_KEYWORDS:
        if kw in name_lower:
            found.add(modality)
            kw_hits += 1

    for t in types:
        for m in TYPE_TO_MODALITIES.get(t, []):
            found.add(m)

    valid = [m for m in MODALITIES if m in found]

    if not valid:
        valid = ["Alternative Therapy"]
        confidence = 0.25
    elif kw_hits >= 2:
        confidence = 0.95
    elif kw_hits == 1:
        confidence = 0.75
    else:
        # only type-based
        confidence = 0.55

    return valid, confidence


def classify_type(name: str, types: list[str]) -> tuple[str, float]:
    """Return (type, confidence 0–1).

    Priority:
    1. Personal name → ALWAYS practitioner (highest confidence)
    2. Google types + name keywords
    3. Default to practitioner with low confidence
    """
    # ▲ HIGHEST PRIORITY: Personal name detection overrides everything
    if looks_like_personal_name(name):
        return "practitioner", 0.88

    name_lower = name.lower()
    type_match = any(t in CENTER_TYPES for t in types)
    prac_match  = any(t in PRACTITIONER_TYPES for t in types)
    name_match  = any(kw in name_lower for kw in CENTER_NAME_KEYWORDS)

    if type_match and name_match:
        return "center", 0.95
    if type_match:
        return "center", 0.80
    if prac_match:
        return "practitioner", 0.85
    if name_match:
        return "center", 0.70
    return "practitioner", 0.55


def extract_bio(raw: dict, name: str, listing_type: str,
                modalities: list[str]) -> tuple[str | None, str, float]:
    """Return (bio_text, source, confidence)."""
    # Best: Google editorial summary
    editorial = (raw.get("editorial_summary") or {}).get("overview", "").strip()
    if editorial and len(editorial) > 20:
        return editorial, "google_editorial", 0.90

    # No editorial summary — return null so script 22 (website enrichment) can
    # populate bio from the listing's own website instead of a generated stub.
    return None, "none", 0.0


def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("1") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) > 10:
        digits = digits[-10:]  # handle extensions
    return digits if len(digits) == 10 else raw


def extract_city_from_address(address: str) -> str:
    parts = [p.strip() for p in address.split(",")]
    return parts[-2] if len(parts) >= 2 else ""


def build_review_flags(rec: dict, mod_conf: float, type_conf: float,
                       bio_conf: float) -> list[str]:
    flags = []
    if mod_conf < 0.50:
        flags.append("low_modality_confidence")
    if type_conf < 0.65:
        flags.append("uncertain_listing_type")
    if bio_conf < 0.35:
        flags.append("missing_bio")
    if not rec.get("email"):
        flags.append("missing_email")
    if not rec.get("phone"):
        flags.append("missing_phone")
    if not rec.get("website_url"):
        flags.append("missing_website")
    return flags


def convert(raw: dict) -> dict | None:
    name    = raw.get("name", "").strip()
    types   = raw.get("types", [])
    address = raw.get("formatted_address", "")
    island  = raw.get("island", "big_island")

    city   = raw.get("_city") or extract_city_from_address(address)
    island = detect_island(city, island)

    if raw.get("business_status") == "PERMANENTLY_CLOSED":
        return None

    # ── Exclusion filter (learned from Big Island audit) ──────────────────────
    exclusion = should_exclude(name, types)
    if exclusion:
        return None  # silently skip; counted in main loop

    phone   = normalize_phone(
        raw.get("formatted_phone_number") or raw.get("international_phone_number")
    )
    website = raw.get("website") or ""
    lat     = raw.get("geometry", {}).get("location", {}).get("lat", 0)
    lng     = raw.get("geometry", {}).get("location", {}).get("lng", 0)

    modalities, mod_conf   = infer_modalities(name, types)
    listing_type, type_conf = classify_type(name, types)
    bio, bio_source, bio_conf = extract_bio(raw, name, listing_type, modalities)

    overall_confidence = round(
        0.5 * mod_conf + 0.3 * type_conf + 0.2 * bio_conf, 3
    )

    review_flags = build_review_flags(
        {"email": None, "phone": phone, "website_url": website},
        mod_conf, type_conf, bio_conf
    )

    return {
        # ── Core listing fields ──────────────────────────────────────────────
        "name":                 name,
        "phone":                phone,
        "email":                None,
        "address":              address,
        "city":                 city,
        "website_url":          website,
        "bio":                  bio,
        "modalities":           modalities,
        "island":               island,
        "status":               "draft",
        "tier":                 "free",
        "owner_id":             None,
        "external_booking_url": None,
        "accepts_new_clients":  True,
        "lat":                  lat,
        "lng":                  lng,
        # ── Pipeline metadata (prefixed _) ──────────────────────────────────
        "_listing_type":  listing_type,
        "_place_id":      raw.get("place_id"),
        "_google_types":  types,
        "_rating":        raw.get("rating"),
        "_rating_count":  raw.get("user_ratings_total", 0),
        "_source_query":  raw.get("source_query", ""),
        "_bio_source":    bio_source,
        # ── Confidence scores ────────────────────────────────────────────────
        "_confidence": {
            "modality": round(mod_conf, 2),
            "type":     round(type_conf, 2),
            "bio":      round(bio_conf, 2),
            "overall":  overall_confidence,
        },
        "_review_flags":  review_flags,
        # Legacy field kept for backward compat with downstream scripts
        "confidence":     overall_confidence,
        "image_candidates":  [],
        "local_image_path":  None,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-ratings", type=int, default=0)
    args = parser.parse_args()

    raw_path = OUTPUT_DIR / "gm_raw.jsonl"
    out_path = OUTPUT_DIR / "gm_classified.jsonl"

    if not raw_path.exists():
        print(f"Error: {raw_path} not found. Run 10_gm_details.py first.")
        sys.exit(1)

    practitioners, centers, skipped = [], [], 0
    excluded = 0
    low_confidence = 0
    exclusion_reasons: dict[str, int] = {}

    with open(raw_path) as f:
        for line in f:
            raw = json.loads(line)
            name = raw.get("name", "").strip()
            types = raw.get("types", [])

            # Pre-conversion exclusion check (also runs inside convert,
            # but tracking stats here)
            reason = should_exclude(name, types)
            if reason:
                excluded += 1
                exclusion_reasons[reason] = exclusion_reasons.get(reason, 0) + 1

            rec = convert(raw)
            if rec is None:
                skipped += 1
                continue
            if (rec.get("_rating_count") or 0) < args.min_ratings:
                skipped += 1
                continue
            if rec["_confidence"]["overall"] < 0.50:
                low_confidence += 1
            if rec["_listing_type"] == "center":
                centers.append(rec)
            else:
                practitioners.append(rec)

    with open(out_path, "w") as f:
        for rec in practitioners + centers:
            f.write(json.dumps(rec) + "\n")

    total = len(practitioners) + len(centers)
    print(f"✓ Classified {len(practitioners)} practitioners + {len(centers)} centers")
    print(f"  {low_confidence}/{total} records have low overall confidence (<0.50) → flagged for Claude review")
    print(f"  Excluded {excluded} non-wellness listings (hospitals, doctors, salons, etc.)")
    if exclusion_reasons:
        top_reasons = sorted(exclusion_reasons.items(), key=lambda x: -x[1])[:10]
        for reason, count in top_reasons:
            print(f"    {reason}: {count}")
    print(f"  Skipped {skipped - excluded} others (permanently closed or below min-ratings)")
    print(f"  Output → {out_path}")
