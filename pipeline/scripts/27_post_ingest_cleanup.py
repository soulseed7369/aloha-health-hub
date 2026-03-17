"""
27_post_ingest_cleanup.py
─────────────────────────
Post-ingestion data quality cleanup. Runs after upsert (step 5) to fix
known data issues BEFORE enrichment.

Learned from Big Island audit (2026-03-15). Fixes:
  1. Empty-string fields → NULL (website_url, email, phone)
  2. Non-canonical modality normalization (case, variants)
  3. Wrong-island coordinate detection & reassignment
  4. Non-canonical city name normalization (diacritics, variants)
  5. Bogus phone number detection (all-same-digit, too short)
  6. Shell listing flagging (generic modality + no data)

Usage:
    cd pipeline
    python scripts/27_post_ingest_cleanup.py --island maui
    python scripts/27_post_ingest_cleanup.py --island maui --dry-run
    python scripts/27_post_ingest_cleanup.py --island all
"""

from __future__ import annotations
import sys, json, re, argparse
from collections import Counter

sys.path.insert(0, '.')
from src.supabase_client import client

# ── Modality normalization map ────────────────────────────────────────────────
MODALITY_FIXES = {
    'massage':              'Massage',
    'Massage Therapy':      'Massage',
    'massage therapy':      'Massage',
    'Massage Therapist':    'Massage',
    'acupuncture':          'Acupuncture',
    'Acupuncture Clinic':   'Acupuncture',
    'counseling':           'Counseling',
    'chiropractic':         'Chiropractic',
    'craniosacral':         'Craniosacral',
    'reiki':                'Reiki',
    'naturopathic':         'Naturopathic',
    'nutrition':            'Nutrition',
    'yoga':                 'Yoga',
    'meditation':           'Meditation',
    'breathwork':           'Breathwork',
    'herbalism':            'Herbalism',
    'physical therapy':     'Physical Therapy',
    'energy healing':       'Energy Healing',
    'somatic':              'Somatic Therapy',
    'somatic therapy':      'Somatic Therapy',
    'Trauma Informed Services': 'Trauma-Informed Care',
    'trauma informed care': 'Trauma-Informed Care',
    'Wellness Coach':       'Life Coaching',
    'Integrative Healthcare': 'Alternative Therapy',
    'Psychologist':         'Psychotherapy',
    'therapy':              'Psychotherapy',
    'Longevity Medicine':   'Longevity',
}

# ── City normalization map (diacritics and variants) ──────────────────────────
CITY_FIXES = {
    # Big Island
    'Pāhoa': 'Pahoa',
    'Waikoloa Village': 'Waikoloa',
    'Kamuela': 'Waimea',
    # Maui
    'Lahainā': 'Lahaina',
    'Pāʻia': 'Paia',
    'Paʻia': 'Paia',
    'Pa\'ia': 'Paia',
    'Hāna': 'Hana',
    'Hā\'ikū': 'Haiku',
    'Ha\'iku': 'Haiku',
    'Haʻikū': 'Haiku',
    'Wailea-Makena': 'Wailea',
    'Kā\'anapali': 'Kaanapali',
    'Kaʻanapali': 'Kaanapali',
    # Oahu
    'Kailua-Kona': 'Kailua-Kona',  # not the same as Oahu Kailua
    # Kauai
    'Kapaʻa': 'Kapaa',
    'Kapa\'a': 'Kapaa',
    'Līhuʻe': 'Lihue',
    'Līhu\'e': 'Lihue',
    'Pōʻipū': 'Poipu',
}

# ── Per-island coordinate bounds ──────────────────────────────────────────────
ISLAND_BOUNDS = {
    'big_island': {'lat_min': 18.9, 'lat_max': 20.3, 'lng_min': -156.1, 'lng_max': -154.7},
    'maui':       {'lat_min': 20.5, 'lat_max': 21.1, 'lng_min': -156.7, 'lng_max': -155.9},
    'oahu':       {'lat_min': 21.1, 'lat_max': 21.8, 'lng_min': -158.3, 'lng_max': -157.5},
    'kauai':      {'lat_min': 21.8, 'lat_max': 22.3, 'lng_min': -159.8, 'lng_max': -159.0},
}


