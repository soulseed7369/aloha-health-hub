#!/usr/bin/env python3
"""
generate_sitemap.py — Build a comprehensive sitemap.xml for hawaiiwellness.net

Queries Supabase for all published practitioners, centers, and articles,
then writes public/sitemap.xml combining static pages + dynamic listing pages.

Usage:
    cd pipeline
    python scripts/generate_sitemap.py

    # Preview without writing:
    python scripts/generate_sitemap.py --dry-run
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

# ── path setup ──────────────────────────────────────────────────────────────
PIPELINE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT    = PIPELINE_DIR.parent
sys.path.insert(0, str(PIPELINE_DIR / "src"))

from supabase_client import client  # noqa: E402

# ── config ──────────────────────────────────────────────────────────────────
BASE_URL    = "https://hawaiiwellness.net"
OUTPUT_PATH = REPO_ROOT / "public" / "sitemap.xml"
TODAY       = datetime.now(timezone.utc).strftime("%Y-%m-%d")

STATIC_PAGES = [
    ("/",                      "1.0",  "daily"),
    ("/big-island",            "0.9",  "daily"),
    ("/maui",                  "0.9",  "daily"),
    ("/oahu",                  "0.9",  "daily"),
    ("/kauai",                 "0.9",  "daily"),
    ("/directory",             "0.9",  "daily"),
    ("/retreats",              "0.8",  "weekly"),
    ("/articles",              "0.8",  "weekly"),
    ("/list-your-practice",    "0.7",  "monthly"),
    ("/concierge",             "0.6",  "monthly"),
    ("/help",                  "0.5",  "monthly"),
    ("/privacy-policy",        "0.3",  "yearly"),
    ("/terms-of-service",      "0.3",  "yearly"),
]


def fetch_practitioners():
    """Fetch all published practitioner IDs."""
    rows = []
    page_size = 1000
    offset = 0
    while True:
        resp = (
            client.table("practitioners")
            .select("id, updated_at")
            .eq("status", "published")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


def fetch_centers():
    """Fetch all published center IDs."""
    rows = []
    page_size = 1000
    offset = 0
    while True:
        resp = (
            client.table("centers")
            .select("id, updated_at")
            .eq("status", "published")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


def fetch_articles():
    """Fetch all published article slugs."""
    rows = []
    page_size = 1000
    offset = 0
    while True:
        resp = (
            client.table("articles")
            .select("slug, updated_at")
            .not_.is_("published_at", "null")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


def fmt_date(iso_str):
    """Return YYYY-MM-DD from an ISO timestamp, fallback to TODAY."""
    if not iso_str:
        return TODAY
    try:
        return iso_str[:10]
    except Exception:
        return TODAY


def build_sitemap(practitioners, centers, articles):
    urlset = Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

    def add_url(loc, priority, changefreq, lastmod=TODAY):
        url = SubElement(urlset, "url")
        SubElement(url, "loc").text        = loc
        SubElement(url, "lastmod").text    = lastmod
        SubElement(url, "changefreq").text = changefreq
        SubElement(url, "priority").text   = priority

    # static pages
    for path, priority, freq in STATIC_PAGES:
        add_url(f"{BASE_URL}{path}", priority, freq)

    # practitioner profiles
    for p in practitioners:
        add_url(
            f"{BASE_URL}/profile/{p['id']}",
            "0.7",
            "weekly",
            fmt_date(p.get("updated_at")),
        )

    # wellness center pages
    for c in centers:
        add_url(
            f"{BASE_URL}/center/{c['id']}",
            "0.7",
            "weekly",
            fmt_date(c.get("updated_at")),
        )

    # articles
    for a in articles:
        if a.get("slug"):
            add_url(
                f"{BASE_URL}/articles/{a['slug']}",
                "0.6",
                "monthly",
                fmt_date(a.get("updated_at")),
            )

    raw = tostring(urlset, encoding="unicode")
    pretty = minidom.parseString(raw).toprettyxml(indent="  ")
    # remove the redundant <?xml ...?> added by toprettyxml
    lines = pretty.split("\n")
    return "\n".join(lines[1:]) if lines[0].startswith("<?xml") else pretty


def main():
    parser = argparse.ArgumentParser(description="Generate sitemap.xml")
    parser.add_argument("--dry-run", action="store_true", help="Print stats only, don't write")
    args = parser.parse_args()

    print("Fetching practitioners...")
    practitioners = fetch_practitioners()
    print(f"  → {len(practitioners)} published")

    print("Fetching centers...")
    centers = fetch_centers()
    print(f"  → {len(centers)} published")

    print("Fetching articles...")
    articles = fetch_articles()
    print(f"  → {len(articles)} published")

    total = len(STATIC_PAGES) + len(practitioners) + len(centers) + len(articles)
    print(f"\nTotal URLs in sitemap: {total}")

    xml = build_sitemap(practitioners, centers, articles)

    if args.dry_run:
        print("\n[dry-run] Would write to:", OUTPUT_PATH)
        print(xml[:1000], "...")
        return

    OUTPUT_PATH.write_text(xml, encoding="utf-8")
    print(f"\n✓ Written to {OUTPUT_PATH}")
    print("  Next: commit public/sitemap.xml and push to deploy")
    print("  Then: submit https://hawaiiwellness.net/sitemap.xml in Search Console")


if __name__ == "__main__":
    main()
