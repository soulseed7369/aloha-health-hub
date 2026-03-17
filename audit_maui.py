#!/usr/bin/env python3
"""
Audit Maui practitioners for marketing readiness.
Checks publication status, photo quality, bio completeness, and contact info.
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Setup paths - add project root to Python path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT / "pipeline"))

# Load environment
load_dotenv(dotenv_path=PROJECT_ROOT / '.env')

# Import the Supabase client
from src.supabase_client import client

def audit_maui_practitioners():
    """Fetch and audit all Maui practitioners."""

    print("Fetching Maui practitioners from Supabase...")

    # Fetch all Maui practitioners (both published and draft)
    response = client.table('practitioners').select(
        'id, name, status, tier, avatar_url, bio, email, phone, city, modalities, accepts_new_clients, created_at, updated_at'
    ).eq('island', 'maui').execute()

    if not response.data:
        print("No practitioners found for Maui")
        return None

    listings = response.data
    print(f"Found {len(listings)} total Maui practitioners\n")

    # Separate by status
    published = [l for l in listings if l['status'] == 'published']
    draft = [l for l in listings if l['status'] == 'draft']

    print(f"Published: {len(published)}")
    print(f"Draft: {len(draft)}\n")

    # Quality check function
    def get_quality_score(listing):
        """Rate listing completeness 0-100."""
        score = 0
        issues = []

        # Photo (30 points)
        if listing.get('avatar_url'):
            score += 30
        else:
            issues.append("Missing profile photo")

        # Bio (30 points)
        bio = listing.get('bio', '').strip()
        if bio and len(bio) >= 20:
            score += 30
        elif bio:
            issues.append(f"Bio too short ({len(bio)} chars, need 20+)")
        else:
            issues.append("Missing bio")

        # Contact info (25 points)
        email = listing.get('email', '').strip()
        phone = listing.get('phone', '').strip()
        if email and phone:
            score += 25
        elif email or phone:
            score += 12
            if not email:
                issues.append("Missing email")
            if not phone:
                issues.append("Missing phone")
        else:
            issues.append("Missing both email and phone")

        # Modalities (15 points)
        modalities = listing.get('modalities', [])
        if modalities and len(modalities) > 0:
            score += 15
        else:
            issues.append("No modalities listed")

        return min(100, score), issues

    # Analyze published listings
    print("=" * 80)
    print("PUBLISHED LISTINGS AUDIT")
    print("=" * 80)

    published_scores = []
    high_quality = []
    needs_work = []
    embarrassing = []

    for listing in sorted(published, key=lambda x: x['name']):
        score, issues = get_quality_score(listing)
        published_scores.append(score)

        entry = {
            'name': listing['name'],
            'city': listing.get('city', 'Unknown'),
            'score': score,
            'issues': issues,
            'has_photo': bool(listing.get('avatar_url')),
            'has_bio': bool(listing.get('bio', '').strip()),
            'has_email': bool(listing.get('email', '').strip()),
            'has_phone': bool(listing.get('phone', '').strip()),
            'modality_count': len(listing.get('modalities', [])),
            'tier': listing.get('tier'),
        }

        if score >= 80:
            high_quality.append(entry)
        elif score >= 50:
            needs_work.append(entry)
        else:
            embarrassing.append(entry)

    print(f"\n🟢 HIGH QUALITY ({len(high_quality)} ready to promote):")
    for entry in sorted(high_quality, key=lambda x: -x['score']):
        print(f"  ✓ {entry['name']} ({entry['city']}) — {entry['score']}%")

    print(f"\n🟡 NEEDS WORK ({len(needs_work)} fixable):")
    for entry in sorted(needs_work, key=lambda x: -x['score']):
        issues_str = " | ".join(entry['issues'][:2])
        print(f"  ~ {entry['name']} ({entry['city']}) — {entry['score']}%")
        print(f"     Issues: {issues_str}")

    print(f"\n🔴 EMBARRASSING ({len(embarrassing)} should hide or fix):")
    for entry in sorted(embarrassing, key=lambda x: x['score']):
        issues_str = " | ".join(entry['issues'][:3])
        print(f"  ✗ {entry['name']} ({entry['city']}) — {entry['score']}%")
        print(f"     Issues: {issues_str}")

    # Statistics
    avg_score = sum(published_scores) / len(published_scores) if published_scores else 0
    print(f"\nPublished Listings Statistics:")
    print(f"  Average quality score: {avg_score:.1f}%")
    print(f"  Median quality score: {sorted(published_scores)[len(published_scores)//2] if published_scores else 0}%")

    # Photo coverage
    with_photos = sum(1 for l in published if l.get('avatar_url'))
    print(f"  Photos: {with_photos}/{len(published)} ({100*with_photos//len(published) if published else 0}%)")

    # Bio coverage
    with_bios = sum(1 for l in published if (l.get('bio', '').strip() and len(l.get('bio', '').strip()) >= 20))
    print(f"  Good bios: {with_bios}/{len(published)} ({100*with_bios//len(published) if published else 0}%)")

    # Contact coverage
    with_email = sum(1 for l in published if l.get('email', '').strip())
    with_phone = sum(1 for l in published if l.get('phone', '').strip())
    print(f"  Email: {with_email}/{len(published)} ({100*with_email//len(published) if published else 0}%)")
    print(f"  Phone: {with_phone}/{len(published)} ({100*with_phone//len(published) if published else 0}%)")

    # Draft analysis
    print(f"\n" + "=" * 80)
    print("DRAFT LISTINGS")
    print("=" * 80)
    print(f"Count: {len(draft)}")
    if draft:
        draft_cities = {}
        for d in draft:
            city = d.get('city', 'Unknown')
            draft_cities[city] = draft_cities.get(city, 0) + 1

        print("By city:")
        for city in sorted(draft_cities.keys()):
            print(f"  {city}: {draft_cities[city]}")

    # Compile results for report
    results = {
        'published_count': len(published),
        'draft_count': len(draft),
        'high_quality': high_quality,
        'needs_work': needs_work,
        'embarrassing': embarrassing,
        'avg_score': avg_score,
        'photo_coverage': (with_photos, len(published)),
        'bio_coverage': (with_bios, len(published)),
        'email_coverage': (with_email, len(published)),
        'phone_coverage': (with_phone, len(published)),
    }

    return results

if __name__ == '__main__':
    results = audit_maui_practitioners()
