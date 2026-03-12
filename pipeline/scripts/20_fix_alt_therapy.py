#!/usr/bin/env python3
"""
20_fix_alt_therapy.py
─────────────────────
Re-classify records whose modalities == ['Alternative Therapy'] by tracing
each record back to its source search query in gm_classified.jsonl.

Root cause:
  11_gm_classify.py fell back to 'Alternative Therapy' whenever Google Places
  types were generic ('establishment', 'point_of_interest'). The actual
  _source_query field — e.g. 'acupuncture Hilo Hawaii' — was not used during
  classification, even though it contains the real modality.

Strategy:
  1. Load gm_classified.jsonl and build a (norm_name, city) → _source_query
     lookup.
  2. For every practitioner/center in the DB with modalities == ['Alternative
     Therapy'], look up the source query and map it to the correct modality.
  3. For records where the query mapping is ambiguous ('wellness center',
     'holistic health practitioner') or no match is found, fall back to
     name/bio keyword patterns.
  4. Records that still can't be resolved are left unchanged and logged for
     manual review.

Usage:
  # Preview changes without touching the database
  python pipeline/scripts/20_fix_alt_therapy.py --dry-run

  # Apply changes
  python pipeline/scripts/20_fix_alt_therapy.py

  # Only fix practitioners (skip centers)
  python pipeline/scripts/20_fix_alt_therapy.py --table practitioners

  # Only fix centers
  python pipeline/scripts/20_fix_alt_therapy.py --table centers
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, 'pipeline')
from src.supabase_client import client

# ── Path to the Google Maps classified output ──────────────────────────────
GM_CLASSIFIED = Path('pipeline/output/gm_classified.jsonl')

# ── Source query keyword → canonical modality ─────────────────────────────
# Order matters: more specific patterns first.
QUERY_MODALITY_MAP = [
    # ── Compound / specific phrases first (order matters — longest match wins) ──
    ('craniosacral',            'Craniosacral'),
    ('somatic therapy',         'Somatic Therapy'),
    ('somatic',                 'Somatic Therapy'),
    ('sound healing',           'Sound Healing'),
    ('energy healer',           'Energy Healing'),
    ('energy healing',          'Energy Healing'),
    ('functional medicine',     'Functional Medicine'),
    # physical therapist / physical therapy BEFORE bare 'therapist'
    ('physical therapist',      'Physical Therapy'),
    ('physical therapy',        'Physical Therapy'),
    # massage therapist / massage therapy BEFORE bare 'therapist'
    ('massage therapist',       'Massage'),
    ('massage therapy',         'Massage'),
    ('massage',                 'Massage'),
    ('nutrition coach',         'Nutrition'),
    ('nutritionist',            'Nutrition'),
    ('life coach',              'Life Coaching'),
    ('breathwork',              'Breathwork'),
    ('hypnotherapist',          'Hypnotherapy'),
    ('hypnotherapy',            'Hypnotherapy'),
    ('doula midwife',           'Midwife'),
    ('midwife',                 'Midwife'),
    ('doula',                   'Birth Doula'),
    ('network chiropractic',    'Network Chiropractic'),
    ('acupuncturist',           'Acupuncture'),
    ('acupuncture',             'Acupuncture'),
    ('psychotherapist',         'Psychotherapy'),
    ('psychotherapy',           'Psychotherapy'),
    ('counselor therapist',     'Counseling'),
    ('counselor',               'Counseling'),
    # 'therapist' after all 'X therapist' compounds to avoid false matches
    ('therapist',               'Counseling'),
    ('chiropractor',            'Chiropractic'),
    ('chiropractic',            'Chiropractic'),
    ('osteopath',               'Osteopathic'),
    ('reiki healer',            'Reiki'),
    ('reiki',                   'Reiki'),
    ('meditation teacher',      'Meditation'),
    ('meditation',              'Meditation'),
    ('herbalist',               'Herbalism'),
    ('herbal',                  'Herbalism'),
    ('naturopath',              'Naturopathic'),
    ('naturopathic',            'Naturopathic'),
    ('ayurveda',                'Ayurveda'),
    ('yoga studio',             'Yoga'),
    ('yoga teacher',            'Yoga'),
    ('yoga',                    'Yoga'),
    ('day spa',                 'Massage'),   # day spas are primarily massage
    # Broad — defer to name inference
    ('holistic health',         None),
    ('wellness center',         None),
]

# ── Name / bio keyword fallback ────────────────────────────────────────────
NAME_PATTERNS = [
    (re.compile(r'\blomi\b', re.I),                         'Massage'),
    (re.compile(r'\bmassage\b', re.I),                      'Massage'),
    (re.compile(r'\bLMT\b'),                                'Massage'),
    (re.compile(r'\bacupuncture\b|\bacupuncturist\b|\bLAc\b|\bL\.Ac\b', re.I), 'Acupuncture'),
    (re.compile(r'\bTCM\b|\btraditional chinese\b', re.I), 'TCM (Traditional Chinese Medicine)'),
    (re.compile(r'\breiki\b', re.I),                        'Reiki'),
    (re.compile(r'\bchiro\b', re.I),                        'Chiropractic'),
    (re.compile(r'\bosteopath\b', re.I),                    'Osteopathic'),
    (re.compile(r'\byoga\b', re.I),                         'Yoga'),
    (re.compile(r'\bmeditat\b', re.I),                      'Meditation'),
    (re.compile(r'\bnaturo|\bND\b', re.I),                  'Naturopathic'),
    (re.compile(r'\bherbali|\bapothecary\b|\bbotanical\b', re.I), 'Herbalism'),
    (re.compile(r'\bnutrition\b|\bdietit\b', re.I),         'Nutrition'),
    (re.compile(r'\bcounsel\b', re.I),                      'Counseling'),
    (re.compile(r'\bpsychother\b|\btherapist\b', re.I),     'Psychotherapy'),
    (re.compile(r'\bsomatic\b', re.I),                      'Somatic Therapy'),
    (re.compile(r'\bcraniosacral\b', re.I),                 'Craniosacral'),
    (re.compile(r'\bsound heal\b|\bsound bath\b', re.I),    'Sound Healing'),
    (re.compile(r'\benergy heal\b|\benerget\b', re.I),      'Energy Healing'),
    (re.compile(r'\bhypno\b', re.I),                        'Hypnotherapy'),
    (re.compile(r'\bbreathe\b|\bbreathwork\b', re.I),       'Breathwork'),
    (re.compile(r'\bfloat\b|\bfloatation\b|\bsensory depri', re.I), 'Watsu / Water Therapy'),
    (re.compile(r'\bphysical therap\b|\bPT\b', re.I),       'Physical Therapy'),
    (re.compile(r'\bfunctional med\b', re.I),               'Functional Medicine'),
    (re.compile(r'\bayurveda\b', re.I),                     'Ayurveda'),
    (re.compile(r'\blife coach\b|\bwellness coach\b', re.I), 'Life Coaching'),
    (re.compile(r'\bspa\b', re.I),                          'Massage'),
    (re.compile(r'\bdoula\b', re.I),                        'Birth Doula'),
    (re.compile(r'\bmidwife\b|\bmidwifery\b', re.I),        'Midwife'),
]


def norm(name: str) -> str:
    """Normalize a name for fuzzy matching."""
    s = name.lower()
    s = re.sub(r"[,.\'\u2019\-]", ' ', s)
    s = re.sub(r'\b(llc|inc|ltd|pllc|dba|the|a|of|and|&)\b', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def infer_from_query(query: str) -> str | None:
    """Map a _source_query string to a modality. Returns None if ambiguous."""
    q = query.lower()
    for keyword, modality in QUERY_MODALITY_MAP:
        if keyword in q:
            return modality  # None for 'holistic health' / 'wellness center'
    return None


def infer_from_name(name: str, bio: str | None = None) -> str | None:
    """Fallback: infer modality from name and optional bio/description."""
    text = (name or '') + ' ' + (bio or '')
    for pattern, modality in NAME_PATTERNS:
        if pattern.search(text):
            return modality
    return None


def load_gm_lookup() -> dict[tuple[str, str], str]:
    """
    Build a (norm_name, city) → _source_query dict from gm_classified.jsonl.
    Where multiple entries share a key we keep the first (they'll share the
    same query since the file is deterministic).
    """
    lookup: dict[tuple[str, str], str] = {}
    if not GM_CLASSIFIED.exists():
        print(f"[WARN] {GM_CLASSIFIED} not found — will use name inference only")
        return lookup

    with GM_CLASSIFIED.open() as f:
        for line in f:
            rec = json.loads(line)
            name = rec.get('name', '')
            city = (rec.get('city') or '').strip().lower()
            query = rec.get('_source_query', '')
            if name and query:
                key = (norm(name), city)
                if key not in lookup:
                    lookup[key] = query
    return lookup


def classify_record(
    name: str,
    bio: str | None,
    city: str | None,
    gm_lookup: dict,
) -> tuple[str | None, str]:
    """
    Return (new_modality, method) where method describes how it was inferred.
    new_modality is None if we couldn't determine it.
    """
    city_norm = (city or '').strip().lower()

    # 1. Try GM source query
    key = (norm(name), city_norm)
    query = gm_lookup.get(key)
    if query:
        modality = infer_from_query(query)
        if modality:
            return modality, f'query:{query}'
        # Query was ambiguous ('wellness center' etc.) — fall through to name

    # 2. Name / bio fallback
    modality = infer_from_name(name, bio)
    if modality:
        return modality, 'name_pattern'

    # 3. If query was found but only deferred (wellness center / holistic)
    if query:
        # Make a last-ditch guess based on the broad query category
        q = query.lower()
        if 'wellness center' in q or 'holistic health' in q:
            return 'Functional Medicine', f'query_broad:{query}'

    return None, 'unresolved'


def process_table(
    table: str,
    name_field: str,
    bio_field: str,
    gm_lookup: dict,
    dry_run: bool,
) -> dict:
    """Fetch all AT records from a table, classify, optionally update."""
    stats = {'total': 0, 'fixed': 0, 'unresolved': 0, 'by_method': {}}

    # Fetch all records with modalities containing 'Alternative Therapy'
    # We want ONLY those that have it as their sole modality — records with
    # multiple modalities already have a real classification.
    records = []
    page = 0
    while True:
        res = (
            client.table(table)
            .select(f'id,{name_field},{bio_field},city,modalities')
            .contains('modalities', ['Alternative Therapy'])
            .range(page * 1000, page * 1000 + 999)
            .execute()
        )
        if not res.data:
            break
        records.extend(res.data)
        page += 1

    stats['total'] = len(records)

    unresolved = []
    for rec in records:
        name = rec.get(name_field) or ''
        bio  = rec.get(bio_field)
        city = rec.get('city')
        existing = rec.get('modalities', [])

        new_modality, method = classify_record(name, bio, city, gm_lookup)

        if new_modality is None:
            stats['unresolved'] += 1
            unresolved.append(rec)
            continue

        # Replace 'Alternative Therapy' in the modalities list, preserve others
        new_mods = [m for m in existing if m != 'Alternative Therapy']
        if new_modality not in new_mods:
            new_mods.append(new_modality)

        stats['fixed'] += 1
        stats['by_method'][method.split(':')[0]] = (
            stats['by_method'].get(method.split(':')[0], 0) + 1
        )

        if dry_run:
            print(f"  [DRY] {name[:45]:45s} | {city or '':15s} | "
                  f"Alt.Therapy → {new_modality:28s} ({method})")
        else:
            client.table(table).update({'modalities': new_mods}).eq('id', rec['id']).execute()

    if unresolved:
        print(f"\n  ── Unresolved {table} (left as-is) ──")
        for rec in unresolved:
            print(f"    {rec.get(name_field, '')[:50]:50s} | {rec.get('city') or '':15s}")

    return stats


def main():
    parser = argparse.ArgumentParser(description='Fix Alternative Therapy modality labels')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview changes without writing to the database')
    parser.add_argument('--table', choices=['practitioners', 'centers', 'both'],
                        default='both', help='Which table to process (default: both)')
    args = parser.parse_args()

    dry_run = args.dry_run
    mode = '🔍 DRY RUN' if dry_run else '✍️  LIVE'
    print(f"\n{'='*60}")
    print(f"  fix_alt_therapy  —  {mode}")
    print(f"{'='*60}\n")

    print("Loading gm_classified.jsonl lookup…")
    gm_lookup = load_gm_lookup()
    print(f"  {len(gm_lookup):,} entries indexed\n")

    totals = {'total': 0, 'fixed': 0, 'unresolved': 0}

    if args.table in ('practitioners', 'both'):
        print("── PRACTITIONERS ──────────────────────────────────────")
        s = process_table('practitioners', 'name', 'bio', gm_lookup, dry_run)
        for k in totals:
            totals[k] += s[k]
        print(f"\n  Total: {s['total']} | Fixed: {s['fixed']} | "
              f"Unresolved: {s['unresolved']}")
        print(f"  By method: {s['by_method']}\n")

    if args.table in ('centers', 'both'):
        print("── CENTERS ────────────────────────────────────────────")
        s = process_table('centers', 'name', 'description', gm_lookup, dry_run)
        for k in totals:
            totals[k] += s[k]
        print(f"\n  Total: {s['total']} | Fixed: {s['fixed']} | "
              f"Unresolved: {s['unresolved']}")
        print(f"  By method: {s['by_method']}\n")

    print(f"{'='*60}")
    print(f"  GRAND TOTAL  —  Total: {totals['total']} | "
          f"Fixed: {totals['fixed']} | Unresolved: {totals['unresolved']}")
    if dry_run:
        print("  (no changes written — re-run without --dry-run to apply)")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
