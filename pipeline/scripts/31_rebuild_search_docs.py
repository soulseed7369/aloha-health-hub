#!/usr/bin/env python3
"""
Rebuild search documents and profile completeness for all listings.

This script:
1. Touches every practitioner and center row to fire the search_document trigger
   (which rebuilds the tsvector from taxonomy join tables)
2. Calls update_all_profile_completeness() to recompute scores

Prerequisites:
- Sprint 1 migrations applied (taxonomy tables + search columns + triggers)
- Sprint 2 backfill (30_backfill_taxonomy.py) already run
- Profile completeness migration (20260310000006) applied

Usage:
  python scripts/31_rebuild_search_docs.py
  python scripts/31_rebuild_search_docs.py --dry-run
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.supabase_client import client


def rebuild_tsvectors(dry_run: bool):
    """Touch every listing row to fire the search_document build trigger."""
    print("═══ Rebuilding search_document tsvectors ═══")

    # Fetch all practitioner IDs
    practitioners = client.table("practitioners").select("id").limit(10000).execute().data
    centers = client.table("centers").select("id").limit(10000).execute().data

    print(f"  {len(practitioners)} practitioners, {len(centers)} centers")

    if dry_run:
        print("  [dry-run] Would touch all rows to fire triggers")
        return

    # Touch practitioners — update updated_at to trigger the BEFORE UPDATE trigger
    # We set updated_at = now() which is a no-op in terms of data but fires the trigger
    p_count = 0
    for p in practitioners:
        client.table("practitioners").update({"updated_at": "now()"}).eq("id", p["id"]).execute()
        p_count += 1
        if p_count % 50 == 0:
            print(f"  ... touched {p_count}/{len(practitioners)} practitioners")

    c_count = 0
    for c in centers:
        client.table("centers").update({"updated_at": "now()"}).eq("id", c["id"]).execute()
        c_count += 1
        if c_count % 50 == 0:
            print(f"  ... touched {c_count}/{len(centers)} centers")

    print(f"  ✓ Touched {p_count} practitioners, {c_count} centers")


def rebuild_profile_completeness(dry_run: bool):
    """Call the batch profile completeness function."""
    print("\n═══ Rebuilding profile_completeness scores ═══")

    if dry_run:
        print("  [dry-run] Would call update_all_profile_completeness()")
        return

    result = client.rpc("update_all_profile_completeness").execute()
    if result.data:
        row = result.data[0] if isinstance(result.data, list) else result.data
        print(f"  ✓ Updated {row.get('practitioners_updated', '?')} practitioners, "
              f"{row.get('centers_updated', '?')} centers")
    else:
        print("  ✓ Profile completeness updated (no count returned)")


def print_stats():
    """Print some stats about the rebuilt data."""
    print("\n═══ Post-rebuild stats ═══")

    # Sample a few practitioners to verify tsvector was built
    sample = client.table("practitioners") \
        .select("name,search_document,profile_completeness") \
        .neq("search_document", None) \
        .limit(5) \
        .execute().data

    if sample:
        print("  Sample practitioners with search_document:")
        for s in sample:
            doc_len = len(s.get("search_document") or "")
            print(f"    {s['name']}: tsvector={doc_len} chars, completeness={s.get('profile_completeness', 0)}%")
    else:
        print("  ⚠ No practitioners have search_document set yet")
        print("    (This is expected if the trigger migration hasn't been applied)")

    # Completeness distribution
    for table in ["practitioners", "centers"]:
        rows = client.table(table).select("profile_completeness").limit(10000).execute().data
        if rows:
            scores = [r.get("profile_completeness", 0) or 0 for r in rows]
            avg = sum(scores) / len(scores)
            hi = max(scores)
            lo = min(scores)
            print(f"  {table}: avg={avg:.0f}%, min={lo}%, max={hi}% (n={len(scores)})")


def main():
    parser = argparse.ArgumentParser(description="Rebuild search documents and profile completeness")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    rebuild_tsvectors(args.dry_run)
    rebuild_profile_completeness(args.dry_run)

    if not args.dry_run:
        print_stats()

    print("\n✅ Rebuild complete!")


if __name__ == "__main__":
    main()
