"""
16_link_to_centers.py
─────────────────────
Find practitioners who belong to a center and auto-set:
  - business_id  → FK to centers.id
  - business_name → center's display name

Matching strategies (in order):
  1. Practitioner name contains a center name as substring
     e.g. "Stephanie Stago LMT - Hamakua Massage Therapy" → Hamakua Massage Therapy
  2. Practitioner business_name fuzzy-matches a center name
  3. Practitioner city + partial name matches a center in the same city

Only sets business_id / business_name when NOT already set.
Only operates on draft practitioners (never touches published).

Usage
─────
    cd pipeline
    python scripts/16_link_to_centers.py --dry-run
    python scripts/16_link_to_centers.py
"""

from __future__ import annotations
import sys, re, argparse
sys.path.insert(0, '.')
from src.supabase_client import client


def normalize(s: str) -> str:
    return re.sub(r'[^a-z0-9 ]', ' ', (s or '').lower())


def token_set(s: str) -> set[str]:
    return {w for w in normalize(s).split() if len(w) > 2}


def score_match(a: str, b: str) -> float:
    """Jaccard-style token overlap score between two strings."""
    ta, tb = token_set(a), token_set(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def find_best_center(
    practitioner_name: str,
    business_name: str | None,
    city: str | None,
    centers: list[dict],
) -> tuple[dict, float] | None:
    """Return (best_center, score) or None if no confident match."""
    combined = ' '.join(filter(None, [practitioner_name, business_name]))

    best_center = None
    best_score = 0.0

    for c in centers:
        cname = c['name'] or ''
        cnorm = normalize(cname)

        if len(cnorm) < 6:
            continue

        # Strategy 1: center name is a direct substring of practitioner combined text
        if cnorm in normalize(combined):
            score = 0.95
        else:
            score = score_match(combined, cname)

        # Boost if same city
        if city and c.get('city') and city.lower() == c['city'].lower():
            score = min(score * 1.2, 1.0)

        if score > best_score:
            best_score = score
            best_center = c

    if best_score >= 0.85:
        return best_center, best_score
    return None


def run(dry_run: bool) -> None:
    # Fetch all practitioners without a business_id
    p_resp = client.table('practitioners') \
        .select('id, name, business_name, business_id, city, status') \
        .is_('business_id', 'null') \
        .execute()

    # Only consider drafts (don't auto-link published without review)
    practitioners = [r for r in (p_resp.data or []) if r['status'] == 'draft']

    # Fetch all centers
    c_resp = client.table('centers').select('id, name, city, status').execute()
    centers = c_resp.data or []

    print(f"Practitioners without business_id (draft): {len(practitioners)}")
    print(f"Centers available:                         {len(centers)}")

    linked = 0
    skipped = 0

    for p in practitioners:
        result = find_best_center(
            p['name'], p['business_name'], p.get('city'), centers
        )
        if not result:
            skipped += 1
            continue

        center, score = result
        print(f"\n  Match (score={score:.2f})")
        print(f"    Practitioner: {p['name']}")
        print(f"    Center:       {center['name']} ({center.get('city', '')})")

        if dry_run:
            linked += 1
            continue

        client.table('practitioners').update({
            'business_id':   center['id'],
            'business_name': center['name'],
        }).eq('id', p['id']).execute()
        linked += 1

    print(f"\n{'Would link' if dry_run else 'Linked'}: {linked}")
    print(f"No match:                   {skipped}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    if args.dry_run:
        print("⚠️  DRY-RUN — no changes written.\n")

    run(args.dry_run)
    print("\n✓ Done.")
