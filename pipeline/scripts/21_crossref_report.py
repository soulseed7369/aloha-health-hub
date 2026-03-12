"""
21_crossref_report.py
─────────────────────
Cross-reference Google Maps results against the existing Supabase DB and
produce a human-readable markdown report.

Reads:
  pipeline/output/gm_new.jsonl          — new listings Google has, DB doesn't
  pipeline/output/gm_enrichments.jsonl  — existing listings with blank fields GM can fill
  pipeline/output/gm_review.jsonl       — ambiguous / conflict cases
  pipeline/output/gm_classified.jsonl   — full GM dataset (for coverage stats)

Queries Supabase for all Big Island practitioners + centers.

Outputs:
  pipeline/output/crossref_report.md

Usage:
    cd pipeline
    python scripts/21_crossref_report.py [--island big_island]
"""

from __future__ import annotations
import argparse
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
import sys

sys.path.insert(0, '.')
from src.config import OUTPUT_DIR
from src.supabase_client import client

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return records


def fmt_modalities(mods) -> str:
    if not mods:
        return "_none_"
    if isinstance(mods, list):
        return ", ".join(mods)
    return str(mods)


def blank_fields(rec: dict) -> list[str]:
    """Return list of important fields that are blank/null in a DB record."""
    important = ['phone', 'website_url', 'email', 'address', 'lat', 'lng', 'avatar_url', 'bio']
    return [f for f in important if not rec.get(f)]


