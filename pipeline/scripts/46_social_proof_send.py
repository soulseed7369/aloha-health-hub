#!/usr/bin/env python3
"""
46_social_proof_send.py — Send the social proof touch to all unclaimed Big Island contacts.

Targets everyone in the unclaimed segment who hasn't claimed or been marked bad_contact.
Uses the phase1_social_proof template.

Usage:
  python scripts/46_social_proof_send.py --dry-run    # Preview without sending
  python scripts/46_social_proof_send.py              # Generate batch + send
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from src.supabase_client import client
from src.resend_client import send_email, SEND_DELAY_SECONDS
from src.email_templates import phase1_social_proof
from src.config import OUTPUT_DIR

SKIP_STATUSES = {"claimed", "upgraded", "bad_contact", "not_interested"}
TEMPLATE_NAME = "phase1_social_proof"


def fetch_unclaimed() -> list:
    result = client.table("campaign_outreach") \
        .select("*") \
        .eq("island", "big_island") \
        .eq("segment", "unclaimed") \
        .neq("email", None) \
        .not_.eq("has_owner", True) \
        .execute()

    rows = result.data or []
    contactable = [
        r for r in rows
        if r.get("email") and "@" in (r.get("email") or "")
        and r.get("status") not in SKIP_STATUSES
    ]
    return contactable


def main():
    parser = argparse.ArgumentParser(description="Send social proof email to unclaimed contacts")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    args = parser.parse_args()

    contacts = fetch_unclaimed()
    print(f"Unclaimed contactable (Big Island): {len(contacts)}")

    if not contacts:
        print("No contacts found.")
        return

    if args.dry_run:
        print(f"\n[DRY RUN] Would send to {len(contacts)} contacts using template: {TEMPLATE_NAME}")
        print(f"\n--- First 5 previews ---")
        for c in contacts[:5]:
            subject, _, text = phase1_social_proof(c)
            print(f"\n  To: {c['name']} <{c['email']}>")
            print(f"  Subject: {subject}")
            print(f"  Preview: {text[:120]}...")
        return

    # Generate batch ID and save log
    batch_id = f"social_proof_big_island_{datetime.now().strftime('%Y%m%d_%H%M')}"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    sent = failed = skipped = 0
    results = []

    for i, contact in enumerate(contacts):
        email = contact.get("email", "")
        name = contact.get("name", "")

        subject, html_body, text_body = phase1_social_proof(contact)

        result = send_email(
            to_email=email,
            to_name=name,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            tags={
                "campaign": "aloha_launch",
                "segment": "unclaimed",
                "template": TEMPLATE_NAME,
                "island": "big_island",
                "batch_id": batch_id,
            },
        )

        if result.get("success"):
            sent += 1
            client.table("campaign_outreach").update({
                "status": "email_3_sent",
                "email_3_sent_at": datetime.now(timezone.utc).isoformat(),
                "email_3_template": TEMPLATE_NAME,
                "batch_id": batch_id,
            }).eq("id", contact["id"]).execute()

            client.table("campaign_emails").insert({
                "outreach_id": contact["id"],
                "resend_id": result.get("id", ""),
                "to_email": email,
                "to_name": name,
                "subject": subject,
                "template": TEMPLATE_NAME,
                "body_preview": text_body[:200],
                "status": "sent",
            }).execute()
        else:
            failed += 1
            error = result.get("error", "")
            if "bounce" in error.lower() or "invalid" in error.lower():
                client.table("campaign_outreach").update({
                    "status": "bad_contact",
                    "notes": f"Send failed: {error}",
                }).eq("id", contact["id"]).execute()

        results.append({"to": email, "name": name, "status": "sent" if result.get("success") else "failed"})

        if (i + 1) % 5 == 0 or i == len(contacts) - 1:
            print(f"  [{i + 1}/{len(contacts)}] sent={sent} failed={failed}")

        if i < len(contacts) - 1:
            time.sleep(SEND_DELAY_SECONDS)

    print(f"\n=== Send Complete ===")
    print(f"  Total:   {len(contacts)}")
    print(f"  Sent:    {sent}")
    print(f"  Failed:  {failed}")

    log_file = OUTPUT_DIR / f"send_log_{batch_id}.json"
    with open(log_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved: {log_file}")


if __name__ == "__main__":
    main()
