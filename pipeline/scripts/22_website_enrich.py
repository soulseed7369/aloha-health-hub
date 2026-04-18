"""
22_website_enrich.py
────────────────────
Crawl existing listing websites to fill in missing fields:
  - email
  - phone
  - bio / description  (up to 100 words, from og:description or page text)
  - photo              (og:image URL stored in avatar_url)
  - modalities         (inferred from page text if array is empty)
  - first_name / last_name  (extracted from About page — NEW)
  - website_platform   (squarespace, wix, wordpress, etc. — NEW)
  - website_score      (0–100 staleness/opportunity score — NEW)
  - no_website_lead    (true if no website at all — NEW)
  - lead_score         (composite 0–100 marketing priority — NEW)
  - enriched_at        (timestamp of last enrichment — NEW)

JSON-LD (Schema.org) is extracted first when available — it's the most
accurate source and avoids regex on messy HTML.

Only touches fields that are currently blank — never overwrites existing data.
Saves results to pipeline/output/website_enrichments.jsonl and optionally
applies them straight to the DB with --apply.

Usage:
    cd pipeline
    python scripts/22_website_enrich.py [--island big_island] [--limit 50]
    python scripts/22_website_enrich.py --apply
    python scripts/22_website_enrich.py --dry-run

    # Run on draft listings only
    python scripts/22_website_enrich.py --island big_island --status draft --apply

    # Run on both published and draft
    python scripts/22_website_enrich.py --island big_island --status all --apply

    # Score leads (all listings, no website filtering)
    python scripts/22_website_enrich.py --island big_island --status all --score-leads --apply

    # Re-score website_score/lead_score for old enrichments (older than N days)
    python scripts/22_website_enrich.py --island big_island --rescore-older-than 180 --apply
"""

from __future__ import annotations
import sys, json, re, time, argparse, datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, '.')
from src.config import OUTPUT_DIR
from src.supabase_client import client

REQUEST_TIMEOUT = 10
CRAWL_DELAY     = 0.5
MAX_BIO_WORDS   = 100
HEADERS = {
    "User-Agent": "HawaiiWellnessBot/1.0 (+https://hawaiiwellness.net)",
    "Accept": "text/html,application/xhtml+xml",
}

# \b at end ensures TLD is followed by a word boundary (space/end-of-string),
# preventing concatenation artifacts like 'liz@example.comsendthank'
# {2,10} covers all real TLDs (.io=2, .museum=6) without runaway matching
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10}\b")

# Domains that are known hosting/platform placeholders — never real practitioner emails
JUNK_EMAIL_DOMAINS = {
    "example.com", "test.com", "sentry.io", "wix.com", "squarespace.com",
    "godaddy.com", "wordpress.com", "weebly.com", "strikingly.com",
    "mailinator.com", "trashmail.com",
}

# Local-part prefixes/patterns that indicate placeholder or system emails
JUNK_LOCAL_RE = re.compile(
    r"^(filler|noreply|no-reply|donotreply|do-not-reply|placeholder|dummy|"
    r"test|info@|support|webmaster|postmaster|admin|hello|contact|privacy|"
    r"legal|abuse|dmca)$",
    re.IGNORECASE
)

def is_junk_email(addr: str) -> bool:
    """Return True if this email looks like a placeholder or system address."""
    if "@" not in addr:
        return True
    local, domain = addr.split("@", 1)
    # Exact domain match
    if domain in JUNK_EMAIL_DOMAINS:
        return True
    # Domain root match — catches 'godaddy.commy', 'godaddy.comsend', etc.
    if any(domain.startswith(junk) for junk in JUNK_EMAIL_DOMAINS):
        return True
    # Placeholder local parts
    if JUNK_LOCAL_RE.match(local):
        return True
    return False

PHONE_RE = re.compile(
    r"(?:\+?1[\s.\-]?)?"
    r"(?:\(?\d{3}\)?[\s.\-]?)"
    r"\d{3}[\s.\-]?\d{4}"
)

BOOKING_DOMAINS = [
    "mindbody.io", "mindbodyonline.com", "acuityscheduling.com",
    "calendly.com", "vagaro.com", "janeapp.com", "fullslate.com",
    "setmore.com", "booker.com", "schedulicity.com", "simplybook.me",
    "squarespace.com/appointments", "booksy.com",
]
BOOKING_LINK_WORDS = {"book", "appointment", "schedule", "booking", "reserve"}

SOCIAL_PATTERNS = {
    "instagram": re.compile(r"instagram\.com/([A-Za-z0-9_.]+)"),
    "facebook":  re.compile(r"facebook\.com/([A-Za-z0-9_.]+)"),
    "linkedin":  re.compile(r"linkedin\.com/in/([A-Za-z0-9_\-]+)"),
    "x":         re.compile(r"(?:twitter|x)\.com/([A-Za-z0-9_]+)"),
    "substack":  re.compile(r"([A-Za-z0-9_\-]+)\.substack\.com"),
}