def gm_has_field(rec: dict, field: str) -> bool:
    return bool(rec.get(field))


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--island', default='big_island')
    args = parser.parse_args()
    island = args.island

    print(f"[crossref] Loading pipeline output files…")
    new_listings     = load_jsonl(OUTPUT_DIR / 'gm_new.jsonl')
    enrichments      = load_jsonl(OUTPUT_DIR / 'gm_enrichments.jsonl')
    review_cases     = load_jsonl(OUTPUT_DIR / 'gm_review.jsonl')
    classified_all   = load_jsonl(OUTPUT_DIR / 'gm_classified.jsonl')

    print(f"[crossref] Fetching existing DB records for {island}…")
    prac_resp = client.table('practitioners').select(
        'id, name, phone, website_url, email, address, city, modalities, tier, status, lat, lng, avatar_url, bio, owner_id'
    ).eq('island', island).execute()
    cent_resp = client.table('centers').select(
        'id, name, phone, website_url, email, address, city, modalities, tier, status, lat, lng, avatar_url, description, owner_id'
    ).eq('island', island).execute()

    practitioners = prac_resp.data or []
    centers       = cent_resp.data or []
    all_db        = practitioners + centers

    print(f"[crossref] DB: {len(practitioners)} practitioners, {len(centers)} centers")
    print(f"[crossref] GM classified total: {len(classified_all)}")
    print(f"[crossref] New (not in DB): {len(new_listings)}")
    print(f"[crossref] Enrichable (blank fields): {len(enrichments)}")
    print(f"[crossref] Review cases: {len(review_cases)}")

    # ── Enrichment analysis ──────────────────────────────────────────────────
    # Map db_id → enrichment record
    enrich_by_id: dict[str, dict] = {}
    for e in enrichments:
        db_id = e.get('_db_id') or e.get('db_id')
        if db_id:
            enrich_by_id[db_id] = e

    # For each DB record, find what blank fields GM could fill
    enrichable_details: list[dict] = []
    for rec in all_db:
        blanks = blank_fields(rec)
        if not blanks:
            continue
        gm = enrich_by_id.get(rec['id'])
        if not gm:
            continue
        fillable = [f for f in blanks if gm_has_field(gm, f)]
        if fillable:
            enrichable_details.append({
                'db': rec,
                'gm': gm,
                'fillable': fillable,
            })

    # ── DB coverage stats ────────────────────────────────────────────────────
    # Which of our DB records appear matched (i.e. show up in enrichments, meaning GM found them)
    matched_ids = set(enrich_by_id.keys())
    # Also count any review cases that matched
    for r in review_cases:
        db_id = r.get('_db_id') or r.get('db_id')
        if db_id:
            matched_ids.add(db_id)

    unmatched_db = [r for r in all_db if r['id'] not in matched_ids]

    # ── Modality coverage in new listings ────────────────────────────────────
    new_by_modality: dict[str, list] = defaultdict(list)
    for rec in new_listings:
        for mod in (rec.get('modalities') or []):
            new_by_modality[mod].append(rec)

    new_practitioners = [r for r in new_listings if r.get('_listing_type') == 'practitioner']
    new_centers       = [r for r in new_listings if r.get('_listing_type') == 'center']

    # ── Build report ─────────────────────────────────────────────────────────
    lines = []
    ts = datetime.now().strftime('%Y-%m-%d %H:%M')

    lines += [
        f"# Google Maps Cross-Reference Report",
        f"**Island:** {island.replace('_', ' ').title()}  |  **Generated:** {ts}",
        "",
        "---",
        "",
        "## Summary",
        "",
        f"| | Count |",
        f"|---|---|",
        f"| Existing practitioners in DB | {len(practitioners)} |",
        f"| Existing centers in DB | {len(centers)} |",
        f"| **Total existing listings** | **{len(all_db)}** |",
        f"| Google Maps results (classified) | {len(classified_all)} |",
        f"| Existing listings verified/found on Google | {len(matched_ids)} |",
        f"| Existing listings NOT found on Google | {len(unmatched_db)} |",
        f"| New listings Google has, DB doesn't | {len(new_listings)} |",
        f"| Existing listings with enrichable blank fields | {len(enrichable_details)} |",
        f"| Ambiguous / conflict cases needing review | {len(review_cases)} |",
        "",
        "---",
        "",
    ]

    # ── Section 1: Unmatched DB records ──────────────────────────────────────
    lines += [
        "## ⚠️ Listings NOT Found on Google Maps",
        "",
        f"These **{len(unmatched_db)}** listings exist in your DB but Google Maps couldn't find them.",
        "They may be closed, moved, renamed, or Google simply doesn't have them. Worth a manual check.",
        "",
    ]
    if unmatched_db:
        # Group by status
        published   = [r for r in unmatched_db if r.get('status') == 'published']
        draft       = [r for r in unmatched_db if r.get('status') == 'draft']
        claimed     = [r for r in unmatched_db if r.get('owner_id')]

        lines += [
            f"- **{len(published)}** are published  |  **{len(draft)}** are drafts  |  **{len(claimed)}** have a claimed owner",
            "",
            "| Name | City | Status | Tier | Has Phone | Has Website |",
            "|------|------|--------|------|-----------|-------------|",
        ]
        for r in sorted(unmatched_db, key=lambda x: (x.get('status',''), x.get('name',''))):
            lines.append(
                f"| {r.get('name','?')} | {r.get('city','?')} | {r.get('status','?')} | "
                f"{r.get('tier','?')} | {'✓' if r.get('phone') else '✗'} | {'✓' if r.get('website_url') else '✗'} |"
            )
    else:
        lines.append("_All existing listings were found on Google Maps. ✅_")
    lines += ["", "---", ""]

    # ── Section 2: Enrichment opportunities ──────────────────────────────────
    lines += [
        "## 🔧 Enrichment Opportunities",
        "",
        f"These **{len(enrichable_details)}** existing listings have blank fields that Google Maps data could fill in.",
        "Run `13_gm_upsert.py` to apply these automatically (never overwrites existing data).",
        "",
    ]
    if enrichable_details:
        lines += [
            "| Name | City | Status | Blank Fields Google Can Fill |",
            "|------|------|--------|-------------------------------|",
        ]
        for e in sorted(enrichable_details, key=lambda x: x['db'].get('name', '')):
            db = e['db']
            lines.append(
                f"| {db.get('name','?')} | {db.get('city','?')} | {db.get('status','?')} | "
                f"`{'`, `'.join(e['fillable'])}` |"
            )
    else:
        lines.append("_No enrichment opportunities found._")
    lines += ["", "---", ""]

    # ── Section 3: New listings ───────────────────────────────────────────────
    lines += [
        "## 🆕 New Listings Found on Google (Not in DB)",
        "",
        f"Google Maps found **{len(new_listings)}** listings that don't exist in your DB yet:",
        f"**{len(new_practitioners)} practitioners** and **{len(new_centers)} centers**.",
        "",
        "Run `13_gm_upsert.py` to insert these as drafts for review in the admin panel.",
        "",
    ]

    if new_listings:
        # By modality breakdown
        lines += [
            "### By Modality",
            "",
            "| Modality | New Listings |",
            "|----------|-------------|",
        ]
        for mod, recs in sorted(new_by_modality.items(), key=lambda x: -len(x[1])):
            lines.append(f"| {mod} | {len(recs)} |")
        lines += [""]

        # Detail table — practitioners
        if new_practitioners:
            lines += [
                f"### New Practitioners ({len(new_practitioners)})",
                "",
                "| Name | City | Modalities | Phone | Website |",
                "|------|------|------------|-------|---------|",
            ]
            for r in sorted(new_practitioners, key=lambda x: x.get('city','') + x.get('name','')):
                lines.append(
                    f"| {r.get('name','?')} | {r.get('city','?')} | "
                    f"{fmt_modalities(r.get('modalities'))} | "
                    f"{'✓' if r.get('phone') else '✗'} | {'✓' if r.get('website_url') else '✗'} |"
                )
            lines.append("")

        # Detail table — centers
        if new_centers:
            lines += [
                f"### New Centers ({len(new_centers)})",
                "",
                "| Name | City | Modalities | Phone | Website |",
                "|------|------|------------|-------|---------|",
            ]
            for r in sorted(new_centers, key=lambda x: x.get('city','') + x.get('name','')):
                lines.append(
                    f"| {r.get('name','?')} | {r.get('city','?')} | "
                    f"{fmt_modalities(r.get('modalities'))} | "
                    f"{'✓' if r.get('phone') else '✗'} | {'✓' if r.get('website_url') else '✗'} |"
                )
            lines.append("")

    lines += ["---", ""]

    # ── Section 4: Review cases ───────────────────────────────────────────────
    lines += [
        "## 🔍 Ambiguous Cases Needing Manual Review",
        "",
        f"These **{len(review_cases)}** cases had conflicting signals — a fuzzy name match but "
        f"different phone/website, or other ambiguity. Review manually before acting.",
        "",
    ]
    if review_cases:
        lines += [
            "| GM Name | GM City | Reason | DB Match |",
            "|---------|---------|--------|----------|",
        ]
        for r in review_cases:
            reason = r.get('_review_reason') or r.get('review_reason') or '?'
            db_match = r.get('_db_name') or r.get('db_name') or '?'
            lines.append(
                f"| {r.get('name','?')} | {r.get('city','?')} | {reason} | {db_match} |"
            )
    else:
        lines.append("_No ambiguous cases. ✅_")
    lines += ["", "---", ""]

    # ── Section 5: Data quality of existing listings ──────────────────────────
    missing_phone   = [r for r in all_db if not r.get('phone')]
    missing_website = [r for r in all_db if not r.get('website_url')]
    missing_photo   = [r for r in all_db if not r.get('avatar_url')]
    missing_coords  = [r for r in all_db if not r.get('lat') or not r.get('lng')]
    missing_bio     = [r for r in all_db if not r.get('bio')]
    no_modalities   = [r for r in all_db if not r.get('modalities')]

    lines += [
        "## 📊 Overall Data Quality of Existing Listings",
        "",
        f"| Field | Missing | % Complete |",
        f"|-------|---------|------------|",
        f"| Phone | {len(missing_phone)} | {100 - round(len(missing_phone)/max(len(all_db),1)*100)}% |",
        f"| Website | {len(missing_website)} | {100 - round(len(missing_website)/max(len(all_db),1)*100)}% |",
        f"| Photo | {len(missing_photo)} | {100 - round(len(missing_photo)/max(len(all_db),1)*100)}% |",
        f"| Coordinates | {len(missing_coords)} | {100 - round(len(missing_coords)/max(len(all_db),1)*100)}% |",
        f"| Bio / Description | {len(missing_bio)} | {100 - round(len(missing_bio)/max(len(all_db),1)*100)}% |",
        f"| Modalities | {len(no_modalities)} | {100 - round(len(no_modalities)/max(len(all_db),1)*100)}% |",
        "",
        "---",
        "",
        "_Report generated by `pipeline/scripts/21_crossref_report.py`_",
    ]

    # ── Write output ──────────────────────────────────────────────────────────
    out_path = OUTPUT_DIR / 'crossref_report.md'
    with open(out_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"[crossref] Report written → {out_path}")
    print(f"\n{'='*56}")
    print(f"  {len(new_listings):>4}  new listings found on Google")
    print(f"  {len(unmatched_db):>4}  existing listings not found on Google")
    print(f"  {len(enrichable_details):>4}  enrichment opportunities")
    print(f"  {len(review_cases):>4}  cases needing manual review")
    print(f"{'='*56}")


if __name__ == '__main__':
    main()
