#!/usr/bin/env python3
"""
Detailed audit of Maui draft practitioners and centers for marketing readiness.
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Setup paths
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT / "pipeline"))
load_dotenv(dotenv_path=PROJECT_ROOT / '.env')

from src.supabase_client import client

def audit_maui_draft_practitioners():
    """Fetch and audit all Maui draft practitioners in detail."""

    print("Fetching Maui practitioners from Supabase...")

    # Fetch all Maui practitioners (both published and draft)
    response = client.table('practitioners').select(
        'id, name, status, tier, avatar_url, bio, email, phone, city, modalities, '
        'accepts_new_clients, created_at, updated_at, website_url, session_type, '
        'years_experience, lineage_or_training, what_to_expect, lead_score, website_score'
    ).eq('island', 'maui').order('city', desc=False).execute()

    if not response.data:
        print("No practitioners found for Maui")
        return

    listings = response.data
    print(f"\nFound {len(listings)} total Maui practitioners\n")

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

        # Avatar/Photo (30 points)
        if listing.get('avatar_url'):
            score += 30
        else:
            issues.append("Missing avatar/photo")

        # Bio (30 points)
        bio = listing.get('bio', '').strip() if listing.get('bio') else ''
        if bio and len(bio) >= 20:
            score += 30
        elif bio:
            issues.append(f"Bio too short ({len(bio)} chars, need 20+)")
        else:
            issues.append("Missing bio")

        # Contact info (25 points)
        email = listing.get('email', '').strip() if listing.get('email') else ''
        phone = listing.get('phone', '').strip() if listing.get('phone') else ''
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

    # Analyze DRAFT listings in detail
    print("=" * 100)
    print("DRAFT LISTINGS DETAILED ANALYSIS")
    print("=" * 100)

    high_quality = []
    needs_work = []
    missing_basics = []

    for listing in sorted(draft, key=lambda x: (x['city'], x['name'])):
        score, issues = get_quality_score(listing)

        entry = {
            'id': listing['id'],
            'name': listing['name'],
            'city': listing.get('city', 'Unknown'),
            'score': score,
            'issues': issues,
            'has_avatar': bool(listing.get('avatar_url')),
            'has_bio': bool(listing.get('bio', '').strip() if listing.get('bio') else ''),
            'bio_length': len(listing.get('bio', '').strip()) if listing.get('bio') else 0,
            'has_email': bool(listing.get('email', '').strip() if listing.get('email') else ''),
            'has_phone': bool(listing.get('phone', '').strip() if listing.get('phone') else ''),
            'modality_count': len(listing.get('modalities', [])) if listing.get('modalities') else 0,
            'tier': listing.get('tier'),
            'session_type': listing.get('session_type'),
            'website_url': listing.get('website_url'),
            'website_score': listing.get('website_score'),
            'lead_score': listing.get('lead_score'),
        }

        if score >= 70:
            high_quality.append(entry)
        elif score >= 40:
            needs_work.append(entry)
        else:
            missing_basics.append(entry)

    print(f"\n🟢 DRAFT LISTINGS READY TO PUBLISH ({len(high_quality)}):")
    for entry in sorted(high_quality, key=lambda x: -x['score']):
        print(f"  ✓ {entry['name']} ({entry['city']}) — {entry['score']}% ready")
        if entry['issues']:
            print(f"     Minor: {', '.join(entry['issues'])}")

    print(f"\n🟡 DRAFT LISTINGS NEEDING WORK ({len(needs_work)}):")
    for entry in sorted(needs_work, key=lambda x: -x['score']):
        print(f"  ~ {entry['name']} ({entry['city']}) — {entry['score']}% complete")
        print(f"     Issues: {', '.join(entry['issues'][:3])}")

    print(f"\n🔴 DRAFT LISTINGS WITH MISSING BASICS ({len(missing_basics)}):")
    for entry in sorted(missing_basics, key=lambda x: x['score']):
        print(f"  ✗ {entry['name']} ({entry['city']}) — {entry['score']}% complete")
        print(f"     Issues: {', '.join(entry['issues'][:3])}")

    # Summary statistics
    print(f"\n" + "=" * 100)
    print("MAUI DRAFT LISTINGS SUMMARY STATISTICS")
    print("=" * 100)

    all_draft_scores = [get_quality_score(l)[0] for l in draft]
    avg_score = sum(all_draft_scores) / len(all_draft_scores) if all_draft_scores else 0

    print(f"\nQuality Scores:")
    print(f"  Average: {avg_score:.1f}%")
    print(f"  Median: {sorted(all_draft_scores)[len(all_draft_scores)//2] if all_draft_scores else 0}%")
    print(f"  Min: {min(all_draft_scores) if all_draft_scores else 0}%")
    print(f"  Max: {max(all_draft_scores) if all_draft_scores else 0}%")

    # Coverage metrics
    with_avatar = sum(1 for l in draft if l.get('avatar_url'))
    with_bio = sum(1 for l in draft if (l.get('bio', '').strip() if l.get('bio') else ''))
    with_email = sum(1 for l in draft if (l.get('email', '').strip() if l.get('email') else ''))
    with_phone = sum(1 for l in draft if (l.get('phone', '').strip() if l.get('phone') else ''))
    with_modalities = sum(1 for l in draft if l.get('modalities') and len(l.get('modalities', [])) > 0)

    print(f"\nData Coverage:")
    print(f"  Avatar photos: {with_avatar}/{len(draft)} ({100*with_avatar//len(draft) if draft else 0}%)")
    print(f"  Bio/description: {with_bio}/{len(draft)} ({100*with_bio//len(draft) if draft else 0}%)")
    print(f"  Email: {with_email}/{len(draft)} ({100*with_email//len(draft) if draft else 0}%)")
    print(f"  Phone: {with_phone}/{len(draft)} ({100*with_phone//len(draft) if draft else 0}%)")
    print(f"  Modalities: {with_modalities}/{len(draft)} ({100*with_modalities//len(draft) if draft else 0}%)")

    # City breakdown
    city_stats = {}
    for listing in draft:
        city = listing.get('city', 'Unknown')
        if city not in city_stats:
            city_stats[city] = {'count': 0, 'avg_score': 0, 'scores': []}
        city_stats[city]['count'] += 1
        score = get_quality_score(listing)[0]
        city_stats[city]['scores'].append(score)

    print(f"\nBy City:")
    for city in sorted(city_stats.keys()):
        stats = city_stats[city]
        avg = sum(stats['scores']) / len(stats['scores'])
        print(f"  {city}: {stats['count']} listings, avg quality {avg:.0f}%")

    # Now check CENTERS
    print(f"\n" + "=" * 100)
    print("MAUI WELLNESS CENTERS")
    print("=" * 100)

    centers_response = client.table('centers').select(
        'id, name, status, tier, avatar_url, description, email, phone, city, modalities, '
        'created_at, updated_at, website_url, center_type'
    ).eq('island', 'maui').execute()

    if centers_response.data:
        centers = centers_response.data
        published_centers = [c for c in centers if c['status'] == 'published']
        draft_centers = [c for c in centers if c['status'] == 'draft']

        print(f"\nCenters total: {len(centers)}")
        print(f"  Published: {len(published_centers)}")
        print(f"  Draft: {len(draft_centers)}")

        if draft_centers:
            print(f"\nDraft Centers:")
            for c in sorted(draft_centers, key=lambda x: x['name']):
                desc_len = len((c.get('description') or '').strip())
                has_photo = bool(c.get('avatar_url'))
                has_email = bool(c.get('email', '').strip() if c.get('email') else '')
                has_phone = bool(c.get('phone', '').strip() if c.get('phone') else '')
                center_type = c.get('center_type', 'Unknown')
                print(f"  - {c['name']} ({c.get('city', 'Unknown')}) [{center_type}]")
                print(f"    Photo: {has_photo} | Email: {has_email} | Phone: {has_phone} | Description: {desc_len} chars")
    else:
        print("\nNo centers found for Maui")

if __name__ == '__main__':
    audit_maui_draft_practitioners()
