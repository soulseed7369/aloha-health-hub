"""
12_gm_dedup.py
──────────────
Compare classified Google Maps results against the existing Supabase DB.

Produces three output files:
  gm_new.jsonl          — genuinely new listings (insert as draft)
  gm_enrichments.jsonl  — existing records with blank fields we can fill
  gm_review.jsonl       — edge cases / conflicts for manual review

Matching logic (any ONE signal = duplicate):
  1. Phone number match  (10-digit normalized)
  2. Website domain match (strip protocol / www / trailing slash)
  3. Fuzzy name match    (>= FUZZY_THRESHOLD similarity, same island)

Usage:
    cd pipeline
    python scripts/12_gm_dedup.py [--island big_island] [--threshold 85]
"""

from __future__ import annotations
import sys, json, re, argparse
from pathlib import Path
from difflib import SequenceMatcher

sys.path.insert(0, '.')
from src.config   import OUTPUT_DIR
from src.supabase_client import client

FUZZY_THRESHOLD = 85   # percent similarity for name match

# ── Normalisation helpers ──────────────────────────────────────────────────────

def norm_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("1") and len(digits) == 11:
        digits = digits[1:]
    return digits if len(digits) == 10 else None


def norm_domain(url: str | None) -> str | None:
    if not url:
        return None
    url = url.lower().strip()
    url = re.sub(r"^https?://", "", url)
    url = re.sub(r"^www\.", "", url)
    url = url.rstrip("/").split("?")[0].split("#")[0]
    return url or None


