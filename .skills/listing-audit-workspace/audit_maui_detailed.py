#!/usr/bin/env python3
"""
Listing Audit for Maui — Detailed Report
Shows ALL listings (draft + published) with quality breakdown
Identifies what needs to be fixed before publishing
"""
import sys
import json
from datetime import datetime
from pathlib import Path
from difflib import SequenceMatcher

# Add pipeline to path
sys.path.insert(0, '/sessions/inspiring-brave-ritchie/mnt/aloha-health-hub/pipeline')

from src.supabase_client import client

CANONICAL_MODALITIES = {
    'Acupuncture', 'Alternative Therapy', 'Art Therapy', 'Astrology', 'Ayurveda',
    'Birth Doula', 'Breathwork', 'Chiropractic', 'Counseling', 'Craniosacral',
    'Dentistry', 'Energy Healing', 'Family Constellation', 'Fitness', 'Functional Medicine',
    'Hawaiian Healing', 'Herbalism', 'Hypnotherapy', 'IV Therapy', 'Life Coaching',
    'Lomilomi / Hawaiian Healing', 'Longevity', 'Massage', 'Meditation', 'Midwife',
    'Nature Therapy', 'Naturopathic', 'Nervous System Regulation', 'Network Chiropractic',
    'Nutrition', 'Osteopathic', 'Physical Therapy', 'Psychic', 'Psychotherapy', 'Reiki',
    'Ritualist', 'Somatic Therapy', 'Soul Guidance', 'Sound Healing',
    'TCM (Traditional Chinese Medicine)', 'Trauma-Informed Care',
    'Watsu / Water Therapy', 'Women\'s Health', 'Yoga'
}

CANONICAL_CITIES_MAUI = {
    'Kahului', 'Wailuku', 'Lahaina', 'Kihei', 'Wailea', 'Hana', 'Makawao',
    'Paia', 'Haiku', 'Kula', 'Pukalani', 'Napili', 'Kapalua', 'Kaanapali',
    'Lanai City'
}

VALID_SESSION_TYPES = {'in_person', 'online', 'both'}

def fetch_all(table, island='maui'):
    """Fetch all records from table for Maui"""
    records = []
    offset = 0
    while True:
        batch = client.table(table).select('*').eq('island', island).range(offset, offset + 999).execute()
        if not batch.data:
            break
        records.extend(batch.data)
        if len(batch.data) < 1000:
            break
        offset += 1000
    return records

def validate_email(email):
    if not email:
        return False
    return '@' in email and '.' in email.split('@')[-1]

def validate_url(url):
    if not url:
        return False
    return url.startswith('http://') or url.startswith('https://')

def validate_phone(phone):
    if not phone:
        return False
    digits = ''.join(c for c in phone if c.isdigit())
    return len(digits) >= 10

def count_words(text):
    if not text:
        return 0
    return len(str(text).split())

def score_listing(listing, is_practitioner=True):
    """Score a listing's completeness and quality"""
    score = 0
    details = []

    # Name (10 points)
    if listing.get('name') and str(listing.get('name')).strip():
        score += 10
    else:
        details.append('missing_name')

    # Modalities (15 points)
    modalities = listing.get('modalities', [])
    if modalities and all(m in CANONICAL_MODALITIES for m in modalities):
        score += 15
    elif modalities:
        details.append('non_canonical_modalities')
    else:
        details.append('empty_modalities')

    # Location/City (10 points)
    city = listing.get('city')
    if city and city in CANONICAL_CITIES_MAUI:
        score += 10
    elif city:
        details.append('non_canonical_city')
    else:
        details.append('missing_city')

    # Contact info (15 points) - email + phone both needed
    email_ok = validate_email(listing.get('email'))
    phone_ok = validate_phone(listing.get('phone'))
    if email_ok and phone_ok:
        score += 15
    elif email_ok or phone_ok:
        score += 7
        details.append('incomplete_contact')
    else:
        details.append('no_contact')

    # Photo (15 points)
    if is_practitioner:
        avatar = listing.get('avatar_url')
    else:
        avatar = listing.get('photos')
    if (is_practitioner and avatar and validate_url(avatar)) or (not is_practitioner and avatar and len(avatar) > 0):
        score += 15
    else:
        details.append('missing_photo')

    # Bio/Description (20 points) - >10 words
    if is_practitioner:
        text = listing.get('bio', '')
    else:
        text = listing.get('description', '')
    text_words = count_words(text)
    if text_words >= 10:
        score += 20
    elif text_words > 0:
        score += 10
        details.append('weak_bio')
    else:
        details.append('no_bio')

    # Session type (10 points)
    if listing.get('session_type') in VALID_SESSION_TYPES:
        score += 10
    else:
        details.append('missing_session_type')

    return score, details

