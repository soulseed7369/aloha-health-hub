#!/usr/bin/env python3
"""
44_campaign_export.py — Export campaign data to JSON for the command center dashboard.

Usage:
  python scripts/44_campaign_export.py
  python scripts/44_campaign_export.py --output /path/to/custom_output.json
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent))
from src.supabase_client import client
from src.config import OUTPUT_DIR


def fetch_all_outreach() -> list:
    """Fetch all campaign_outreach rows."""
    result = client.table("campaign_outreach").select("*").order("priority", desc=True).execute()
    return result.data or []


def fetch_all_emails() -> list:
    """Fetch all campaign_emails rows."""
    result = client.table("campaign_emails").select("*").order("sent_at", desc=True).execute()
    return result.data or []

def fetch_true_claims() -> dict:
    """
    Count listings that have been claimed (owner_id IS NOT NULL) across both
    practitioners and centers tables. This is the authoritative claim count —
    campaign_outreach.status='claimed' misses direct claims and all centers.
    """
    pract_result = client.table("practitioners").select("id", count="exact").not_.is_("owner_id", "null").execute()
    center_result = client.table("centers").select("id", count="exact").not_.is_("owner_id", "null").execute()

    practitioners_claimed = pract_result.count or 0
    centers_claimed = center_result.count or 0

    return {
        "practitioners_claimed": practitioners_claimed,
        "centers_claimed": centers_claimed,
        "total": practitioners_claimed + centers_claimed,
    }


def compute_summary(outreach: list) -> dict:
    """Compute summary statistics from outreach data."""
    total = len(outreach)
    by_segment = defaultdict(int)
    by_status = defaultdict(int)
    by_island = defaultdict(int)
    by_island_segment = defaultdict(lambda: defaultdict(int))
    with_email = 0
    contactable_not_contacted = 0

    for row in outreach:
        seg = row.get("segment", "unknown")
        status = row.get("status", "unknown")
        island = row.get("island", "unknown")

        by_segment[seg] += 1
        by_status[status] += 1
        by_island[island] += 1
        by_island_segment[island][seg] += 1

        if row.get("email") and "@" in (row["email"] or ""):
            with_email += 1
            if status == "not_contacted":
                contactable_not_contacted += 1

    return {
        "total": total,
        "with_email": with_email,
        "contactable_not_contacted": contactable_not_contacted,
        "by_segment": dict(by_segment),
        "by_status": dict(by_status),
        "by_island": dict(by_island),
        "by_island_segment": {k: dict(v) for k, v in by_island_segment.items()},
    }


def compute_funnel(outreach: list, phase: str) -> dict:
    """Compute funnel metrics for a campaign phase."""
    phase_rows = [r for r in outreach if r.get("phase") == phase]

    stages = {
        "not_contacted": 0,
        "email_queued": 0,
        "email_sent": 0,  # email_1_sent + email_2_sent
        "opened": 0,      # email_1_opened
        "replied": 0,
        "converted": 0,   # claimed (phase1) or upgraded/bundle_sold (phase2)
    }

    for row in phase_rows:
        status = row.get("status", "")
        if status == "not_contacted":
            stages["not_contacted"] += 1
        elif status == "email_queued":
            stages["email_queued"] += 1
        elif status in ("email_1_sent", "email_2_sent", "sms_sent", "called", "call_scheduled"):
            stages["email_sent"] += 1
        elif status == "email_1_opened":
            stages["opened"] += 1
        elif status == "replied":
            stages["replied"] += 1
        elif status in ("claimed", "upgraded", "bundle_sold"):
            stages["converted"] += 1

    total_contacted = stages["email_sent"] + stages["opened"] + stages["replied"] + stages["converted"]
    stages["total_contacted"] = total_contacted

    # Rates
    if total_contacted > 0:
        stages["open_rate"] = round((stages["opened"] + stages["replied"] + stages["converted"]) / total_contacted * 100, 1)
        stages["reply_rate"] = round((stages["replied"] + stages["converted"]) / total_contacted * 100, 1)
        stages["conversion_rate"] = round(stages["converted"] / total_contacted * 100, 1)
    else:
        stages["open_rate"] = 0
        stages["reply_rate"] = 0
        stages["conversion_rate"] = 0

    return stages


def compute_email_stats(emails: list) -> dict:
    """Compute email performance metrics."""
    total = len(emails)
    by_status = defaultdict(int)
    by_template = defaultdict(lambda: defaultdict(int))

    for email in emails:
        status = email.get("status", "unknown")
        template = email.get("template", "unknown")
        by_status[status] += 1
        by_template[template][status] += 1

    # Template performance
    template_stats = {}
    for template, statuses in by_template.items():
        sent = sum(statuses.values())
        opened = statuses.get("opened", 0) + statuses.get("clicked", 0)
        template_stats[template] = {
            "sent": sent,
            "delivered": statuses.get("delivered", 0) + opened,
            "opened": opened,
            "clicked": statuses.get("clicked", 0),
            "bounced": statuses.get("bounced", 0),
            "open_rate": round(opened / sent * 100, 1) if sent > 0 else 0,
        }

    return {
        "total_sent": total,
        "by_status": dict(by_status),
        "by_template": template_stats,
    }


def compute_revenue(outreach: list) -> dict:
    """Compute revenue tracking metrics."""
    mrr = 0
    onetime = 0
    conversions = {"premium": 0, "featured": 0, "essentials_bundle": 0, "standard_bundle": 0, "pro_bundle": 0}

    for row in outreach:
        if row.get("status") in ("upgraded", "bundle_sold"):
            upgraded_to = row.get("upgraded_to", "")
            monthly = float(row.get("revenue_monthly") or 0)
            once = float(row.get("revenue_onetime") or 0)
            mrr += monthly
            onetime += once
            if upgraded_to in conversions:
                conversions[upgraded_to] += 1

    return {
        "mrr": round(mrr, 2),
        "onetime": round(onetime, 2),
        "total_revenue": round(mrr + onetime, 2),
        "conversions": conversions,
    }


def compute_activity_timeline(emails: list, outreach: list) -> list:
    """Compute daily activity for timeline chart."""
    daily = defaultdict(lambda: {"emails_sent": 0, "opened": 0, "claimed": 0, "upgraded": 0})

    for email in emails:
        sent_at = email.get("sent_at", "")
        if sent_at:
            day = sent_at[:10]  # YYYY-MM-DD
            daily[day]["emails_sent"] += 1

    for row in outreach:
        if row.get("claimed_at"):
            day = str(row["claimed_at"])[:10]
            daily[day]["claimed"] += 1
        if row.get("upgraded_at"):
            day = str(row["upgraded_at"])[:10]
            daily[day]["upgraded"] += 1

    # Sort by date
    timeline = [{"date": k, **v} for k, v in sorted(daily.items())]
    return timeline


def main():
    parser = argparse.ArgumentParser(description="Export campaign data for dashboard")
    parser.add_argument("--output", help="Custom output path (default: output/campaign_data.json)")
    args = parser.parse_args()

    print("Fetching campaign data...")
    outreach = fetch_all_outreach()
    emails = fetch_all_emails()
    true_claims = fetch_true_claims()

    print(f"  Outreach rows: {len(outreach)}")
    print(f"  Email records: {len(emails)}")
    print(f"  True claims:   {true_claims['total']} ({true_claims['practitioners_claimed']} practitioners + {true_claims['centers_claimed']} centers)")

    print("Computing metrics...")
    summary = compute_summary(outreach)
    summary["true_claims_total"] = true_claims["total"]
    summary["true_claims_breakdown"] = true_claims

    data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "funnel_phase1": compute_funnel(outreach, "phase1"),
        "funnel_phase2": compute_funnel(outreach, "phase2"),
        "email_stats": compute_email_stats(emails),
        "revenue": compute_revenue(outreach),
        "activity_timeline": compute_activity_timeline(emails, outreach),
        "contacts": outreach,
        "emails": emails[:500],  # Cap at 500 for dashboard perf
    }

    # Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = Path(args.output) if args.output else OUTPUT_DIR / "campaign_data.json"
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2, default=str)

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f"\nExported to: {output_path} ({size_mb:.1f} MB)")

    # Quick summary
    s = data["summary"]
    print(f"\n=== Campaign Summary ===")
    print(f"  Total contacts:    {s['total']}")
    print(f"  With email:        {s['with_email']}")
    print(f"  Not yet contacted: {s['contactable_not_contacted']}")
    print(f"\n  Phase 1 funnel:    {data['funnel_phase1']['total_contacted']} contacted → {data['funnel_phase1']['converted']} converted")
    print(f"  Phase 2 funnel:    {data['funnel_phase2']['total_contacted']} contacted → {data['funnel_phase2']['converted']} converted")
    print(f"  MRR:               ${data['revenue']['mrr']}")
    print(f"  One-time revenue:  ${data['revenue']['onetime']}")


if __name__ == "__main__":
    main()
