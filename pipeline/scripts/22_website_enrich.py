"""
22_website_enrich.py
────────────────────
Crawl existing listing websites to fill in missing fields:
  - email
  - phone
  - bio / description  (up to 100 words, from og:description or page text)
  - photo              (og:image URL stored in avatar_url)
  - modalities         (inferred from page text if array is empty)

Only touches fields that are currently blank — never overwrites existing data.
Saves results to pipeline/output/website_enrichments.jsonl and optionally
applies them straight to the DB with --apply.

Usage:
    cd pipeline
    python scripts/22_website_enrich.py [--island big_island] [--limit 50]
    python scripts/22_website_enrich.py --apply           # write to DB
    python scripts/22_website_enrich.py --dry-run         # preview patches
"""

from __future__ import annotations
import sys, json, re, time, argparse, textwrap
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, '.')
from src.config import OUTPUT_DIR
from src.supabase_client import client

# ── Config ────────────────────────────────────────────────────────────────────
REQUEST_TIMEOUT   = 10          # seconds per HTTP request
CRAWL_DELAY       = 0.5         # seconds between sites
MAX_BIO_WORDS     = 100
CONTACT_PATH      = "/contact"  # secondary page to try for email
HEADERS = {
    "User-Agent": "AlohaHealthBot/1.0 (+https://hawaiiwellness.net)",
    "Accept": "text/html,application/xhtml+xml",
}

EMAIL_RE  = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE  = re.compile(
    r"(?:\+?1[\s.\-]?)?"
    r"(?:\(?\d{3}\)?[\s.\-]?)"
    r"\d{3}[\s.\-]?\d{4}"
)

# ── Modality keyword map (mirrors 11_gm_classify.py) ─────────────────────────
MODALITY_KEYWORDS: dict[str, list[str]] = {
    "Acupuncture":              ["acupuncture", "acupuncturist", "acupoint"],
    "Alternative Therapy":      ["holistic", "integrative", "alternative", "wellness"],
    "Astrology":                ["astrology", "astrologer", "natal chart", "birth chart"],
    "Ayurveda":                 ["ayurveda", "ayurvedic"],
    "Birth Doula":              ["birth doula", "labor support", "birth support"],
    "Breathwork":               ["breathwork", "pranayama", "breathing practice"],
    "Chiropractic":             ["chiropractic", "chiropractor", "spinal adjustment"],
    "Counseling":               ["counseling", "counselor", "lmhc", "lcsw", "mft",
                                 "therapist", "mental health", "psychotherapy"],
    "Craniosacral":             ["craniosacral", "cranial sacral", "cst"],
    "Dentistry":                ["dentist", "dental", "orthodontic"],
    "Energy Healing":           ["energy healing", "energy work", "biofield"],
    "Functional Medicine":      ["functional medicine", "root cause", "integrative medicine"],
    "Herbalism":                ["herbal", "herbalism", "herbalist", "botanicals"],
    "Hypnotherapy":             ["hypnotherapy", "hypnosis", "hypnotherapist"],
    "Life Coaching":            ["life coach", "life coaching", "executive coach"],
    "Lomilomi / Hawaiian Healing": ["lomilomi", "lomi lomi", "hawaiian healing", "kahuna"],
    "Massage":                  ["massage", "bodywork", "lmt", "licensed massage"],
    "Meditation":               ["meditation", "mindfulness", "guided meditation"],
    "Midwife":                  ["midwife", "midwifery", "birth center"],
    "Nature Therapy":           ["nature therapy", "ecotherapy", "forest bathing", "nature-based", "wilderness therapy", "outdoor therapy"],
    "Naturopathic":             ["naturopathic", "naturopath", "nd ", "n.d."],
    "Nervous System Regulation":["nervous system", "somatic regulation", "polyvagal"],
    "Network Chiropractic":     ["network chiropractic", "nse", "network spinal"],
    "Nutrition":                ["nutrition", "nutritionist", "dietitian", "rdn"],
    "Osteopathic":              ["osteopathic", "osteopath", "d.o.", " do "],
    "Physical Therapy":         ["physical therapy", "physiotherapy", "pt ", "p.t."],
    "Psychotherapy":            ["psychotherapy", "psychotherapist", "psychologist"],
    "Reiki":                    ["reiki"],
    "Somatic Therapy":          ["somatic", "somatic therapy", "somatic experiencing"],
    "Soul Guidance":            ["soul guidance", "spiritual guidance", "akashic"],
    "Sound Healing":            ["sound healing", "sound bath", "singing bowl", "vibrational"],
    "TCM (Traditional Chinese Medicine)": ["tcm", "traditional chinese medicine",
                                           "chinese medicine", "acuherb"],
    "Trauma-Informed Care": ["trauma informed", "trauma-informed", "trauma therapy",
                                 "emdr", "ptsd"],
    "Watsu / Water Therapy":    ["watsu", "water therapy", "aquatic bodywork",
                                 "aquatic therapy"],
    "Yoga":                     ["yoga", "yogini", "asana", "vinyasa", "kundalini",
                                 "yin yoga", "yoga teacher"],
}