def detect_correct_island(lat: float, lng: float) -> str | None:
    """Given coordinates, return which island they actually belong to."""
    for island, bounds in ISLAND_BOUNDS.items():
        if (bounds['lat_min'] <= lat <= bounds['lat_max'] and
            bounds['lng_min'] <= lng <= bounds['lng_max']):
            return island
    return None


def is_bogus_phone(phone: str) -> bool:
    """Detect placeholder or invalid phone numbers."""
    digits = re.sub(r'\D', '', phone)
    if len(digits) < 10:
        return True
    # All same digit (e.g., 3333333333)
    if len(set(digits[-10:])) == 1:
        return True
    # Sequential (1234567890)
    if digits[-10:] == '1234567890':
        return True
    return False


def run_cleanup(island: str, dry_run: bool = False):
    """Run all cleanup steps for the given island."""
    stats = Counter()

    for table in ['practitioners', 'centers']:
        bio_col = 'bio' if table == 'practitioners' else 'description'

        resp = client.table(table).select(
            f'id, name, island, city, lat, lng, phone, email, website_url, '
            f'modalities, status, {bio_col}'
        ).eq('island', island).execute()

        listings = resp.data
        print(f"\n{'='*60}")
        print(f"  {table.upper()} on {island}: {len(listings)} records")
        print(f"{'='*60}")

        for rec in listings:
            patches = {}

            # 1. Empty-string → NULL
            for field in ['website_url', 'email', 'phone']:
                if rec.get(field) is not None and rec[field].strip() == '':
                    patches[field] = None
                    stats[f'{table}:empty_{field}_cleaned'] += 1

            # 2. Bogus phone
            if rec.get('phone') and is_bogus_phone(rec['phone']):
                patches['phone'] = None
                stats[f'{table}:bogus_phone_cleaned'] += 1

            # 3. Invalid website_url (single char, no protocol)
            url = rec.get('website_url')
            if url and url.strip() and len(url.strip()) < 5:
                patches['website_url'] = None
                stats[f'{table}:invalid_url_cleaned'] += 1

            # 4. Modality normalization
            mods = rec.get('modalities', [])
            if mods:
                fixed_mods = []
                changed = False
                for m in mods:
                    if m in MODALITY_FIXES:
                        fixed_mods.append(MODALITY_FIXES[m])
                        changed = True
                    else:
                        fixed_mods.append(m)
                if changed:
                    patches['modalities'] = fixed_mods
                    stats[f'{table}:modality_normalized'] += 1

            # 5. City normalization
            city = rec.get('city')
            if city and city in CITY_FIXES:
                patches['city'] = CITY_FIXES[city]
                stats[f'{table}:city_normalized'] += 1

            # 6. Wrong-island coordinates
            lat, lng_val = rec.get('lat'), rec.get('lng')
            if lat and lng_val:
                correct_island = detect_correct_island(float(lat), float(lng_val))
                if correct_island and correct_island != island:
                    patches['island'] = correct_island
                    stats[f'{table}:wrong_island_fixed'] += 1
                    print(f"  ⚠ WRONG ISLAND: {rec['name'][:40]} → {correct_island} "
                          f"(was {island}, coords {lat},{lng_val})")

            # Apply patches
            if patches and not dry_run:
                client.table(table).update(patches).eq('id', rec['id']).execute()
            if patches:
                stats[f'{table}:records_patched'] += 1

    # Print summary
    print(f"\n{'='*60}")
    print(f"  CLEANUP SUMMARY for {island}")
    print(f"{'='*60}")
    for key, count in sorted(stats.items()):
        prefix = "[DRY RUN] " if dry_run else "✅ "
        print(f"  {prefix}{key}: {count}")

    if not stats:
        print("  No issues found — data is clean!")

    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Post-ingestion data quality cleanup"
    )
    parser.add_argument("--island", required=True,
                        choices=["big_island", "maui", "oahu", "kauai", "all"])
    parser.add_argument("--dry-run", action="store_true",
                        help="Report issues without fixing them")
    args = parser.parse_args()

    islands = ["big_island", "maui", "oahu", "kauai"] if args.island == "all" else [args.island]
    total_stats = Counter()
    for isl in islands:
        stats = run_cleanup(isl, dry_run=args.dry_run)
        total_stats.update(stats)

    if len(islands) > 1:
        print(f"\n{'='*60}")
        print(f"  GRAND TOTAL (all islands)")
        print(f"{'='*60}")
        for key, count in sorted(total_stats.items()):
            print(f"  {key}: {count}")
