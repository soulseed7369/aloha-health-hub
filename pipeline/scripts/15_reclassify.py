"""
15_reclassify.py
────────────────
Auto-reclassify obvious misclassified records from the Google Maps pipeline.

Problems it fixes
─────────────────
1. CENTERS that are actually individual practitioners
   (personal names, medical/therapy credentials, reversed Last/First format)
   → Moves them to the practitioners table.

2. PRACTITIONERS that are clearly businesses with no personal name
   (names containing LLC, Clinic, Studio, Center, Wellness, etc.)
   → Moves them to the centers table.

Only operates on DRAFT records — published records are never touched.

Usage
─────
    cd pipeline
    python scripts/15_reclassify.py --dry-run       # preview only
    python scripts/15_reclassify.py                 # apply changes
    python scripts/15_reclassify.py --only centers  # only fix centers→practitioners
    python scripts/15_reclassify.py --only practitioners # only fix practitioners→centers
"""

from __future__ import annotations
import sys, re, argparse
sys.path.insert(0, '.')
from src.supabase_client import client


# ── Patterns ──────────────────────────────────────────────────────────────────

# Credentials that definitively identify a person
CREDENTIALS = re.compile(
    r'\b(lmt|lcsw|rn|phd|ph\.d|psyd|psy\.d|nd|lac|dac|nmd|dpt|mft|ma\b|'
    r'lmhc|cnm|aprn|pa\b|do\b|dc\b|md\b|ms\b|msc|fnp|crna|rd\b|cns|'
    r'nbcch|chc|cht|cmt|bcba|lpc|lpcc)\b',
    re.IGNORECASE,
)

# Words that strongly indicate a business (not a person)
BUSINESS_WORDS = re.compile(
    r'\b(center|studio|clinic|wellness|spa|health|healing|therapy|therapies|'
    r'institute|school|academy|services|care|llc|inc\b|co\b|association|'
    r'foundation|practice|medical|house|farm|ranch|retreat|gymnasium|gym|'
    r'chiropractic\s+clinic|acupuncture\s+clinic|massage\s+clinic|'
    r'yoga\s+studio|pilates\s+studio)\b',
    re.IGNORECASE,
)

# "Firstname Lastname" — two capitalised words, no business words
PERSON_FIRST_LAST = re.compile(
    r"^[A-ZÀ-Ö\u02bb\u02bc'][a-zA-ZÀ-Öà-öÀ-ÿ'\-]+"
    r"\s+"
    r"[A-ZÀ-Ö\u02bb\u02bc'][a-zA-ZÀ-Öà-öÀ-ÿ'\-]+$"
)

# "Lastname Firstname" reversed format (common in GM data)
REVERSED_NAME = re.compile(
    r'^[A-Z][a-z]+ [A-Z][a-z]+$'
)

# Dr. prefix
DR_PREFIX = re.compile(r'^(Dr\.?|Doctor)\s+', re.IGNORECASE)

# "Person - Business" or "Person @ Business" hybrid names in practitioners
# These should stay as practitioners (person with business name)
PERSON_DASH_BIZ = re.compile(
    r'^[A-Z][a-z]+ [A-Z][a-z].*[-–—@]', re.IGNORECASE
)


def is_person_name(name: str) -> bool:
    """Return True if name looks like an individual person, not a business."""
    name = name.strip()
    if not name:
        return False
    # Has credentials → definitely a person
    if CREDENTIALS.search(name):
        return True
    # Has Dr. prefix → person
    if DR_PREFIX.match(name):
        return True
    # Contains business keywords → not a person
    if BUSINESS_WORDS.search(name):
        return False
    # Clean two-word name with capitals → probably a person
    words = name.split()
    if len(words) == 2 and all(w[0].isupper() for w in words if w):
        return True
    return False


def is_pure_business(name: str) -> bool:
    """
    Return True if the practitioner name is a pure business name
    with no personal name component.
    """
    name = name.strip()
    # If it looks like "Person - Business", keep as practitioner
    if PERSON_DASH_BIZ.match(name):
        return False
    # Has credentials → person, not a business
    if CREDENTIALS.search(name):
        return False
    # Has Dr. prefix → person
    if DR_PREFIX.match(name):
        return False
    # Must have a business keyword to be considered a business
    return bool(BUSINESS_WORDS.search(name))


# ── Move center → practitioner ────────────────────────────────────────────────