def infer_modalities(text: str) -> list[str]:
    lower = text.lower()
    found = []
    for modality, keywords in MODALITY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            found.append(modality)
    return found


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def fetch_html(url: str) -> BeautifulSoup | None:
    """Fetch URL and return parsed BeautifulSoup, or None on failure."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT,
                         allow_redirects=True)
        if r.status_code != 200:
            return None
        return BeautifulSoup(r.text, "html.parser")
    except Exception:
        return None


def normalise_url(raw: str) -> str:
    """Ensure the URL has a scheme."""
    raw = raw.strip()
    if not raw:
        return ""
    if not raw.startswith(("http://", "https://")):
        return "https://" + raw
    return raw


# ── Extraction helpers ────────────────────────────────────────────────────────

def extract_emails(soup: BeautifulSoup, base_url: str) -> list[str]:
    emails = set()
    # mailto: links
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("mailto:"):
            addr = href[7:].split("?")[0].strip().lower()
            if addr:
                emails.add(addr)
    # regex over visible text
    for addr in EMAIL_RE.findall(soup.get_text()):
        emails.add(addr.lower())
    # filter out obvious non-emails
    return [e for e in emails
            if not e.endswith((".png", ".jpg", ".gif", ".svg"))
            and "sentry" not in e
            and "example" not in e]


def extract_phone(soup: BeautifulSoup) -> str:
    # tel: links first
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("tel:"):
            digits = re.sub(r"\D", "", href[4:])
            if len(digits) >= 10:
                return digits[-10:]
    # regex over text
    text = soup.get_text(" ")
    matches = PHONE_RE.findall(text)
    for m in matches:
        digits = re.sub(r"\D", "", m)
        if len(digits) >= 10:
            return digits[-10:]
    return ""


def extract_bio(soup: BeautifulSoup) -> str:
    """Return up to MAX_BIO_WORDS words of bio text."""
    # 1. og:description
    og = soup.find("meta", property="og:description")
    if og and og.get("content", "").strip():
        return truncate_words(og["content"].strip(), MAX_BIO_WORDS)
    # 2. meta description
    md = soup.find("meta", attrs={"name": "description"})
    if md and md.get("content", "").strip():
        return truncate_words(md["content"].strip(), MAX_BIO_WORDS)
    # 3. First substantial <p> in main/article/section
    for container_tag in ["main", "article", "section", "div"]:
        for container in soup.find_all(container_tag):
            for p in container.find_all("p"):
                text = p.get_text(" ").strip()
                words = text.split()
                if len(words) >= 15:
                    return truncate_words(text, MAX_BIO_WORDS)
    return ""


def extract_photo(soup: BeautifulSoup, base_url: str) -> str:
    """Return the best image URL: og:image → twitter:image → first large img."""
    # og:image
    og = soup.find("meta", property="og:image")
    if og and og.get("content", "").strip():
        return urljoin(base_url, og["content"].strip())
    # twitter:image
    tw = soup.find("meta", attrs={"name": "twitter:image"})
    if tw and tw.get("content", "").strip():
        return urljoin(base_url, tw["content"].strip())
    # First img that looks substantial (skip tiny icons / tracking pixels)
    for img in soup.find_all("img", src=True):
        src = img["src"].strip()
        if not src or src.startswith("data:"):
            continue
        # skip obvious icons / logos
        low = src.lower()
        if any(x in low for x in ["icon", "logo", "pixel", "tracking",
                                    "badge", "button", "arrow", "1x1"]):
            continue
        w = img.get("width", "")
        h = img.get("height", "")
        try:
            if int(w) < 100 or int(h) < 100:
                continue
        except (ValueError, TypeError):
            pass  # no dimensions — allow it
        return urljoin(base_url, src)
    return ""


def truncate_words(text: str, n: int) -> str:
    words = text.split()
    if len(words) <= n:
        return text
    return " ".join(words[:n]) + "…"


# ── Missing-field detection ───────────────────────────────────────────────────

def is_blank(val) -> bool:
    if val is None:
        return True
    if isinstance(val, str) and not val.strip():
        return True
    if isinstance(val, list) and len(val) == 0:
        return True
    return False


def bio_is_thin(bio: str | None) -> bool:
    """True if bio is missing or < 10 words."""
    if not bio:
        return True
    return len(bio.split()) < 10


def needs_enrichment(rec: dict) -> bool:
    return (
        is_blank(rec.get("email"))
        or is_blank(rec.get("phone"))
        or bio_is_thin(rec.get("bio") or rec.get("description"))
        or is_blank(rec.get("avatar_url"))
        or is_blank(rec.get("modalities"))
    )


# ── Main crawl logic ──────────────────────────────────────────────────────────

def crawl_listing(rec: dict) -> dict | None:
    """Crawl website and return a patch dict of new values (only blank fields)."""
    raw_url = rec.get("website_url", "")
    if not raw_url:
        return None

    url = normalise_url(raw_url)
    soup = fetch_html(url)
    if soup is None:
        return None

    patch: dict = {}
    bio_field = "description" if rec.get("_table") == "centers" else "bio"

    # Email
    if is_blank(rec.get("email")):
        emails = extract_emails(soup, url)
        if not emails:
            # Try /contact page
            contact_url = urljoin(url, CONTACT_PATH)
            contact_soup = fetch_html(contact_url)
            if contact_soup:
                emails = extract_emails(contact_soup, url)
        if emails:
            patch["email"] = emails[0]

    # Phone
    if is_blank(rec.get("phone")):
        phone = extract_phone(soup)
        if phone:
            patch["phone"] = phone

    # Bio
    existing_bio = rec.get("bio") or rec.get("description")
    if bio_is_thin(existing_bio):
        bio = extract_bio(soup)
        if bio:
            patch[bio_field] = bio

    # Photo
    if is_blank(rec.get("avatar_url")):
        photo = extract_photo(soup, url)
        if photo:
            patch["avatar_url"] = photo

    # Modalities
    if is_blank(rec.get("modalities")):
        text = soup.get_text(" ")
        mods = infer_modalities(text)
        if mods:
            patch["modalities"] = mods

    return patch if patch else None


# ── DB fetch ──────────────────────────────────────────────────────────────────

def fetch_listings(island: str) -> list[dict]:
    records = []

    for table, bio_col in [("practitioners", "bio"), ("centers", "description")]:
        # fetch all with a website_url
        page_size = 1000
        offset = 0
        while True:
            resp = client.table(table).select(
                f"id, name, website_url, email, phone, {bio_col}, avatar_url, modalities, island"
            ).eq("island", island).not_.is_("website_url", "null").neq(
                "website_url", ""
            ).range(offset, offset + page_size - 1).execute()
            batch = resp.data or []
            for r in batch:
                r["_table"] = table
                r["_bio_col"] = bio_col
                # normalise bio field name for uniform access
                if bio_col == "description":
                    r["bio"] = r.pop("description", None)
            records.extend(batch)
            if len(batch) < page_size:
                break
            offset += page_size

    # filter to those actually needing enrichment
    return [r for r in records if needs_enrichment(r)]


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--island",   default="big_island",
                        choices=["big_island", "maui", "oahu", "kauai"],
                        help="Island to process (default: big_island)")
    parser.add_argument("--limit",    type=int, default=0,
                        help="Max listings to crawl (default: all)")
    parser.add_argument("--dry-run",  action="store_true",
                        help="Crawl and print patches but don't write anything")
    parser.add_argument("--apply",    action="store_true",
                        help="Write enrichments to DB immediately after crawling")
    args = parser.parse_args()

    out_path = OUTPUT_DIR / "website_enrichments.jsonl"

    print(f"\n[22] Fetching listings needing enrichment for island={args.island}…")
    listings = fetch_listings(args.island)
    print(f"[22] {len(listings)} listings have a website and ≥1 blank field\n")

    if args.limit:
        listings = listings[: args.limit]
        print(f"[22] Limiting to first {args.limit}\n")

    results: list[dict] = []
    ok = skipped = errors = 0

    for i, rec in enumerate(listings, 1):
        name = rec.get("name", "?")
        url  = normalise_url(rec.get("website_url", ""))
        print(f"  [{i}/{len(listings)}] {name[:55]:<55} {url[:40]}", end=" … ", flush=True)

        try:
            patch = crawl_listing(rec)
        except Exception as e:
            print(f"ERROR: {e}")
            errors += 1
            time.sleep(CRAWL_DELAY)
            continue

        if not patch:
            print("nothing new")
            skipped += 1
        else:
            fields_found = list(patch.keys())
            print(f"✓ {fields_found}")
            result = {
                "_db_id":    rec["id"],
                "_db_table": rec["_table"],
                "_name":     name,
                "_url":      url,
                **patch,
            }
            results.append(result)
            ok += 1

        time.sleep(CRAWL_DELAY)

    # ── Write output ──────────────────────────────────────────────────────────
    if not args.dry_run and results:
        with open(out_path, "w") as f:
            for r in results:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"\n[22] Saved {len(results)} enrichment records → {out_path}")

    # ── Apply to DB ───────────────────────────────────────────────────────────
    if args.apply and results and not args.dry_run:
        print("\n[22] Applying enrichments to DB…")
        applied = 0
        for r in results:
            table  = r["_db_table"]
            db_id  = r["_db_id"]
            patch  = {k: v for k, v in r.items() if not k.startswith("_")}
            try:
                client.table(table).update(patch).eq("id", db_id).execute()
                applied += 1
            except Exception as e:
                print(f"  DB error for {r['_name']}: {e}")
        print(f"[22] Applied {applied} records to DB")

    # ── Summary ───────────────────────────────────────────────────────────────
    mode = "[DRY RUN] " if args.dry_run else ""
    print(f"\n{mode}── Summary ─────────────────────────────────────────────")
    print(f"  {ok:>4}  listings enriched")
    print(f"  {skipped:>4}  listings had nothing new to add")
    print(f"  {errors:>4}  errors (timeouts, bad URLs, etc.)")
    if not args.dry_run and ok:
        print(f"\n  Output → {out_path}")
        if not args.apply:
            print("  Run with --apply to write to DB, or review the JSONL first.")