MODALITY_KEYWORDS: dict[str, list[str]] = {
    "Acupuncture":              ["acupuncture", "acupuncturist", "acupoint"],
    "Alternative Therapy":      ["holistic", "integrative", "alternative wellness"],
    "Art Therapy":              ["art therapy", "expressive arts", "creative arts therapy"],
    "Astrology":                ["astrology", "astrologer", "natal chart"],
    "Ayurveda":                 ["ayurveda", "ayurvedic"],
    "Birth Doula":              ["birth doula", "labor support"],
    "Breathwork":               ["breathwork", "pranayama"],
    "Chiropractic":             ["chiropractic", "chiropractor", "spinal adjustment"],
    "Counseling":               ["counseling", "counselor", "lmhc", "lcsw", "mft",
                                 "mental health"],
    "Craniosacral":             ["craniosacral", "cranial sacral", "cst"],
    "Dentistry":                ["dentist", "dental"],
    "Energy Healing":           ["energy healing", "energy work", "biofield"],
    "Family Constellation":     ["family constellation", "systemic constellation"],
    "Fitness":                  ["personal trainer", "personal training", "fitness coaching",
                                 "strength training", "crossfit", "bootcamp", "boot camp",
                                 "gym", "weight training", "hiit", "athletic training"],
    "Functional Medicine":      ["functional medicine", "root cause"],
    "Hawaiian Healing":         ["hawaiian healing", "la'au lapa'au", "ho'oponopono",
                                 "traditional hawaiian"],
    "Herbalism":                ["herbal", "herbalism", "botanicals"],
    "Hypnotherapy":             ["hypnotherapy", "hypnosis"],
    "IV Therapy":               ["iv therapy", "iv drip", "intravenous vitamin",
                                 "vitamin infusion", "iv infusion"],
    "Life Coaching":            ["life coach", "life coaching", "executive coach"],
    "Longevity":                ["longevity", "anti-aging", "biohacking", "lifespan",
                                 "healthspan"],
    "Lomilomi / Hawaiian Healing": ["lomilomi", "lomi lomi", "hawaiian healing", "kahuna"],
    "Massage":                  ["massage", "bodywork", "lmt"],
    "Meditation":               ["meditation", "mindfulness"],
    "Midwife":                  ["midwife", "midwifery"],
    "Nature Therapy":           ["nature therapy", "ecotherapy", "forest bathing"],
    "Naturopathic":             ["naturopathic", "naturopath"],
    "Nervous System Regulation":["nervous system", "polyvagal"],
    "Network Chiropractic":     ["network chiropractic", "network spinal"],
    "Nutrition":                ["nutrition", "nutritionist", "dietitian", "rdn"],
    "Osteopathic":              ["osteopathic", "osteopath"],
    "Physical Therapy":         ["physical therapy", "physiotherapy"],
    "Psychic":                  ["psychic", "clairvoyant", "medium", "intuitive reading",
                                 "tarot", "oracle reading"],
    "Psychotherapy":            ["psychotherapy", "psychotherapist", "psychologist"],
    "Ritualist":                ["ritualist", "ritual", "ceremonial", "shamanic",
                                 "shamanism", "plant medicine"],
    "Reiki":                    ["reiki"],
    "Somatic Therapy":          ["somatic", "somatic therapy", "somatic experiencing"],
    "Soul Guidance":            ["soul guidance", "spiritual guidance", "akashic"],
    "Sound Healing":            ["sound healing", "sound bath", "singing bowl"],
    "TCM (Traditional Chinese Medicine)": ["tcm", "traditional chinese medicine",
                                           "chinese medicine"],
    "Trauma-Informed Care":     ["trauma informed", "trauma-informed", "emdr", "ptsd"],
    "Watsu / Water Therapy":    ["watsu", "water therapy", "aquatic bodywork"],
    "Women's Health":           ["women's health", "women's wellness", "pelvic floor",
                                 "prenatal", "postnatal", "fertility", "menopause",
                                 "gynecologic", "maternal health"],
    "Yoga":                     ["yoga", "yogini", "asana", "vinyasa"],
}

# ── Name extraction patterns ──────────────────────────────────────────────────

# Credential suffixes to strip so they don't get captured as last names
CREDENTIAL_SUFFIXES = re.compile(
    r"\b(PhD|Ph\.D|MD|M\.D|DO|DC|ND|RN|LMT|LAc|LCSW|LMFT|LMHC|MFT|"
    r"RYT|E-RYT|RYT-200|RYT-500|CPC|NTP|RDN|LD|OTR|PT|DPT|CHt|"
    r"CBP|CST|SEP|EMDR|Dipl\.Ac|Dipl\.OM|"
    r"M\.S|MS|MA|MBA|MPH|MDiv|CYT|RCYT|RPYT|YTT)\b[,.]?",
    re.IGNORECASE
)

# "Hi, I'm Jane Doe", "I'm Jane Doe", "Meet Jane Doe", "My name is Jane Doe",
# "I am Jane Doe", "Welcome, I'm Jane"
NAME_INTRO_PATTERNS = [
    re.compile(r"\b(?:hi[,!]?\s+)?i'?m\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b"),
    re.compile(r"\bmeet\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b"),
    re.compile(r"\bmy name is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", re.IGNORECASE),
    re.compile(r"\bi am\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b"),
    re.compile(r"\bwelcome[,!]?\s+i'?m\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b"),
]

