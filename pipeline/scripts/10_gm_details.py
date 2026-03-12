"""
10_gm_details.py
────────────────
For every Place ID in gm_place_ids.jsonl, fetch full Place Details
using the Places API (New) and save to gm_raw.jsonl.

Uses the Places API (New):
  GET https://places.googleapis.com/v1/places/{place_id}
  Auth via X-Goog-Api-Key header

Output fields are normalised to match the old API schema so downstream
scripts (11_gm_classify, 12_gm_dedup, 13_gm_upsert) work unchanged.

Resumes automatically — already-fetched place_ids are skipped.

Usage:
    cd pipeline
    python scripts/10_gm_details.py [--dry-run]
"""

from __future__ import annotations
import sys, json, time, argparse, os, requests
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, '.')
from src.config import OUTPUT_DIR

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / '.env')

GM_DETAILS_BASE = "https://places.googleapis.com/v1/places"
GM_API_KEY      = os.environ.get('GM_API_KEY', '')
if not GM_API_KEY:
    raise EnvironmentError("GM_API_KEY is not set. Add it to your .env file.")

# Fields to request from Places API (New) — only what we use (saves cost)
DETAILS_FIELD_MASK = ",".join([
    "id",
    "displayName",
    "formattedAddress",
    "addressComponents",
    "location",
    "nationalPhoneNumber",
    "internationalPhoneNumber",
    "websiteUri",
    "regularOpeningHours",
    "types",
    "businessStatus",
    "rating",
    "userRatingCount",
    "photos",
    "editorialSummary",
    "googleMapsUri",
])


def fetch_details(place_id: str) -> dict | None:
    url = f"{GM_DETAILS_BASE}/{place_id}"
    headers = {
        "X-Goog-Api-Key":   GM_API_KEY,
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    }
    resp = requests.get(url, headers=headers, timeout=15)
    if resp.status_code == 404:
        print(f"  Not found (404) for {place_id}")
        return None
    resp.raise_for_status()
    return resp.json()


def extract_city(address_components: list) -> str:
    """Pull the locality (city) from addressComponents."""
    for comp in address_components:
        if "locality" in comp.get("types", []):
            return comp.get("longText") or comp.get("long_name", "")
    for comp in address_components:
        if "sublocality" in comp.get("types", []):
            return comp.get("longText") or comp.get("long_name", "")
    return ""


def normalise(raw: dict, stub: dict) -> dict:
    """
    Convert Places API (New) field names to the schema expected by
    11_gm_classify.py / 12_gm_dedup.py / 13_gm_upsert.py.
    """
    addr_comps = raw.get("addressComponents", [])
    loc        = raw.get("location", {})

    # Opening hours: new API uses regularOpeningHours with weekdayDescriptions
    opening_hours = None
    roh = raw.get("regularOpeningHours")
    if roh:
        opening_hours = {
            "open_now":            roh.get("openNow", False),
            "weekday_text":        roh.get("weekdayDescriptions", []),
        }

    # Editorial summary
    editorial = raw.get("editorialSummary")
    ed_summary = {"overview": editorial.get("text", "")} if editorial else None

    return {
        # Core identity
        "place_id":                   raw.get("id") or stub.get("place_id"),
        "name":                       raw.get("displayName", {}).get("text", ""),
        "formatted_address":          raw.get("formattedAddress", ""),
        "address_components":         addr_comps,

        # Location
        "geometry": {
            "location": {
                "lat": loc.get("latitude"),
                "lng": loc.get("longitude"),
            }
        },

        # Contact
        "formatted_phone_number":     raw.get("nationalPhoneNumber", ""),
        "international_phone_number": raw.get("internationalPhoneNumber", ""),
        "website":                    raw.get("websiteUri", ""),
        "url":                        raw.get("googleMapsUri", ""),

        # Classification
        "types":                      raw.get("types", []),
        "business_status":            raw.get("businessStatus", ""),

        # Reviews / quality
        "rating":                     raw.get("rating"),
        "user_ratings_total":         raw.get("userRatingCount"),

        # Hours & description
        "opening_hours":              opening_hours,
        "editorial_summary":          ed_summary,

        # Photos (new API: list of {name, widthPx, heightPx, authorAttributions})
        "photos":                     raw.get("photos", []),

        # Pipeline metadata (from stub)
        "island":                     stub.get("island", "big_island"),
        "source_query":               stub.get("source_query", ""),

        # Pre-extracted city
        "_city":                      extract_city(addr_comps),
    }


def load_existing_ids(out_path: Path) -> set:
    seen = set()
    if out_path.exists():
        with open(out_path) as f:
            for line in f:
                try:
                    rec = json.loads(line)
                    seen.add(rec.get("place_id"))
                except Exception:
                    pass
    return seen


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    ids_path = OUTPUT_DIR / "gm_place_ids.jsonl"
    out_path  = OUTPUT_DIR / "gm_raw.jsonl"

    if not ids_path.exists():
        print(f"Error: {ids_path} not found. Run 09_gm_search.py first.")
        sys.exit(1)

    place_stubs = []
    with open(ids_path) as f:
        for line in f:
            place_stubs.append(json.loads(line))

    already_done = load_existing_ids(out_path)
    to_fetch = [p for p in place_stubs if p["place_id"] not in already_done]

    print(f"Total place IDs : {len(place_stubs)}")
    print(f"Already fetched : {len(already_done)}")
    print(f"To fetch now    : {len(to_fetch)}")

    if args.dry_run:
        print("Dry-run: no API calls made.")
        sys.exit(0)

    fetched = 0
    errors  = 0

    with open(out_path, "a") as out_f:
        for i, stub in enumerate(to_fetch, 1):
            pid = stub["place_id"]
            print(f"[{i}/{len(to_fetch)}] {stub.get('name', pid)}")
            try:
                raw = fetch_details(pid)
                if raw:
                    rec = normalise(raw, stub)
                    out_f.write(json.dumps(rec) + "\n")
                    fetched += 1
                else:
                    errors += 1
            except Exception as e:
                print(f"  Error: {e}")
                errors += 1
            time.sleep(0.05)

    print(f"\n✓ Fetched {fetched} details, {errors} errors → {out_path}")