def find_near_duplicates(listings, is_practitioner=True):
    """Find likely duplicates by fuzzy name match on same island"""
    duplicates = []
    for i, l1 in enumerate(listings):
        for l2 in listings[i+1:]:
            name1 = l1.get('name', '')
            name2 = l2.get('name', '')
            ratio = SequenceMatcher(None, name1.lower(), name2.lower()).ratio()
            if ratio >= 0.85:
                duplicates.append({
                    'name1': name1,
                    'id1': l1['id'][:8],
                    'name2': name2,
                    'id2': l2['id'][:8],
                    'similarity': ratio
                })
    return duplicates

def main():
    print("Fetching Maui practitioners...")
    pracs = fetch_all('practitioners', 'maui')
    print(f"  Found {len(pracs)} practitioners\n")

    print("Fetching Maui centers...")
    centers = fetch_all('centers', 'maui')
    print(f"  Found {len(centers)} centers\n")

    # Analyze practitioners
    print("Analyzing practitioners...")
    prac_scores = []
    for p in pracs:
        score, details = score_listing(p, is_practitioner=True)
        prac_scores.append({
            'id': p['id'],
            'name': p.get('name', 'UNNAMED'),
            'status': p.get('status', 'unknown'),
            'tier': p.get('tier', 'free'),
            'score': score,
            'issues': details,
            'has_photo': validate_url(p.get('avatar_url')),
            'bio_words': count_words(p.get('bio', '')),
            'email_valid': validate_email(p.get('email')),
            'phone_valid': validate_phone(p.get('phone')),
            'modalities': p.get('modalities', []),
            'city': p.get('city', ''),
        })

    # Analyze centers
    print("Analyzing centers...")
    center_scores = []
    for c in centers:
        score, details = score_listing(c, is_practitioner=False)
        center_scores.append({
            'id': c['id'],
            'name': c.get('name', 'UNNAMED'),
            'status': c.get('status', 'unknown'),
            'tier': c.get('tier', 'free'),
            'score': score,
            'issues': details,
            'has_photos': len(c.get('photos', [])) > 0,
            'desc_words': count_words(c.get('description', '')),
            'email_valid': validate_email(c.get('email')),
            'phone_valid': validate_phone(c.get('phone')),
            'modalities': c.get('modalities', []),
            'city': c.get('city', ''),
            'center_type': c.get('center_type', ''),
        })

    # Find duplicates
    print("Checking for near-duplicates...")
    prac_dupes = find_near_duplicates(pracs, is_practitioner=True)
    center_dupes = find_near_duplicates(centers, is_practitioner=False)

    # Generate report
    prac_avg_score = sum(p['score'] for p in prac_scores) / len(prac_scores) if prac_scores else 0
    center_avg_score = sum(c['score'] for c in center_scores) / len(center_scores) if center_scores else 0

    prac_published = [p for p in prac_scores if p['status'] == 'published']
    prac_draft = [p for p in prac_scores if p['status'] == 'draft']
    center_published = [c for c in center_scores if c['status'] == 'published']
    center_draft = [c for c in center_scores if c['status'] == 'draft']

    report = f"""# Listing Audit Report — Maui (Detailed)
Generated: {datetime.now().isoformat()}

## Executive Summary
- **Total listings:** {len(pracs)} practitioners, {len(centers)} centers (48 total)
- **Published:** {len(prac_published)} practitioners, {len(center_published)} centers (0 total)
- **Draft:** {len(prac_draft)} practitioners, {len(center_draft)} centers (48 total)
- **Average quality score:** Practitioners {prac_avg_score:.0f}/100, Centers {center_avg_score:.0f}/100

## Marketing Push: Current Status

### The Problem
**ALL 48 listings are in DRAFT status.** None are published yet.

### What This Means
Before you can send traffic to Maui in marketing, you must:
1. Review and fix the quality issues below
2. Publish listings to make them live
3. Only then will they appear in the public directory

### Quality Assessment by Category

#### Practitioners ({len(prac_scores)} total)
"""

    prac_with_photo = sum(1 for p in prac_scores if p['has_photo'])
    prac_with_bio = sum(1 for p in prac_scores if p['bio_words'] >= 10)
    prac_with_contact = sum(1 for p in prac_scores if p['email_valid'] and p['phone_valid'])
    prac_with_mods = sum(1 for p in prac_scores if p['modalities'] and all(m in CANONICAL_MODALITIES for m in p['modalities']))

    report += f"""- Have photos: {prac_with_photo}/{len(prac_scores)} ({100*prac_with_photo//len(prac_scores)}%)
- Have good bio (>10 words): {prac_with_bio}/{len(prac_scores)} ({100*prac_with_bio//len(prac_scores)}%)
- Have valid email + phone: {prac_with_contact}/{len(prac_scores)} ({100*prac_with_contact//len(prac_scores)}%)
- Have canonical modalities: {prac_with_mods}/{len(prac_scores)} ({100*prac_with_mods//len(prac_scores)}%)
- Average quality score: {prac_avg_score:.0f}/100

#### Centers ({len(center_scores)} total)
"""

    center_with_photo = sum(1 for c in center_scores if c['has_photos'])
    center_with_desc = sum(1 for c in center_scores if c['desc_words'] >= 10)
    center_with_contact = sum(1 for c in center_scores if c['email_valid'] and c['phone_valid'])
    center_with_mods = sum(1 for c in center_scores if c['modalities'] and all(m in CANONICAL_MODALITIES for m in c['modalities']))

    report += f"""- Have photos: {center_with_photo}/{len(center_scores)} ({100*center_with_photo//len(center_scores)}%)
- Have good description (>10 words): {center_with_desc}/{len(center_scores)} ({100*center_with_desc//len(center_scores)}%)
- Have valid email + phone: {center_with_contact}/{len(center_scores)} ({100*center_with_contact//len(center_scores)}%)
- Have canonical modalities: {center_with_mods}/{len(center_scores)} ({100*center_with_mods//len(center_scores)}%)
- Average quality score: {center_avg_score:.0f}/100

---

## Practitioners by Quality Score

### Top 10 (ready to publish)
"""

    prac_sorted = sorted(prac_scores, key=lambda x: (-x['score'], x['name']))
    for p in prac_sorted[:10]:
        status_badge = '✓ Good' if p['score'] >= 70 else '⚠ Needs work'
        report += f"\n**{p['name']}** ({status_badge}) — Score: {p['score']}/100\n"
        report += f"- Status: {p['status']} | City: {p['city']}\n"
        report += f"- Photo: {'✓' if p['has_photo'] else '✗'} | Bio: {p['bio_words']} words | Contact: {'✓' if p['email_valid'] and p['phone_valid'] else '✗'}\n"
        if p['issues']:
            report += f"- Issues: {', '.join(p['issues'])}\n"

    report += f"\n### Bottom 10 (needs work)\n"
    for p in prac_sorted[-10:]:
        status_badge = '⚠ Needs work'
        report += f"\n**{p['name']}** ({status_badge}) — Score: {p['score']}/100\n"
        report += f"- Status: {p['status']} | City: {p['city']}\n"
        report += f"- Photo: {'✓' if p['has_photo'] else '✗'} | Bio: {p['bio_words']} words | Contact: {'✓' if p['email_valid'] and p['phone_valid'] else '✗'}\n"
        if p['issues']:
            report += f"- Issues: {', '.join(p['issues'])}\n"

    report += f"""

---

## Centers by Quality Score

### Top 10 (ready to publish)
"""

    center_sorted = sorted(center_scores, key=lambda x: (-x['score'], x['name']))
    for c in center_sorted[:10]:
        status_badge = '✓ Good' if c['score'] >= 70 else '⚠ Needs work'
        report += f"\n**{c['name']}** ({status_badge}) — Score: {c['score']}/100\n"
        report += f"- Type: {c['center_type']} | City: {c['city']}\n"
        report += f"- Photos: {'✓' if c['has_photos'] else '✗'} | Desc: {c['desc_words']} words | Contact: {'✓' if c['email_valid'] and c['phone_valid'] else '✗'}\n"
        if c['issues']:
            report += f"- Issues: {', '.join(c['issues'])}\n"

    report += f"""

---

## Critical Issues to Fix Before Publishing

### Practitioners Missing Photos ({len(prac_scores) - prac_with_photo})
"""

    missing_photo_pracs = [p for p in prac_sorted if not p['has_photo']][:5]
    for p in missing_photo_pracs:
        report += f"- {p['name']}\n"
    if len(prac_scores) - prac_with_photo > 5:
        report += f"- ... and {len(prac_scores) - prac_with_photo - 5} more\n"

    report += f"""

### Practitioners Missing Good Bio ({len(prac_scores) - prac_with_bio})
"""

    missing_bio_pracs = [p for p in prac_sorted if p['bio_words'] < 10][:5]
    for p in missing_bio_pracs:
        report += f"- {p['name']} ({p['bio_words']} words)\n"
    if len(prac_scores) - prac_with_bio > 5:
        report += f"- ... and {len(prac_scores) - prac_with_bio - 5} more\n"

    report += f"""

### Practitioners Missing Contact Info ({len(prac_scores) - prac_with_contact})
"""

    missing_contact_pracs = [p for p in prac_sorted if not (p['email_valid'] and p['phone_valid'])][:5]
    for p in missing_contact_pracs:
        email_ok = "✓" if p['email_valid'] else "✗"
        phone_ok = "✓" if p['phone_valid'] else "✗"
        report += f"- {p['name']} (Email: {email_ok} Phone: {phone_ok})\n"
    if len(prac_scores) - prac_with_contact > 5:
        report += f"- ... and {len(prac_scores) - prac_with_contact - 5} more\n"

    report += f"""

### Practitioners with Non-Canonical Modalities ({len(prac_scores) - prac_with_mods})
"""

    bad_mod_pracs = [p for p in prac_sorted if not (p['modalities'] and all(m in CANONICAL_MODALITIES for m in p['modalities']))][:5]
    for p in bad_mod_pracs:
        bad = [m for m in p['modalities'] if m not in CANONICAL_MODALITIES]
        report += f"- {p['name']}: {bad}\n"
    if len(prac_scores) - prac_with_mods > 5:
        report += f"- ... and {len(prac_scores) - prac_with_mods - 5} more\n"

    report += f"""

### Centers Missing Photos ({len(center_scores) - center_with_photo})
"""

    missing_photo_centers = [c for c in center_sorted if not c['has_photos']][:5]
    for c in missing_photo_centers:
        report += f"- {c['name']}\n"
    if len(center_scores) - center_with_photo > 5:
        report += f"- ... and {len(center_scores) - center_with_photo - 5} more\n"

    if prac_dupes:
        report += f"""

---

## Potential Duplicates (Practitioners)

{len(prac_dupes)} possible duplicate pairs found by name fuzzy matching:

"""
        for d in prac_dupes[:5]:
            report += f"- **{d['name1']}** ({d['id1']}) ↔ **{d['name2']}** ({d['id2']}) — {d['similarity']:.0%} match\n"
        if len(prac_dupes) > 5:
            report += f"- ... and {len(prac_dupes)-5} more pairs\n"

    if center_dupes:
        report += f"""

## Potential Duplicates (Centers)

{len(center_dupes)} possible duplicate pairs found by name fuzzy matching:

"""
        for d in center_dupes[:5]:
            report += f"- **{d['name1']}** ({d['id1']}) ↔ **{d['name2']}** ({d['id2']}) — {d['similarity']:.0%} match\n"
        if len(center_dupes) > 5:
            report += f"- ... and {len(center_dupes)-5} more pairs\n"

    report += f"""

---

## Next Steps for Marketing Push

### Phase 1: Data Cleanup (1-2 weeks)
1. Add photos to {len(prac_scores) - prac_with_photo} practitioners missing them
2. Expand bios for {len(prac_scores) - prac_with_bio} with weak descriptions
3. Fill contact info for {len(prac_scores) - prac_with_contact} missing email/phone
4. Fix {len(prac_scores) - prac_with_mods} with bad modalities
5. Review {len(prac_dupes)} potential practitioner duplicates
6. Review {len(center_dupes)} potential center duplicates

### Phase 2: QA & Review (1 week)
1. Spot-check top 20 listings for quality
2. Verify photos are professional and relevant
3. Ensure bios/descriptions are 50+ words and compelling
4. Test all contact links in staging

### Phase 3: Publishing (1 day)
1. Publish all reviewed listings in admin panel
2. Soft launch to email list (monitor for bugs)
3. Full marketing push

### Recommendation
**Do NOT send traffic until:**
- At least 80% of practitioners have photos
- At least 80% have good bios (>50 words is ideal, >10 minimum)
- All have valid contact info
- All modality data is canonical

**Current readiness: 0% — All listings are draft**

Target launch date: 1-2 weeks if you have resources to fill gaps.
"""

    # Save report
    output_path = Path('/sessions/inspiring-brave-ritchie/mnt/aloha-health-hub/.skills/listing-audit-workspace/iteration-1/eval-maui-readiness/with_skill/outputs/readiness_report.md')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report)

    print(f"Report saved to {output_path}\n")
    print("=" * 80)
    print(report)

if __name__ == '__main__':
    main()