def norm_name(name: str) -> str:
    name = name.lower()
    # Strip common suffixes
    name = re.sub(r"\b(llc|inc|ltd|dba|dr\.?|lmt|lcsw|rn|phd|md)\b", "", name)
    name = re.sub(r"[^\w\s]", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def fuzzy_score(a: str, b: str) -> int:
    return int(SequenceMatcher(None, norm_name(a), norm_name(b)).ratio() * 100)


# ── Load existing DB records ───────────────────────────────────────────────────

def load_db_records(island: str) -> list[dict]:
    """Fetch all practitioners and centers for the island from Supabase."""
    records = []
    for table in ("practitioners", "centers"):
        resp = client.table(table).select(
            "id, name, phone, website_url, email, address, city, lat, lng, island, status"
        ).eq("island", island).execute()
        for row in (resp.data or []):
            row["_table"] = table
            records.append(row)
    return records


# ── Build lookup indexes ───────────────────────────────────────────────────────

def build_indexes(db_records: list[dict]):
    phones  = {}   # norm_phone → db_record
    domains = {}   # norm_domain → db_record

    for rec in db_records:
        p = norm_phone(rec.get("phone"))
        if p:
            phones[p] = rec

        d = norm_domain(rec.get("website_url"))
        if d:
            domains[d] = rec

    return phones, domains


def find_match(gm: dict, db_records: list[dict],
               phone_idx: dict, domain_idx: dict,
               threshold: int) -> tuple[dict | None, str]:
    """
    Returns (matched_db_record, match_reason) or (None, "").
    """
    # 1. Phone match
    gm_phone = norm_phone(gm.get("phone"))
    if gm_phone and gm_phone in phone_idx:
        return phone_idx[gm_phone], "phone"

    # 2. Domain match
    gm_domain = norm_domain(gm.get("website_url"))
    if gm_domain and gm_domain in domain_idx:
        return domain_idx[gm_domain], "website"

    # 3. Fuzzy name match (same island)
    gm_island = gm.get("island", "big_island")
    best_score = 0
    best_rec   = None
    for rec in db_records:
        if rec.get("island") != gm_island:
            continue
        score = fuzzy_score(gm["name"], rec["name"])
        if score > best_score:
            best_score = score
            best_rec   = rec
    if best_score >= threshold:
        return best_rec, f"name_fuzzy({best_score}%)"

    return None, ""


def build_enrichment(gm: dict, db: dict) -> dict | None:
    """
    Returns a dict of {field: new_value} for fields that are blank in DB
    but present in Google Maps.  Returns None if nothing to enrich.
    """
    enrichments = {}

    def blank(v):
        return v is None or v == "" or v == 0

    if blank(db.get("phone"))       and gm.get("phone"):
        enrichments["phone"] = gm["phone"]
    if blank(db.get("website_url")) and gm.get("website_url"):
        enrichments["website_url"] = gm["website_url"]
    if blank(db.get("address"))     and gm.get("address"):
        enrichments["address"] = gm["address"]
    if blank(db.get("city"))        and gm.get("city"):
        enrichments["city"] = gm["city"]
    if blank(db.get("lat")) or db.get("lat") == 0:
        if gm.get("lat") and gm["lat"] != 0:
            enrichments["lat"] = gm["lat"]
    if blank(db.get("lng")) or db.get("lng") == 0:
        if gm.get("lng") and gm["lng"] != 0:
            enrichments["lng"] = gm["lng"]

    if not enrichments:
        return None

    return {
        "_db_id":       db["id"],
        "_db_table":    db["_table"],
        "_db_name":     db["name"],
        "_match_reason": "",  # filled in by caller
        "_gm_place_id": gm.get("_place_id"),
        **enrichments,
    }


ALL_ISLANDS = ["big_island", "maui", "oahu", "kauai"]


def run_dedup_for_island(island: str, gm_records: list[dict], threshold: int):
    """Run dedup for one island. Returns (new, enrichments, review, skipped)."""
    island_gm = [r for r in gm_records if r.get("island") == island]
    if not island_gm:
        return [], [], [], 0

    db_records            = load_db_records(island)
    phone_idx, domain_idx = build_indexes(db_records)
    print(f"  [{island}] {len(db_records)} DB records, {len(island_gm)} GM records")

    new_records    = []
    enrichments    = []
    review_records = []

    for gm in island_gm:
        match, reason = find_match(gm, db_records, phone_idx, domain_idx, threshold)
        if match is None:
            new_records.append(gm)
        else:
            enrich = build_enrichment(gm, match)
            if enrich:
                enrich["_match_reason"] = reason
                enrichments.append(enrich)

    skipped = len(island_gm) - len(new_records) - len(enrichments)
    return new_records, enrichments, review_records, skipped


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--island",      default="big_island",
                        choices=ALL_ISLANDS + ["all"],
                        help="Island to dedup, or 'all' for every island")
    parser.add_argument("--threshold",   type=int, default=FUZZY_THRESHOLD,
                        help="Fuzzy name match threshold (0-100)")
    args = parser.parse_args()

    classified_path = OUTPUT_DIR / "gm_classified.jsonl"
    if not classified_path.exists():
        print(f"Error: {classified_path} not found. Run 11_gm_classify.py first.")
        sys.exit(1)

    gm_records = []
    with open(classified_path) as f:
        for line in f:
            gm_records.append(json.loads(line))

    islands = ALL_ISLANDS if args.island == "all" else [args.island]

    all_new        = []
    all_enrichments = []
    all_review      = []
    total_skipped   = 0

    print(f"Loading DB records…")
    for island in islands:
        new, enrich, review, skipped = run_dedup_for_island(
            island, gm_records, args.threshold
        )
        all_new.extend(new)
        all_enrichments.extend(enrich)
        all_review.extend(review)
        total_skipped += skipped

    # Write outputs
    for path, records in [
        (OUTPUT_DIR / "gm_new.jsonl",         all_new),
        (OUTPUT_DIR / "gm_enrichments.jsonl", all_enrichments),
        (OUTPUT_DIR / "gm_review.jsonl",      all_review),
    ]:
        with open(path, "w") as f:
            for rec in records:
                f.write(json.dumps(rec) + "\n")

    total_gm = sum(
        len([r for r in gm_records if r.get("island") == i]) for i in islands
    )
    print(f"\n── Results ──────────────────────────────────────")
    print(f"  {len(all_new):>4}  new listings         → gm_new.jsonl")
    print(f"  {len(all_enrichments):>4}  enrichable records   → gm_enrichments.jsonl")
    print(f"  {len(all_review):>4}  flagged for review   → gm_review.jsonl")
    print(f"  {total_skipped:>4}  exact duplicates (skipped)")
