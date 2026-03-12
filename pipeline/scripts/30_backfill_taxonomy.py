#!/usr/bin/env python3
"""
Backfill taxonomy join tables from existing listing data.

Steps:
  1. Map old modalities[] → listing_modalities
  2. Infer concerns from modalities via taxonomy_relationships
  3. Scan bios for approach keywords
  4. Map session_type → listing_formats
  5. Map center_type → provider_type (centers) / individual-practitioner (practitioners)

Usage:
  python scripts/30_backfill_taxonomy.py               # run all steps
  python scripts/30_backfill_taxonomy.py --step 1       # run only step 1
  python scripts/30_backfill_taxonomy.py --dry-run      # preview without writing
  python scripts/30_backfill_taxonomy.py --clear         # clear join tables first
"""

import argparse
import re
import sys
from pathlib import Path

# Allow imports from pipeline/src/
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.supabase_client import client


# ── Helpers ────────────────────────────────────────────────────────────────

def fetch_all(table: str, select: str = "*", filters: dict = None) -> list[dict]:
    """Fetch all rows from a table, bypassing the default 1000-row limit."""
    q = client.table(table).select(select).limit(10000)
    if filters:
        for col, val in filters.items():
            q = q.eq(col, val)
    return q.execute().data


def upsert_rows(table: str, rows: list[dict], conflict_cols: str, dry_run: bool = False):
    """Batch upsert rows. Returns count inserted."""
    if not rows:
        return 0
    # Deduplicate rows by conflict key to avoid "ON CONFLICT row a second time" error
    keys = [k.strip() for k in conflict_cols.split(",")]
    seen = set()
    deduped = []
    for row in rows:
        key = tuple(row.get(k) for k in keys)
        if key not in seen:
            seen.add(key)
            deduped.append(row)
    rows = deduped
    if dry_run:
        return len(rows)
    # Upsert in chunks of 500 to stay under request size limits
    total = 0
    for i in range(0, len(rows), 500):
        chunk = rows[i : i + 500]
        client.table(table).upsert(chunk, on_conflict=conflict_cols).execute()
        total += len(chunk)
    return total


def clear_table(table: str):
    """Delete all rows from a join table."""
    # Supabase requires a filter; use gte on listing_type which always has a value
    client.table(table).delete().neq("listing_type", "__never__").execute()
    print(f"  Cleared {table}")


# ── Data loading ───────────────────────────────────────────────────────────

def load_taxonomy():
    """Load taxonomy terms, aliases, and relationships into lookup dicts."""
    axes = {a["slug"]: a["id"] for a in fetch_all("taxonomy_axes")}
    terms = fetch_all("taxonomy_terms")
    aliases = fetch_all("taxonomy_aliases")
    relationships = fetch_all("taxonomy_relationships")

    # term lookup: (axis_slug, lowercase_label) → term dict
    term_by_label = {}
    term_by_slug = {}
    term_by_id = {}
    for t in terms:
        axis_slug = next(k for k, v in axes.items() if v == t["axis_id"])
        key = (axis_slug, t["label"].lower())
        term_by_label[key] = t
        term_by_slug[(axis_slug, t["slug"])] = t
        term_by_id[t["id"]] = {**t, "_axis_slug": axis_slug}

    # alias lookup: lowercase_alias → term dict
    alias_to_term = {}
    for a in aliases:
        tid = a["term_id"]
        if tid in term_by_id:
            alias_to_term[a["alias"].lower()] = term_by_id[tid]

    return {
        "axes": axes,
        "terms": terms,
        "term_by_label": term_by_label,
        "term_by_slug": term_by_slug,
        "term_by_id": term_by_id,
        "alias_to_term": alias_to_term,
        "relationships": relationships,
    }


def load_listings():
    """Load all practitioners and centers."""
    practitioners = fetch_all("practitioners")
    centers = fetch_all("centers")
    return practitioners, centers


# ── Step 1: Map old modalities[] → listing_modalities ──────────────────────