# Common Hawaiian names to avoid false positives (places, greetings)
FALSE_POSITIVE_NAMES = {
    "Aloha", "Hawaii", "Maui", "Kona", "Hilo", "Waimea", "Kauai", "Oahu",
    "Welcome", "Home", "About", "Contact", "Services", "Schedule", "Book",
    "Today", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
    "Saturday", "Sunday", "January", "February", "March", "April",
    "May", "June", "July", "August", "September", "October", "November", "December",
}

# ── Platform detection ────────────────────────────────────────────────────────

# Platform signatures: list of (attr, value_fragment) checks on the full HTML
PLATFORM_SIGNATURES: list[tuple[str, str]] = [
    ("squarespace",  "squarespace"),
    ("wix",          "wix.com"),
    ("wordpress",    "wp-content"),
    ("wordpress",    "wp-json"),
    ("weebly",       "weebly.com"),
    ("webflow",      "webflow.io"),
    ("webflow",      "webflow.com"),
    ("godaddy",      "godaddy.com"),
    ("godaddy",      "secureserver.net"),
    ("carrd",        "carrd.co"),
    ("kajabi",       "kajabi.com"),
    ("showit",       "showit.co"),
    ("format",       "format.com"),
    ("strikingly",   "strikingly.com"),
    ("jimdo",        "jimdo.com"),
    ("duda",         "dudaone.com"),
    ("duda",         "multiscreensite.com"),
    ("shopify",      "shopify.com"),
    ("framer",       "framer.com"),
]

def detect_platform(soup: BeautifulSoup, url: str) -> str:
    """Return best-guess CMS/builder name, or 'custom' / 'unknown'."""
    raw_html = str(soup).lower()
    # Check meta generator tag first — most reliable
    gen = soup.find("meta", attrs={"name": "generator"})
    if gen:
        content = (gen.get("content") or "").lower()
        for platform, sig in PLATFORM_SIGNATURES:
            if sig.split(".")[0] in content:
                return platform

    for platform, sig in PLATFORM_SIGNATURES:
        if sig in raw_html:
            return platform

    # Subdomain checks from the URL itself
    parsed = urlparse(url)
    netloc = parsed.netloc.lower()
    for platform, sig in [
        ("wix",          "wixsite.com"),
        ("squarespace",  "squarespace.com"),
        ("wordpress",    "wordpress.com"),
        ("carrd",        "carrd.co"),
        ("webflow",      "webflow.io"),
    ]:
        if sig in netloc:
            return platform

    return "custom"

# ── Website staleness scoring ─────────────────────────────────────────────────

CURRENT_YEAR = datetime.datetime.now().year
COPYRIGHT_RE  = re.compile(r"©\s*(\d{4})", re.IGNORECASE)
YEAR_IN_TEXT  = re.compile(r"\b(20\d{2})\b")

def score_staleness(soup: BeautifulSoup | None, url: str,
                    platform: str, reachable: bool) -> int:
    """
    Return a 0–100 staleness/opportunity score.
    Higher = more outdated / better marketing target.
    0  = modern, well-maintained site
    100 = no website at all (ultimate lead)
    """
    if not reachable or soup is None:
        # Site is down or timed out — strong lead
        return 85

    score = 0

    # ── Copyright year ────────────────────────────────────────────────────────
    # Find the most recent year mentioned in the page footer area
    footer = soup.find("footer") or soup
    footer_text = footer.get_text(" ")
    all_years: list[int] = []
    for m in COPYRIGHT_RE.finditer(footer_text):
        try:
            all_years.append(int(m.group(1)))
        except ValueError:
            pass
    for m in YEAR_IN_TEXT.finditer(footer_text):
        try:
            all_years.append(int(m.group(1)))
        except ValueError:
            pass

    if all_years:
        newest = max(all_years)
        age = CURRENT_YEAR - newest
        if age >= 5:
            score += 35
        elif age >= 3:
            score += 20
        elif age >= 2:
            score += 10
        elif age >= 1:
            score += 5

    # ── Platform staleness ────────────────────────────────────────────────────
    PLATFORM_SCORES = {
        "godaddy":    20,  # Often basic, template-heavy
        "weebly":     18,
        "strikingly": 15,
        "jimdo":      15,
        "wix":        10,  # Still common but often dated
        "squarespace": 0,  # Generally modern
        "wordpress":   5,
        "webflow":     0,
        "carrd":       5,
        "custom":      5,
    }
    score += PLATFORM_SCORES.get(platform, 5)

    # ── Content thinness ─────────────────────────────────────────────────────
    text_words = len(soup.get_text(" ").split())
    if text_words < 100:
        score += 15
    elif text_words < 250:
        score += 8

    # ── Missing meta description ──────────────────────────────────────────────
    og = soup.find("meta", property="og:description")
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if not og and not meta_desc:
        score += 8

    # ── No social links on page ───────────────────────────────────────────────
    social_found = any(
        pat.search(str(soup)) for pat in SOCIAL_PATTERNS.values()
    )
    if not social_found:
        score += 8

    # ── No booking integration ────────────────────────────────────────────────
    html_lower = str(soup).lower()
    has_booking = any(bd in html_lower for bd in BOOKING_DOMAINS)
    if not has_booking:
        score += 6

    # ── No HTTPS ─────────────────────────────────────────────────────────────
    if url.startswith("http://"):
        score += 8

    return min(score, 99)  # 100 is reserved for "no website"