def move_center_to_practitioner(row: dict, dry_run: bool) -> bool:
    """Insert a center row as a practitioner and delete the center."""
    name = row['name']

    # Map center fields → practitioner fields
    new_p = {
        'name':              name,
        'modalities':        row.get('modalities') or [],
        'bio':               row.get('description') or None,
        'island':            row.get('island') or 'big_island',
        'region':            row.get('region') or None,
        'city':              row.get('city') or None,
        'address':           row.get('address') or None,
        'lat':               row.get('lat') or None,
        'lng':               row.get('lng') or None,
        'phone':             row.get('phone') or None,
        'email':             row.get('email') or None,
        'website_url':       row.get('website_url') or None,
        'avatar_url':        row.get('avatar_url') or None,
        'status':            'draft',
        'tier':              'free',
        'accepts_new_clients': True,
        'session_type':      'in_person',
        'is_featured':       False,
        'social_links':      row.get('social_links') or {},
        'working_hours':     row.get('working_hours') or {},
        'testimonials':      [],
        'retreat_links':     [],
    }

    if dry_run:
        print(f"    [dry-run] Would move center→practitioner: {name}")
        return True

    try:
        ins = client.table('practitioners').insert(new_p).execute()
        if ins.data:
            client.table('centers').delete().eq('id', row['id']).execute()
            return True
    except Exception as e:
        print(f"    ERROR moving {name}: {e}")
    return False


# ── Move practitioner → center ────────────────────────────────────────────────

def move_practitioner_to_center(row: dict, dry_run: bool) -> bool:
    """Insert a practitioner row as a center and delete the practitioner."""
    name = row['name']

    new_c = {
        'name':             name,
        'center_type':      'wellness_center',
        'description':      row.get('bio') or None,
        'island':           row.get('island') or 'big_island',
        'region':           row.get('region') or None,
        'city':             row.get('city') or None,
        'address':          row.get('address') or None,
        'lat':              row.get('lat') or None,
        'lng':              row.get('lng') or None,
        'phone':            row.get('phone') or None,
        'email':            row.get('email') or None,
        'website_url':      row.get('website_url') or None,
        'avatar_url':       row.get('avatar_url') or None,
        'modalities':       row.get('modalities') or [],
        'status':           'draft',
        'tier':             'free',
        'session_type':     'in_person',
        'is_featured':      False,
        'social_links':     row.get('social_links') or {},
        'working_hours':    row.get('working_hours') or {},
        'testimonials':     [],
        'photos':           row.get('photos') or [],
    }

    if dry_run:
        print(f"    [dry-run] Would move practitioner→center: {name}")
        return True

    try:
        ins = client.table('centers').insert(new_c).execute()
        if ins.data:
            client.table('practitioners').delete().eq('id', row['id']).execute()
            return True
    except Exception as e:
        print(f"    ERROR moving {name}: {e}")
    return False


# ── Main ──────────────────────────────────────────────────────────────────────

def fix_centers(dry_run: bool) -> None:
    print("\n── Fixing centers that are actually people ───────────────────")
    resp = client.table('centers').select('*').eq('status', 'draft').execute()
    rows = resp.data or []
    print(f"  {len(rows)} draft centers to scan")

    to_move = [r for r in rows if is_person_name(r.get('name') or '')]
    print(f"  {len(to_move)} identified as person names")

    moved = 0
    for row in to_move:
        ok = move_center_to_practitioner(row, dry_run)
        if ok:
            moved += 1
            if not dry_run:
                print(f"  ✓ Moved: {row['name']}")

    print(f"  {'Would move' if dry_run else 'Moved'}: {moved}")


def fix_practitioners(dry_run: bool) -> None:
    print("\n── Fixing practitioners that are actually businesses ──────────")
    resp = client.table('practitioners').select('*').eq('status', 'draft').execute()
    rows = resp.data or []
    print(f"  {len(rows)} draft practitioners to scan")

    to_move = [r for r in rows if is_pure_business(r.get('name') or '')]
    print(f"  {len(to_move)} identified as pure business names")

    moved = 0
    for row in to_move:
        ok = move_practitioner_to_center(row, dry_run)
        if ok:
            moved += 1
            if not dry_run:
                print(f"  ✓ Moved: {row['name']}")

    print(f"  {'Would move' if dry_run else 'Moved'}: {moved}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Auto-reclassify misclassified GM records.')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing.')
    parser.add_argument('--only', choices=['centers', 'practitioners'], help='Run only one direction.')
    args = parser.parse_args()

    if args.dry_run:
        print("⚠️  DRY-RUN — no changes will be written.\n")

    if args.only != 'practitioners':
        fix_centers(args.dry_run)
    if args.only != 'centers':
        fix_practitioners(args.dry_run)

    print("\n✓ Done.")
