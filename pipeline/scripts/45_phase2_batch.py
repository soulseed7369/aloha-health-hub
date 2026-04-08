#!/usr/bin/env python3
"""
45_phase2_batch.py — Generate Phase 2 upsell batches from all claimed contacts.

Unlike 41_campaign_segment.py (which queries by segment + not_contacted status),
this script targets contacts who have actually claimed their listing (status='claimed'),
regardless of which segment they were originally placed in.

Usage:
  python scripts/45_phase2_batch.py --dry-run        # Preview who would be included
  python scripts/45_phase2_batch.py                  # Generate batch file + mark as queued
  python scripts/45_phase2_batch.py --island big_island  # Filter by island
  python scripts/45_phase2_batch.py --stats          # Show claimed contact counts

Then send with:
  python scripts/42_campaign_send.py --batch output/batch_phase2_*.json --dry-run
  python scripts/42_campaign_send.py --batch output/batch_phase2_*.json
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from src.supabase_client import client
from src.config import OUTPUT_DIR


def show_stats():
    """Show breakdown of claimed contacts ready for Phase 2."""
    result = client.table("campaign_outreach") \
        .select("island, segment, name, email, claimed_at") \
        .eq("status", "claimed") \
        .execute()
    rows = result.data or []

    print(f"=== Phase 2 Eligible Contacts (status=claimed) ===")
    print(f"Total: {len(rows)}\n")

    by_island = {}
    for r in rows:
        isl = r.get("island", "unknown")
        by_island.setdefault(isl, []).append(r)

    for isl, contacts in sorted(by_island.items()):
        with_email = [c for c in contacts if c.get("email") and "@" in (c.get("email") or "")]
        print(f"  {isl}: {len(contacts)} claimed ({len(with_email)} have email)")

    print(f"\nContactable (has email): {sum(1 for r in rows if r.get('email') and '@' in (r.get('email') or ''))}/{len(rows)}")


def fetch_claimed(island: str = None) -> list:
    """Fetch all claimed contacts not yet in Phase 2."""
    query = client.table("campaign_outreach") \
        .select("*") \
        .eq("status", "claimed") \
        .neq("email", None)

    if island:
        query = query.eq("island", island)

    # Order by claim date — earliest claimants first (most loyal)
    query = query.order("claimed_at", desc=False)

    result = query.execute()
    return result.data or []


def main():
    parser = argparse.ArgumentParser(description="Generate Phase 2 upsell batch from claimed contacts")
    parser.add_argument("--island", help="Filter by island (e.g. big_island)")
    parser.add_argument("--dry-run", action="store_true", help="Preview batch without saving or queuing")
    parser.add_argument("--no-queue", action="store_true", help="Save batch file but don't mark as queued")
    parser.add_argument("--stats", action="store_true", help="Show stats only")
    args = parser.parse_args()

    if args.stats:
        show_stats()
        return

    contacts = fetch_claimed(island=args.island)

    # Filter out contacts with no valid email
    contacts = [c for c in contacts if c.get("email") and "@" in (c.get("email") or "")]

    island_label = args.island or "all_islands"
    print(f"Phase 2 batch — {island_label}: {len(contacts)} claimants with email")

    if not contacts:
        print("No claimed contacts found.")
        return

    # Preview
    print(f"\n--- Contacts ---")
    for i, c in enumerate(contacts, 1):
        seg = c.get("segment", "?")
        mod = (c.get("modalities") or [""])[0] if c.get("modalities") else "?"
        claimed = c.get("claimed_at", "?")[:10] if c.get("claimed_at") else "?"
        print(f"  {i}. {c['name']} — {mod}, {c.get('city', '?')} — {c.get('email')} — claimed {claimed} — segment: {seg}")

    if args.dry_run:
        print(f"\n[DRY RUN] No batch file saved, no DB changes.")
        print(f"Template that would be used: phase2_track_a")
        print(f"\nNext step (when ready):")
        print(f"  python scripts/45_phase2_batch.py --island {args.island or 'big_island'}")
        return

    # Override segment to force Track A template for all claimed contacts
    for c in contacts:
        c["segment"] = "claimed_has_website"

    # Generate batch ID
    batch_id = f"phase2_{island_label}_{datetime.now().strftime('%Y%m%d_%H%M')}"
    for c in contacts:
        c["batch_id"] = batch_id

    # Save batch file
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    batch_file = OUTPUT_DIR / f"batch_{batch_id}.json"
    with open(batch_file, "w") as f:
        json.dump(contacts, f, indent=2, default=str)
    print(f"\nBatch saved: {batch_file}")

    # Mark as queued unless --no-queue
    if not args.no_queue:
        for c in contacts:
            client.table("campaign_outreach").update({
                "status": "email_queued",
                "batch_id": batch_id,
            }).eq("id", c["id"]).execute()
        print(f"Marked {len(contacts)} contacts as email_queued (batch_id={batch_id})")
    else:
        print("[--no-queue] Contacts NOT marked as queued in DB.")

    print(f"\nNext step:")
    print(f"  python scripts/42_campaign_send.py --batch {batch_file} --dry-run")
    print(f"  python scripts/42_campaign_send.py --batch {batch_file}")


if __name__ == "__main__":
    main()