# ── Lead score (composite) ────────────────────────────────────────────────────

def compute_lead_score(rec: dict, website_score: int,
                       no_website: bool, platform: str) -> int:
    """
    Composite 0–100 marketing priority score.
    Factors: website_score, missing email, tier=free, no booking, island preference.
    """
    score = 0

    # Website opportunity (biggest weight)
    score += int(website_score * 0.50)

    # No email on file — they're harder to reach, but also means more need
    if not rec.get("email"):
        score += 15

    # Free tier — most likely to want to upgrade
    if rec.get("tier", "free") == "free":
        score += 15

    # No booking integration on website
    # (already factored into website_score but weight it separately)
    if website_score >= 60:
        score += 10

    # No phone — contact info gap
    if not rec.get("phone"):
        score += 5

    # Published listings are warm — they're already on the directory
    if rec.get("status") == "published":
        score += 5

    return min(score, 100)


# ── HTTP ──────────────────────────────────────────────────────────────────────

def fetch_html(url: str) -> BeautifulSoup | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT,
                         allow_redirects=True)
        if r.status_code != 200:
            return None
        return BeautifulSoup(r.text, "html.parser")
    except Exception:
        return None


def normalise_url(raw: str | None) -> str:
    raw = (raw or "").strip()
    if not raw:
        return ""
    if not raw.startswith(("http://", "https://")):
        return "https://" + raw
    return raw


# ── JSON-LD ───────────────────────────────────────────────────────────────────

def extract_json_ld(soup: BeautifulSoup) -> dict:
    """Return first relevant Schema.org JSON-LD block, or {}."""
    RELEVANT_TYPES = {
        "Person", "LocalBusiness", "MedicalBusiness", "HealthAndBeautyBusiness",
        "MassageTherapist", "MedicalClinic", "Physician",
    }
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            schema_type = data.get("@type", "")
            if isinstance(schema_type, list):
                schema_type = schema_type[0]
            if schema_type in RELEVANT_TYPES:
                return data
        except Exception:
            pass
    return {}


def enrich_from_json_ld(json_ld: dict) -> dict:
    """Extract structured fields from JSON-LD."""
    out = {}
    if json_ld.get("email"):
        out["email"] = json_ld["email"].replace("mailto:", "").strip()
    if json_ld.get("telephone"):
        out["phone"] = json_ld["telephone"]
    if json_ld.get("description") and len(json_ld["description"]) > 20:
        out["bio"] = truncate_words(json_ld["description"], MAX_BIO_WORDS)
    # Image — JSON-LD can represent this as str, dict, or list
    img = json_ld.get("image")
    if img:
        if isinstance(img, str):
            out["avatar_url"] = img
        elif isinstance(img, list) and img:
            first = img[0]
            out["avatar_url"] = first if isinstance(first, str) else (first.get("url", "") if isinstance(first, dict) else "")
        elif isinstance(img, dict):
            out["avatar_url"] = img.get("url", "")
    # Person-specific name fields
    if json_ld.get("@type") == "Person":
        given  = json_ld.get("givenName", "").strip()
        family = json_ld.get("familyName", "").strip()
        if given:
            out["first_name"] = given
        if family:
            out["last_name"] = family
        if not given and not family and json_ld.get("name"):
            parts = json_ld["name"].strip().split()
            if len(parts) >= 2:
                out["first_name"] = parts[0]
                out["last_name"]  = " ".join(parts[1:])
    # Social profiles from sameAs
    same_as = json_ld.get("sameAs", [])
    if isinstance(same_as, str):
        same_as = [same_as]
    social = extract_social_from_urls(same_as)
    if social:
        out["_social_links"] = social
    return out


# ── Social profiles ───────────────────────────────────────────────────────────

def extract_social_from_urls(urls: list[str]) -> dict:
    social = {}
    for url in urls:
        for platform, pattern in SOCIAL_PATTERNS.items():
            if pattern.search(url):
                social[platform] = url
                break
    return social


def extract_social_from_soup(soup: BeautifulSoup) -> dict:
    """Scan all <a> hrefs for social media profile links."""
    social = {}
    for a in soup.find_all("a", href=True):
        href = a["href"]
        for platform, pattern in SOCIAL_PATTERNS.items():
            if platform not in social and pattern.search(href):
                social[platform] = href
    return social


# ── Booking URL ───────────────────────────────────────────────────────────────