def step1_modalities(tax, practitioners, centers, dry_run):
    print("\n═══ Step 1: Map modalities[] → listing_modalities ═══")
    rows = []
    unmatched = set()
    matched_count = 0

    for listing_type, listings in [("practitioner", practitioners), ("center", centers)]:
        for lst in listings:
            mods = lst.get("modalities") or []
            if not mods:
                continue
            for i, mod_label in enumerate(mods):
                mod_lower = mod_label.strip().lower()
                # Try exact label match on modality axis
                term = tax["term_by_label"].get(("modality", mod_lower))
                # Try alias match
                if not term:
                    term_from_alias = tax["alias_to_term"].get(mod_lower)
                    if term_from_alias and term_from_alias["_axis_slug"] == "modality":
                        term = term_from_alias
                if term:
                    rows.append({
                        "listing_id": lst["id"],
                        "listing_type": listing_type,
                        "term_id": term["id"],
                        "is_primary": i == 0,
                    })
                    matched_count += 1
                else:
                    unmatched.add(mod_label)

    count = upsert_rows("listing_modalities", rows, "listing_id,listing_type,term_id", dry_run)
    print(f"  Inserted {count} modality tags ({matched_count} matches)")
    if unmatched:
        print(f"  ⚠ {len(unmatched)} unmatched labels:", file=sys.stderr)
        for u in sorted(unmatched):
            print(f"    - {u}", file=sys.stderr)
    return rows


# ── Step 2: Infer concerns from modalities via relationships ───────────────

def step2_concerns(tax, practitioners, centers, dry_run):
    print("\n═══ Step 2: Infer concerns from modality relationships ═══")

    # Build modality_term_id → [(concern_term_id, strength)] map
    mod_to_concerns = {}
    for rel in tax["relationships"]:
        if rel["relationship"] == "treats" and rel["strength"] >= 0.6:
            src = rel["source_term_id"]
            tgt = rel["target_term_id"]
            # Verify target is a concern term
            if tgt in tax["term_by_id"] and tax["term_by_id"][tgt]["_axis_slug"] == "concern":
                mod_to_concerns.setdefault(src, []).append(tgt)

    # Fetch existing listing_modalities to know each listing's modality terms
    existing_mods = fetch_all("listing_modalities")
    # Group by (listing_id, listing_type)
    listing_mods = {}
    for m in existing_mods:
        key = (m["listing_id"], m["listing_type"])
        listing_mods.setdefault(key, []).append(m["term_id"])

    rows = []
    seen = set()
    for (lid, ltype), mod_term_ids in listing_mods.items():
        for mtid in mod_term_ids:
            for concern_tid in mod_to_concerns.get(mtid, []):
                key = (lid, ltype, concern_tid)
                if key not in seen:
                    seen.add(key)
                    rows.append({
                        "listing_id": lid,
                        "listing_type": ltype,
                        "term_id": concern_tid,
                    })

    count = upsert_rows("listing_concerns", rows, "listing_id,listing_type,term_id", dry_run)
    print(f"  Inserted {count} concern tags across {len(listing_mods)} listings")


# ── Step 3: Scan bios for approach keywords ────────────────────────────────

def step3_approaches(tax, practitioners, centers, dry_run):
    print("\n═══ Step 3: Scan bios for approach keywords ═══")

    # Build approach term lookup: [(term, [patterns])]
    approach_terms = [t for t in tax["terms"] if t["axis_id"] == tax["axes"]["approach"]]
    approach_patterns = []
    for t in approach_terms:
        patterns = [t["label"].lower()]
        # Also add aliases for this term
        for alias_lower, alias_term in tax["alias_to_term"].items():
            if alias_term["id"] == t["id"]:
                patterns.append(alias_lower)
        approach_patterns.append((t, patterns))

    # Special: trauma keyword → trauma-informed
    trauma_informed = tax["term_by_slug"].get(("approach", "trauma-informed"))

    rows = []
    seen = set()

    for listing_type, listings, text_field in [
        ("practitioner", practitioners, "bio"),
        ("center", centers, "description"),
    ]:
        for lst in listings:
            text = (lst.get(text_field) or "").lower()
            if not text or len(text) < 10:
                continue

            matched_ids = set()

            for term, patterns in approach_patterns:
                for pat in patterns:
                    if pat in text:
                        matched_ids.add(term["id"])
                        break

            # Special: "trauma" keyword → trauma-informed
            if trauma_informed and "trauma" in text:
                matched_ids.add(trauma_informed["id"])

            for tid in matched_ids:
                key = (lst["id"], listing_type, tid)
                if key not in seen:
                    seen.add(key)
                    rows.append({
                        "listing_id": lst["id"],
                        "listing_type": listing_type,
                        "term_id": tid,
                    })

    count = upsert_rows("listing_approaches", rows, "listing_id,listing_type,term_id", dry_run)
    print(f"  Inserted {count} approach tags")


# ── Step 4: Map session_type → listing_formats ─────────────────────────────

