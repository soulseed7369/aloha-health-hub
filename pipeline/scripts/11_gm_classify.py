"""
11_gm_classify.py
─────────────────
Convert raw Google Maps Place Detail records (gm_raw.jsonl) into
the JSONL schema used by the existing pipeline.

Classifies each place as 'practitioner' or 'center' and maps
Google place types + business name keywords → your modalities list.

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

# ── Island detection from city name ───────────────────────────────────────────
# Build a reverse lookup: lowercase city → island key
_CITY_TO_ISLAND: dict[str, str] = {}
for _island, _towns in ISLAND_TOWN_LISTS.items():
    for _town in _towns:
        _CITY_TO_ISLAND[_town.lower()] = _island
for _town in BIG_ISLAND_TOWNS:
    _CITY_TO_ISLAND[_town.lower()] = "big_island"


def detect_island(city: str, fallback: str) -> str:
    """Return the island key that matches *city*, or *fallback* if unknown."""
    return _CITY_TO_ISLAND.get(city.lower().strip(), fallback)

# ── Your canonical modalities list ────────────────────────────────────────────
MODALITIES = [
    'Acupuncture', 'Alternative Therapy', 'Astrology', 'Ayurveda',
    'Bioenergetics', 'Birth Doula', 'Breathwork', 'Chiropractic', 'Counseling',
    'Craniosacral', 'Dentistry', 'Energy Healing', 'Functional Medicine',
    'Gestalt Therapy', 'Herbalism', 'Hypnotherapy', 'Life Coaching',
    'Luminous Practitioner', 'Massage', 'Meditation', 'Midwife',
    'Nature Therapy', 'Naturopathic', 'Nervous System Regulation', 'Network Chiropractic',
    'Nutrition', 'Osteopathic', 'Physical Therapy',
    'Psychotherapy', 'Reiki', 'Somatic Therapy', 'Soul Guidance',
    'Sound Healing', 'TCM (Traditional Chinese Medicine)',
    'Trauma-Informed Care', 'Watsu / Water Therapy', 'Yoga',
]

# ── Google type → modality mapping ────────────────────────────────────────────
TYPE_TO_MODALITIES: dict[str, list[str]] = {
    "spa":                          ["Massage"],
    "beauty_salon":                 ["Massage"],
    "physiotherapist":              ["Physical Therapy"],
    "gym":                          ["Yoga"],
    "yoga_studio":                  ["Yoga"],
    "chiropractor":                 ["Chiropractic"],
    "dentist":                      ["Dentistry"],
    "doctor":                       [],          # too broad — rely on name
    "health":                       [],
    "natural_feature":              [],
    "point_of_interest":            [],
    "establishment":                [],
}

# ── Name keyword → modality mapping (lowercase) ───────────────────────────────
NAME_KEYWORDS: list[tuple[str, str]] = [
    # keyword            modality
    ("acupunct",         "Acupuncture"),
    ("acupressure",      "Acupuncture"),
    ("tcm",              "TCM (Traditional Chinese Medicine)"),
    ("chinese medicine", "TCM (Traditional Chinese Medicine)"),
    ("ayurved",          "Ayurveda"),
    ("massage",          "Massage"),
    ("lomi",             "Massage"),
    ("lomilomi",         "Massage"),
    ("rolfing",          "Somatic Therapy"),
    ("reiki",            "Reiki"),
    ("sound heal",       "Sound Healing"),
    ("sound bath",       "Sound Healing"),
    ("breathwork",       "Breathwork"),
    ("breath work",      "Breathwork"),
    ("yoga",             "Yoga"),
    ("pilates",          "Yoga"),
    ("meditation",       "Meditation"),
    ("mindfulness",      "Meditation"),
    ("chiropractic",     "Chiropractic"),
    ("chiropract",       "Chiropractic"),
    ("network chiro",    "Network Chiropractic"),
    ("naturopath",       "Naturopathic"),
    ("functional med",   "Functional Medicine"),
    ("integrative med",  "Functional Medicine"),
    ("nutrition",        "Nutrition"),
    ("nutritionist",     "Nutrition"),
    ("dietitian",        "Nutrition"),
    ("osteopath",        "Osteopathic"),
    ("physical therapy", "Physical Therapy"),
    ("physiotherap",     "Physical Therapy"),
    ("craniosacral",     "Craniosacral"),
    ("somatic",          "Somatic Therapy"),
    ("trauma",           "Trauma-Informed Care"),
    ("psychotherap",     "Psychotherapy"),
    ("counseling",       "Counseling"),
    ("counsellor",       "Counseling"),
    ("therapist",        "Counseling"),
    ("life coach",       "Life Coaching"),
    ("wellness coach",   "Life Coaching"),
    ("health coach",     "Life Coaching"),
    ("hypno",            "Hypnotherapy"),
    ("energy heal",      "Energy Healing"),
    ("energy work",      "Energy Healing"),
    ("herbali",          "Herbalism"),
    ("herb ",            "Herbalism"),
    ("doula",            "Birth Doula"),
    ("midwife",          "Midwife"),
    ("midwifer",         "Midwife"),
    ("watsu",            "Watsu / Water Therapy"),
    ("astrology",        "Astrology"),
    ("bioenergetic",     "Bioenergetics"),
    ("nervous system",   "Nervous System Regulation"),
    ("gestalt",          "Gestalt Therapy"),
    ("dental",           "Dentistry"),
    ("dentist",          "Dentistry"),
    ("spa",              "Massage"),
]

# ── Place types that indicate a CENTER (multi-practitioner venue) ─────────────
CENTER_TYPES = {
    "spa", "gym", "yoga_studio", "health",
    "wellness_center",  # not an official GM type but we check anyway
}

# ── Place types that almost always mean an individual practitioner ─────────────
PRACTITIONER_TYPES = {
    "physiotherapist", "chiropractor", "dentist", "doctor",
}

CENTER_NAME_KEYWORDS = [
    "center", "centre", "studio", "clinic", "spa", "wellness",
    "institute", "school", "collective", "sanctuary", "retreat",
    "holistic", "integrative", "associates",
]


def infer_modalities(name: str, types: list[str]) -> list[str]:
    found = set()
    name_lower = name.lower()

    # From name keywords
    for kw, modality in NAME_KEYWORDS:
        if kw in name_lower:
            found.add(modality)

    # From Google types
    for t in types:
        for m in TYPE_TO_MODALITIES.get(t, []):
            found.add(m)

    # Validate against canonical list
    valid = [m for m in MODALITIES if m in found]
    return valid if valid else ["Alternative Therapy"]


def classify_type(name: str, types: list[str]) -> str:
    """Return 'center' or 'practitioner'."""
    for t in types:
        if t in CENTER_TYPES:
            return "center"
    for t in types:
        if t in PRACTITIONER_TYPES:
            return "practitioner"
    name_lower = name.lower()
    for kw in CENTER_NAME_KEYWORDS:
        if kw in name_lower:
            return "center"
    return "practitioner"


def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("1") and len(digits) == 11:
        digits = digits[1:]
    return digits if len(digits) == 10 else raw


def extract_city_from_address(address: str) -> str:
    """Best-effort city from formatted_address like '123 Main St, Kailua-Kona, HI 96740'."""
    parts = [p.strip() for p in address.split(",")]
    if len(parts) >= 2:
        return parts[-2]  # second-to-last is usually the city
    return ""


def convert(raw: dict) -> dict:
    name    = raw.get("name", "").strip()
    types   = raw.get("types", [])
    address = raw.get("formatted_address", "")
    island  = raw.get("island", "big_island")

    city = raw.get("_city") or extract_city_from_address(address)

    # Correct island based on actual city — don't blindly trust the search island
    island = detect_island(city, island)

    phone = normalize_phone(
        raw.get("formatted_phone_number") or raw.get("international_phone_number")
    )
    website = raw.get("website") or ""
    lat = raw.get("geometry", {}).get("location", {}).get("lat", 0)
    lng = raw.get("geometry", {}).get("location", {}).get("lng", 0)

    # Summary / bio from Google editorial if present
    bio = (raw.get("editorial_summary") or {}).get("overview") or None

    modalities    = infer_modalities(name, types)
    listing_type  = classify_type(name, types)

    # Business status filter — skip permanently closed places
    if raw.get("business_status") == "PERMANENTLY_CLOSED":
        return None

    return {
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
        "confidence":           0.8,
        "image_candidates":     [],
        "local_image_path":     None,
        # Extra fields for dedup / review
        "_listing_type":        listing_type,
        "_place_id":            raw.get("place_id"),
        "_google_types":        types,
        "_rating":              raw.get("rating"),
        "_rating_count":        raw.get("user_ratings_total", 0),
        "_source_query":        raw.get("source_query", ""),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-ratings", type=int, default=0,
                        help="Skip places with fewer than N Google reviews")
    args = parser.parse_args()

    raw_path = OUTPUT_DIR / "gm_raw.jsonl"
    out_path = OUTPUT_DIR / "gm_classified.jsonl"

    if not raw_path.exists():
        print(f"Error: {raw_path} not found. Run 10_gm_details.py first.")
        sys.exit(1)

    practitioners = []
    centers       = []
    skipped       = 0

    with open(raw_path) as f:
        for line in f:
            raw = json.loads(line)
            rec = convert(raw)
            if rec is None:
                skipped += 1
                continue
            if (rec.get("_rating_count") or 0) < args.min_ratings:
                skipped += 1
                continue

            if rec["_listing_type"] == "center":
                centers.append(rec)
            else:
                practitioners.append(rec)

    with open(out_path, "w") as f:
        for rec in practitioners + centers:
            f.write(json.dumps(rec) + "\n")

    print(f"✓ Classified {len(practitioners)} practitioners + {len(centers)} centers")
    print(f"  Skipped {skipped} (permanently closed or below min-ratings)")
    print(f"  Output → {out_path}")
