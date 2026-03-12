"""
09_gm_search.py
───────────────
Run Google Maps Text Search (Places API New) across modality × city
combinations for the specified island. Collects unique Place IDs and
writes them to pipeline/output/gm_place_ids.jsonl.

Uses the Places API (New):
  POST https://places.googleapis.com/v1/places:searchText
  Auth via X-Goog-Api-Key header (not query param)

Usage:
    cd pipeline
    python scripts/09_gm_search.py [--island big_island] [--dry-run]
"""

import sys, json, time, argparse, os, requests
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, '.')
from src.config import OUTPUT_DIR

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / '.env')

# ── Places API (New) endpoint ─────────────────────────────────────────────────
GM_TEXT_SEARCH = "https://places.googleapis.com/v1/places:searchText"
GM_API_KEY     = os.environ.get('GM_API_KEY', '')
if not GM_API_KEY:
    raise EnvironmentError("GM_API_KEY is not set. Add it to your .env file.")

SEARCH_FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.location,places.types"

MODALITY_QUERIES = [
    "acupuncture", "acupuncturist", "massage therapist", "massage therapy",
    "yoga studio", "yoga teacher", "naturopath", "naturopathic doctor",
    "chiropractor", "chiropractic", "counselor therapist", "psychotherapist",
    "ayurveda", "reiki healer", "sound healing", "holistic health practitioner",
    "wellness center", "day spa", "breathwork", "life coach wellness",
    "energy healer", "herbalist", "doula midwife", "osteopath",
    "physical therapist", "functional medicine", "craniosacral therapy",
    "somatic therapy", "meditation teacher", "nutrition coach",
]

ISLAND_CITIES = {
    "big_island": [
        "Hilo Hawaii", "Kailua-Kona Hawaii", "Waimea Hawaii",
        "Captain Cook Hawaii", "Pahoa Hawaii", "Holualoa Hawaii",
        "Hawi Hawaii", "Honokaa Hawaii", "Volcano Hawaii",
        "Waikoloa Hawaii", "Keaau Hawaii", "Kealakekua Hawaii",
    ],
    "maui": [
        "Kahului Maui Hawaii", "Kihei Maui Hawaii", "Lahaina Maui Hawaii",
        "Paia Maui Hawaii", "Makawao Maui Hawaii", "Wailuku Maui Hawaii",
    ],
    "oahu": [
        "Honolulu Hawaii", "Kailua Oahu Hawaii",
        "Haleiwa Hawaii", "Manoa Honolulu Hawaii",
    ],
    "kauai": [
        "Lihue Kauai Hawaii", "Kapaa Kauai Hawaii", "Hanalei Kauai Hawaii",
    ],
}


def text_search(query: str, page_token: str = None) -> dict:
    headers = {
        "Content-Type":     "application/json",
        "X-Goog-Api-Key":   GM_API_KEY,
        "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    }
    body = {"textQuery": query}
    if page_token:
        body["pageToken"] = page_token
    resp = requests.post(GM_TEXT_SEARCH, headers=headers, json=body, timeout=15)
    resp.raise_for_status()
    return resp.json()


def collect_place_ids(island: str, dry_run: bool) -> list:
    cities   = ISLAND_CITIES.get(island, ISLAND_CITIES["big_island"])
    seen_ids = set()
    results  = []
    total_queries = len(MODALITY_QUERIES) * len(cities)
    done = 0

    for city in cities:
        for modality in MODALITY_QUERIES:
            query = f"{modality} {city}"
            done += 1
            print(f"[{done}/{total_queries}] Searching: {query}")
            if dry_run:
                time.sleep(0.05)
                continue
            try:
                page_token = None
                pages = 0
                while pages < 2:
                    data = text_search(query, page_token)
                    places = data.get("places", [])
                    if not places:
                        break
                    for place in places:
                        pid = place.get("id")
                        if not pid or pid in seen_ids:
                            continue
                        seen_ids.add(pid)
                        loc = place.get("location", {})
                        results.append({
                            "place_id":     pid,
                            "name":         place.get("displayName", {}).get("text", ""),
                            "address":      place.get("formattedAddress", ""),
                            "lat":          loc.get("latitude"),
                            "lng":          loc.get("longitude"),
                            "types":        place.get("types", []),
                            "source_query": query,
                            "island":       island,
                        })
                    page_token = data.get("nextPageToken")
                    if not page_token:
                        break
                    pages += 1
                    time.sleep(2.0)
            except Exception as e:
                print(f"  Error on '{query}': {e}")
            time.sleep(0.15)

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--island", default="big_island", choices=list(ISLAND_CITIES.keys()))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / "gm_place_ids.jsonl"

    place_ids = collect_place_ids(args.island, args.dry_run)

    if not args.dry_run:
        with open(out_path, "w") as f:
            for item in place_ids:
                f.write(json.dumps(item) + "\n")
        print(f"\n✓ Saved {len(place_ids)} unique place IDs → {out_path}")
    else:
        total = len(MODALITY_QUERIES) * len(ISLAND_CITIES[args.island])
        print(f"\nDry-run: would run {total} searches across "
              f"{len(ISLAND_CITIES[args.island])} cities × {len(MODALITY_QUERIES)} modalities")