def extract_booking_url(soup: BeautifulSoup, base_url: str) -> str:
    """Find external booking/appointment links."""
    for a in soup.find_all("a", href=True):
        href = a["href"].lower()
        text = a.get_text().lower().strip()
        # Booking platform domains
        if any(bd in href for bd in BOOKING_DOMAINS):
            return a["href"] if a["href"].startswith("http") else urljoin(base_url, a["href"])
        # Link text implies booking
        if any(w in text for w in BOOKING_LINK_WORDS):
            full = a["href"] if a["href"].startswith("http") else urljoin(base_url, a["href"])
            # Only return if it goes off-site or has 'book' in the path
            parsed = urlparse(full)
            if any(bd in parsed.netloc for bd in BOOKING_DOMAINS):
                return full
    return ""


# ── Personal name extraction ──────────────────────────────────────────────────

ABOUT_PATHS = ["/about", "/about-me", "/about-us", "/our-story", "/meet-the-team",
               "/meet", "/who-we-are", "/the-team"]


def _clean_name_candidate(raw: str) -> tuple[str, str] | None:
    """Strip credentials and split into (first, last). Returns None if invalid."""
    cleaned = CREDENTIAL_SUFFIXES.sub("", raw).strip().strip(",").strip()
    parts = cleaned.split()
    # Filter: 2–4 word names, all parts start with capital, not in false positives
    if len(parts) < 2 or len(parts) > 4:
        return None
    if any(p in FALSE_POSITIVE_NAMES for p in parts):
        return None
    if not all((p[0].isupper() and p[1:].islower()) or (len(p) == 1 and p[0].isupper())
               for p in parts if p.isalpha()):
        return None
    return parts[0], " ".join(parts[1:])


def extract_personal_name_from_soup(soup: BeautifulSoup,
                                    listing_name: str) -> tuple[str, str] | None:
    """
    Try to extract (first_name, last_name) from a page.
    Returns None if nothing confident found.
    """
    text = soup.get_text(" ")

    # 1. JSON-LD Person type (most reliable)
    json_ld = extract_json_ld(soup)
    if json_ld.get("@type") == "Person":
        given  = json_ld.get("givenName", "").strip()
        family = json_ld.get("familyName", "").strip()
        if given and family:
            return given, family
        full = json_ld.get("name", "").strip()
        if full:
            parts = full.split()
            if len(parts) >= 2:
                return parts[0], " ".join(parts[1:])

    # 2. Introduction patterns in page text ("Hi, I'm Jane Doe", "Meet Jane")
    for pattern in NAME_INTRO_PATTERNS:
        m = pattern.search(text)
        if m:
            result = _clean_name_candidate(m.group(1))
            if result:
                return result

    # 3. h1 / h2 on about pages — often just the practitioner's name
    for heading in soup.find_all(["h1", "h2"]):
        heading_text = heading.get_text(" ").strip()
        # Skip headings that look like page titles or CTAs
        if any(skip in heading_text.lower() for skip in
               ["about", "welcome", "contact", "service", "schedule", "book",
                "transform", "healing", "wellness", "work with", "session"]):
            continue
        result = _clean_name_candidate(heading_text)
        if result:
            return result

    # 4. alt text on profile photos ("Photo of Jane Doe", "Jane Doe, LMT")
    for img in soup.find_all("img", alt=True):
        alt = img.get("alt", "")
        if any(kw in alt.lower() for kw in ["photo of", "portrait of", "headshot"]):
            candidate = re.sub(r"(?:photo|portrait|headshot)\s+of\s*", "", alt,
                               flags=re.IGNORECASE).strip()
            result = _clean_name_candidate(candidate)
            if result:
                return result

    return None