def step4_formats(tax, practitioners, centers, dry_run):
    print("\n═══ Step 4: Map session_type → listing_formats ═══")

    in_person = tax["term_by_slug"][("format", "in-person")]
    virtual = tax["term_by_slug"][("format", "virtual")]
    retreats = tax["term_by_slug"][("format", "retreats")]

    session_type_map = {
        "in_person": [in_person],
        "online": [virtual],
        "both": [in_person, virtual],
    }

    rows = []
    seen = set()

    for listing_type, listings in [("practitioner", practitioners), ("center", centers)]:
        for lst in listings:
            st = lst.get("session_type")
            terms = session_type_map.get(st, [])
            for t in terms:
                key = (lst["id"], listing_type, t["id"])
                if key not in seen:
                    seen.add(key)
                    rows.append({
                        "listing_id": lst["id"],
                        "listing_type": listing_type,
                        "term_id": t["id"],
                    })

            # Centers with retreat type also get retreats format
            if listing_type == "center" and lst.get("center_type") == "retreat_center":
                key = (lst["id"], listing_type, retreats["id"])
                if key not in seen:
                    seen.add(key)
                    rows.append({
                        "listing_id": lst["id"],
                        "listing_type": listing_type,
                        "term_id": retreats["id"],
                    })

    count = upsert_rows("listing_formats", rows, "listing_id,listing_type,term_id", dry_run)
    print(f"  Inserted {count} format tags")


# ── Step 5: Map center_type → provider_type / practitioners → individual ───

def step5_provider_types(tax, practitioners, centers, dry_run):
    print("\n═══ Step 5: Map provider types ═══")

    center_type_map = {
        "spa": tax["term_by_slug"][("provider_type", "spa")],
        "wellness_center": tax["term_by_slug"][("provider_type", "wellness-center")],
        "clinic": tax["term_by_slug"][("provider_type", "clinic")],
        "retreat_center": tax["term_by_slug"][("provider_type", "retreat-center")],
    }
    individual = tax["term_by_slug"][("provider_type", "individual-practitioner")]

    rows = []

    # All practitioners → individual-practitioner
    for p in practitioners:
        rows.append({
            "listing_id": p["id"],
            "listing_type": "practitioner",
            "term_id": individual["id"],
        })

    # Centers → mapped type
    for c in centers:
        ct = c.get("center_type")
        term = center_type_map.get(ct)
        if term:
            rows.append({
                "listing_id": c["id"],
                "listing_type": "center",
                "term_id": term["id"],
            })

    # Note: listing_audiences doesn't have a join table in the schema that
    # stores provider_type — we need to insert into a general purpose table.
    # Actually, there IS no listing_provider_types table. The provider_type axis
    # is informational. We'll skip the actual insert and just log it.
    # WAIT — checking the schema: we only have listing_modalities, listing_concerns,
    # listing_approaches, listing_formats, listing_audiences. No listing_provider_types.
    # So provider_type is handled differently — likely via the existing center_type column.
    # Let's just print the mapping for now.

    print(f"  Would map {len(rows)} provider type tags")
    print(f"  ⚠ No listing_provider_types join table exists — provider_type is derived from")
    print(f"    practitioners (always individual) and centers.center_type column.")
    print(f"    Skipping insert. Consider adding listing_provider_types table if needed.")


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Backfill taxonomy join tables")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--step", type=int, help="Run only step N (1-5)")
    parser.add_argument("--clear", action="store_true", help="Clear join tables first")
    args = parser.parse_args()

    if args.dry_run:
        print("🔍 DRY RUN — no data will be written\n")

    # Load data
    print("Loading taxonomy data...")
    tax = load_taxonomy()
    print(f"  {len(tax['terms'])} terms, {len(tax['alias_to_term'])} aliases, {len(tax['relationships'])} relationships")

    print("Loading listings...")
    practitioners, centers = load_listings()
    print(f"  {len(practitioners)} practitioners, {len(centers)} centers")

    # Clear if requested
    if args.clear and not args.dry_run:
        print("\nClearing existing join table data...")
        for tbl in ["listing_modalities", "listing_concerns", "listing_approaches", "listing_formats", "listing_audiences"]:
            clear_table(tbl)

    steps = {
        1: lambda: step1_modalities(tax, practitioners, centers, args.dry_run),
        2: lambda: step2_concerns(tax, practitioners, centers, args.dry_run),
        3: lambda: step3_approaches(tax, practitioners, centers, args.dry_run),
        4: lambda: step4_formats(tax, practitioners, centers, args.dry_run),
        5: lambda: step5_provider_types(tax, practitioners, centers, args.dry_run),
    }

    if args.step:
        if args.step not in steps:
            print(f"Error: --step must be 1-5, got {args.step}")
            sys.exit(1)
        steps[args.step]()
    else:
        for step_fn in steps.values():
            step_fn()

    print("\n✅ Backfill complete!")


if __name__ == "__main__":
    main()
