"""
10_gm_details.py
────────────────
For every Place ID in gm_place_ids.jsonl, fetch full Place Details
from the Google Maps API and save to gm_raw.jsonl.

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

GM_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
GM_API_KEY     = os.environ.get('GM_API_KEY', '')
if not GM_API_KEY:
    raise EnvironmentError("GM_API_KEY is not set. Add it to your .env file.")

# Fields to request — only what we actually use (saves cost)
FIELDS = ",".join([
    "place_id",
    "name",
    "formatted_address",
    "formatted_phone_number",
    "international_phone_number",
    "website",
    "url",
    "geometry",
    "opening_hours",
    "types",
    "business_status",
    "rating",
    "user_ratings_total",
    "photos",
    "editorial_summary",
    "address_components",
])


def fetch_details(place_id: str) -> dict | None:
    params = {
        "place_id": place_id,
        "fields":   FIELDS,
        "key":      GM_API_KEY,
    }
    resp = requests.get(GM_DETAILS_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "OK":
        print(f"  Warning: status={data.get('status')} for {place_id}")
        return None
    return data.get("result", {})


def extract_city(address_components: list) -> str:
    """Pull the locality (city) from address_components."""
    for comp in address_components:
        if "locality" in comp.get("types", []):
            return comp["long_name"]
    # fallback: sublocality
    for comp in address_components:
        if "sublocality" in comp.get("types", []):
            return comp["long_name"]
    return ""


def load_existing_ids(out_path: Path) -> set:
    seen = set()
    if out_path.exists():
        with open(out_path) as f:
            for line in f:
                try:
                    rec = json.loads(line)
                    seen.add(rec.get("place_id"))
                except:
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

    # Load all place IDs to process
    place_stubs = []
    with open(ids_path) as f:
        for line in f:
            place_stubs.append(json.loads(line))

    # Skip already fetched
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
                detail = fetch_details(pid)
                if detail:
                    # Merge stub fields (island, source_query) into detail record
                    detail["place_id"]     = pid
                    detail["island"]       = stub.get("island", "big_island")
                    detail["source_query"] = stub.get("source_query", "")

                    # Pre-extract city for convenience
                    addr_comps = detail.get("address_components", [])
                    if addr_comps and not detail.get("_city"):
                        detail["_city"] = extract_city(addr_comps)

                    out_f.write(json.dumps(detail) + "\n")
                    fetched += 1
                else:
                    errors += 1
            except Exception as e:
                print(f"  Error: {e}")
                errors += 1

            time.sleep(0.05)   # ~50ms between calls → ~20 req/s, well within quota

    print(f"\n✓ Fetched {fetched} details, {errors} errors → {out_path}")