def extract_personal_name(listing_url: str,
                           listing_name: str) -> tuple[str, str] | None:
    """
    Crawl homepage + about page and try to find a personal name.
    Returns (first_name, last_name) or None.
    """
    # Try homepage first
    home_soup = fetch_html(listing_url)
    if home_soup:
        result = extract_personal_name_from_soup(home_soup, listing_name)
        if result:
            return result

    # Try dedicated about pages
    parsed = urlparse(listing_url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    for path in ABOUT_PATHS:
        time.sleep(0.2)
        soup = fetch_html(base + path)
        if not soup:
            continue
        result = extract_personal_name_from_soup(soup, listing_name)
        if result:
            return result

    return None


# ── Standard extractions ──────────────────────────────────────────────────────

def truncate_words(text: str, n: int) -> str:
    words = text.split()
    return " ".join(words[:n]) + ("…" if len(words) > n else "")


# Secondary pages to crawl when homepage lacks contact info (priority order)
CONTACT_PAGES = ["/contact", "/contact-us", "/about", "/about-us", "/reach-us", "/connect"]

def extract_emails(soup: BeautifulSoup) -> list[str]:
    # Prioritise mailto: links — they are explicit and always accurate.
    # Only fall back to text regex if no mailto: links exist.
    mailto_emails: set[str] = set()
    for a in soup.find_all("a", href=True):
        if a["href"].startswith("mailto:"):
            addr = a["href"][7:].split("?")[0].strip().lower()
            if addr and "@" in addr:
                mailto_emails.add(addr)

    if mailto_emails:
        # mailto: found — skip error-prone text scan entirely
        candidates = mailto_emails
    else:
        # Fall back to text scan with separator to prevent DOM concatenation
        candidates = {
            addr.lower()
            for addr in EMAIL_RE.findall(soup.get_text(separator=" "))
        }

    return [
        e for e in candidates
        if not e.endswith((".png", ".jpg", ".gif", ".svg"))
        and "@2x" not in e
        and not is_junk_email(e)
    ]


def hunt_contact_info(base_url: str) -> tuple[str, str]:
    """Aggressively crawl multiple contact-related pages until email + phone found.
    Returns (email, phone) — either may be empty string if not found."""
    found_email = ""
    found_phone = ""

    for path in CONTACT_PAGES:
        if found_email and found_phone:
            break
        soup = fetch_html(urljoin(base_url, path))
        if not soup:
            continue
        if not found_email:
            emails = extract_emails(soup)
            if emails:
                found_email = emails[0]
        if not found_phone:
            phone = extract_phone(soup)
            if phone:
                found_phone = phone

    return found_email, found_phone


def extract_phone(soup: BeautifulSoup) -> str:
    for a in soup.find_all("a", href=True):
        if a["href"].startswith("tel:"):
            digits = re.sub(r"\D", "", a["href"][4:])
            if len(digits) >= 10:
                return digits[-10:]
    for m in PHONE_RE.findall(soup.get_text(" ")):
        digits = re.sub(r"\D", "", m)
        if len(digits) >= 10:
            return digits[-10:]
    return ""


def extract_bio(soup: BeautifulSoup) -> str:
    og = soup.find("meta", property="og:description")
    if og and og.get("content", "").strip():
        return truncate_words(og["content"].strip(), MAX_BIO_WORDS)
    md = soup.find("meta", attrs={"name": "description"})
    if md and md.get("content", "").strip():
        return truncate_words(md["content"].strip(), MAX_BIO_WORDS)
    for tag in ["main", "article", "section", "div"]:
        for container in soup.find_all(tag):
            for p in container.find_all("p"):
                text = p.get_text(" ").strip()
                if len(text.split()) >= 15:
                    return truncate_words(text, MAX_BIO_WORDS)
    return ""


def extract_photo(soup: BeautifulSoup, base_url: str) -> str:
    og = soup.find("meta", property="og:image")
    if og and og.get("content", "").strip():
        return urljoin(base_url, og["content"].strip())
    tw = soup.find("meta", attrs={"name": "twitter:image"})
    if tw and tw.get("content", "").strip():
        return urljoin(base_url, tw["content"].strip())
    for img in soup.find_all("img", src=True):
        src = img.get("src", "")
        if any(src.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            if not any(skip in src.lower() for skip in ["logo", "icon", "badge", "pixel", "1x1"]):
                w = img.get("width") or img.get("data-width") or "0"
                try:
                    if int(str(w).replace("px", "")) >= 200:
                        return urljoin(base_url, src)
                except Exception:
                    return urljoin(base_url, src)
    return ""


def infer_modalities(text: str) -> list[str]:
    lower = text.lower()
    # Use dict insertion order (Python 3.7+) to preserve canonical ordering,
    # while dict keys guarantee no duplicates even if multiple keywords match.
    seen: dict[str, None] = {}
    for m, kws in MODALITY_KEYWORDS.items():
        if any(kw in lower for kw in kws):
            seen[m] = None
    return list(seen)


# ── Helpers ───────────────────────────────────────────────────────────────────

def is_blank(v) -> bool:
    if v is None or v == "":
        return True
    if isinstance(v, list) and len(v) == 0:
        return True
    return False


def bio_is_thin(bio: str | None) -> bool:
    return not bio or len(bio.split()) < 10


def needs_enrichment(rec: dict, rescore_days: int = 0) -> bool:
    # Enrichment fills: email, phone, bio/description, avatar_url, modalities,
    #                   first_name, last_name, website_platform, website_score,
    #                   lead_score, social_links.instagram

    social = rec.get("social_links") or {}
    no_instagram = not (isinstance(social, dict) and social.get("instagram"))

    # Always needs enrichment if core fields are missing
    if (is_blank(rec.get("email"))
        or is_blank(rec.get("phone"))
        or bio_is_thin(rec.get("bio") or rec.get("description"))
        or is_blank(rec.get("avatar_url"))
        or is_blank(rec.get("modalities"))
        or rec.get("website_score") is None
        or no_instagram):
        return True

    # Rescore if enriched_at is stale
    if rescore_days > 0:
        enriched_at = rec.get("enriched_at")
        if not enriched_at:
            return True
        try:
            # Parse ISO timestamp and calculate age
            enriched_dt = datetime.datetime.fromisoformat(enriched_at.rstrip("Z"))
            age_days = (datetime.datetime.utcnow() - enriched_dt).days
            if age_days >= rescore_days:
                return True
        except Exception:
            # If we can't parse the timestamp, mark for re-enrichment
            return True

    return False


# ── Main crawl logic ──────────────────────────────────────────────────────────

def crawl_listing(rec: dict, score_leads: bool = False) -> dict | None:
    raw_url = rec.get("website_url", "")
    bio_field = "description" if rec.get("_table") == "centers" else "bio"

    # ── Handle listings with no website ──────────────────────────────────────
    if not raw_url:
        patch: dict = {}
        if not rec.get("no_website_lead"):
            patch["no_website_lead"] = True
        if rec.get("website_score") is None:
            patch["website_score"] = 100  # no website = maximum opportunity
        if rec.get("lead_score") is None or score_leads:
            patch["lead_score"] = compute_lead_score(rec, 100, True, "none")
        # Always update enriched_at timestamp
        patch["enriched_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        return patch if patch else None

    url  = normalise_url(raw_url)
    soup = fetch_html(url)
    reachable = soup is not None

    patch: dict = {}

    # ── Platform & staleness scoring (always run when website_score is missing) ─
    platform = detect_platform(soup, url) if soup else "unknown"
    ws       = score_staleness(soup, url, platform, reachable)

    if is_blank(rec.get("website_platform")):
        patch["website_platform"] = platform
    if rec.get("website_score") is None:
        patch["website_score"] = ws
    if rec.get("lead_score") is None or score_leads:
        effective_ws = rec.get("website_score") or ws
        patch["lead_score"] = compute_lead_score(rec, effective_ws, False, platform)

    if soup is None:
        # Update enriched_at even if we couldn't fetch the site
        patch["enriched_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        return patch if patch else None

    # ── 1. JSON-LD — most reliable source ────────────────────────────────────
    json_ld = extract_json_ld(soup)
    if json_ld:
        ld = enrich_from_json_ld(json_ld)
        if ld.get("email") and is_blank(rec.get("email")):
            patch["email"] = ld["email"]
        if ld.get("phone") and is_blank(rec.get("phone")):
            patch["phone"] = ld["phone"]
        existing_bio = rec.get("bio") or rec.get("description")
        if ld.get("bio") and bio_is_thin(existing_bio):
            patch[bio_field] = ld["bio"]
        if ld.get("avatar_url") and is_blank(rec.get("avatar_url")):
            patch["avatar_url"] = ld["avatar_url"]
        if ld.get("first_name") and is_blank(rec.get("first_name")):
            patch["first_name"] = ld["first_name"]
        if ld.get("last_name") and is_blank(rec.get("last_name")):
            patch["last_name"] = ld["last_name"]
        if ld.get("_social_links"):
            patch.pop("_social_links_ld", None)  # don't write social links

    # ── 2. Standard HTML extraction for anything still blank ─────────────────
    # Email — try homepage first, then hunt across multiple contact pages
    if is_blank(rec.get("email")) and "email" not in patch:
        emails = extract_emails(soup)
        if emails:
            patch["email"] = emails[0]
        else:
            hunted_email, hunted_phone = hunt_contact_info(url)
            if hunted_email:
                patch["email"] = hunted_email
            # Opportunistically capture phone too if found during contact hunt
            if hunted_phone and is_blank(rec.get("phone")) and "phone" not in patch:
                patch["phone"] = hunted_phone

    # Phone — try homepage, then hunt if still missing
    if is_blank(rec.get("phone")) and "phone" not in patch:
        phone = extract_phone(soup)
        if phone:
            patch["phone"] = phone
        else:
            _, hunted_phone = hunt_contact_info(url)
            if hunted_phone:
                patch["phone"] = hunted_phone

    existing_bio = rec.get("bio") or rec.get("description")
    if bio_is_thin(existing_bio) and bio_field not in patch:
        bio = extract_bio(soup)
        if bio:
            patch[bio_field] = bio

    if is_blank(rec.get("avatar_url")) and "avatar_url" not in patch:
        photo = extract_photo(soup, url)
        if photo:
            patch["avatar_url"] = photo

    if is_blank(rec.get("modalities")):
        mods = infer_modalities(soup.get_text(" "))
        if mods:
            patch["modalities"] = mods

    # ── Social links — merge with existing, never overwrite ──────────────────
    existing_social = rec.get("social_links") or {}
    if not isinstance(existing_social, dict):
        existing_social = {}
    found_social = extract_social_from_soup(soup)
    # Also merge from JSON-LD sameAs if present
    if json_ld:
        ld_social = enrich_from_json_ld(json_ld).get("_social_links") or {}
        for k, v in ld_social.items():
            found_social.setdefault(k, v)
    merged_social = dict(existing_social)
    for platform, url_val in found_social.items():
        if not merged_social.get(platform):
            merged_social[platform] = url_val
    if merged_social != existing_social:
        patch["social_links"] = merged_social

    # ── 3. Personal name extraction DISABLED ─────────────────────────────────
    # Was populating first_name/last_name with junk from About pages, which
    # then overrode the `name` display field. The `name` column is already
    # the source of truth for how listings render — don't touch first/last.

    # Always set enriched_at on any crawl attempt (whether or not we found new data).
    # This prevents re-crawling fully-enriched listings on every pipeline run.
    patch["enriched_at"] = datetime.datetime.utcnow().isoformat() + "Z"

    return patch


# ── DB fetch ──────────────────────────────────────────────────────────────────

def fetch_listings(island: str, status_filter: str = "published",
                   include_no_website: bool = False,
                   rescore_days: int = 0) -> list[dict]:
    """
    status_filter: 'published' | 'draft' | 'all'
    include_no_website: if True, also return listings without a website URL
      (for lead scoring).
    rescore_days: if > 0, include listings enriched more than N days ago
      for website_score and lead_score rescoring.
    """
    records = []
    for table, bio_col in [("practitioners", "bio"), ("centers", "description")]:
        page_size, offset = 1000, 0
        while True:
            q = client.table(table).select(
                f"id, name, website_url, email, phone, {bio_col}, avatar_url, "
                f"modalities, island, status, tier, social_links, "
                f"first_name, last_name, website_platform, website_score, "
                f"no_website_lead, lead_score, enriched_at"
            ).eq("island", island)
            if status_filter != "all":
                q = q.eq("status", status_filter)
            if not include_no_website:
                q = q.not_.is_("website_url", "null").neq("website_url", "")
            resp = q.range(offset, offset + page_size - 1).execute()
            batch = resp.data or []
            for r in batch:
                r["_table"] = table
                r["_bio_col"] = bio_col
                if bio_col == "description":
                    r["bio"] = r.pop("description", None)
            records.extend(batch)
            if len(batch) < page_size:
                break
            offset += page_size
    return [r for r in records if needs_enrichment(r, rescore_days=rescore_days)]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--island",  default="big_island",
                        choices=["big_island", "maui", "oahu", "kauai"])
    parser.add_argument("--status",  default="published",
                        choices=["published", "draft", "all"],
                        help="Which listings to enrich (default: published)")
    parser.add_argument("--limit",   type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply",   action="store_true")
    parser.add_argument("--score-leads", action="store_true",
                        help="Also score listings with no website (lead targeting)")
    parser.add_argument("--rescore-older-than", type=int, default=0, metavar="DAYS",
                        help="Re-score website_score/lead_score for listings enriched more than N days ago")
    args = parser.parse_args()

    out_path = OUTPUT_DIR / "website_enrichments.jsonl"

    print(f"\n[22] Fetching {args.status} listings needing enrichment for island={args.island}…")
    listings = fetch_listings(args.island, args.status,
                              include_no_website=args.score_leads,
                              rescore_days=args.rescore_older_than)
    print(f"[22] {len(listings)} listings to crawl\n")

    if args.limit:
        listings = listings[:args.limit]
        print(f"[22] Limited to {args.limit}\n")

    results: list[dict] = []
    ok = skipped = errors = 0

    for i, rec in enumerate(listings, 1):
        name = rec.get("name", "?")
        url  = normalise_url(rec.get("website_url", "")) or "(no website)"
        print(f"  [{i}/{len(listings)}] {name[:48]:<48} {url[:35]}", end=" … ", flush=True)
        try:
            patch = crawl_listing(rec, score_leads=args.score_leads)
        except Exception as e:
            print(f"ERROR: {e}")
            errors += 1
            time.sleep(CRAWL_DELAY)
            continue

        # Check if we found real content fields (beyond just enriched_at)
        content_fields = [k for k in patch if not k.startswith("_") and k != "enriched_at"]
        if not content_fields:
            # Nothing new to enrich — but still persist enriched_at so this
            # listing isn't re-crawled unnecessarily on future runs.
            print("enriched_at only")
            skipped += 1
            results.append({
                "_db_id":    rec["id"],
                "_db_table": rec["_table"],
                "_name":     name,
                "_url":      url,
                "enriched_at": patch["enriched_at"],
            })
        else:
            fields = [k for k in patch if not k.startswith("_")]
            print(f"✓ {fields}")
            results.append({
                "_db_id":    rec["id"],
                "_db_table": rec["_table"],
                "_name":     name,
                "_url":      url,
                **patch,
            })
            ok += 1
        time.sleep(CRAWL_DELAY)

    if not args.dry_run and results:
        with open(out_path, "w") as f:
            for r in results:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"\n[22] Saved {len(results)} enrichment records → {out_path}")

    if args.apply and results and not args.dry_run:
        print("\n[22] Applying enrichments to DB…")
        applied = 0
        for r in results:
            table = r["_db_table"]
            db_id = r["_db_id"]
            patch = {k: v for k, v in r.items() if not k.startswith("_")}
            try:
                client.table(table).update(patch).eq("id", db_id).execute()
                applied += 1
            except Exception as e:
                print(f"  DB error for {r['_name']}: {e}")
        print(f"[22] Applied {applied} records")

    mode = "[DRY RUN] " if args.dry_run else ""
    print(f"\n{mode}── Summary ────────────────────────────────────────────")
    print(f"  {ok:>4}  enriched   {skipped:>4}  nothing new   {errors:>4}  errors")
    if not args.dry_run and ok and not args.apply:
        print(f"\n  Review → {out_path}")
        print("  Run with --apply to write to DB.")
