#!/usr/bin/env python3
"""
Listing Audit for Maui Practitioners
Comprehensive data quality and production readiness check
"""
import sys
import json
from datetime import datetime
from pathlib import Path

# Add pipeline to path so we can import supabase_client
sys.path.insert(0, '/sessions/inspiring-brave-ritchie/mnt/aloha-health-hub/pipeline')

from src.supabase_client import client

# Canonical values (from reference files)
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

VALID_ISLANDS = {'big_island', 'maui', 'oahu', 'kauai', 'molokai'}
VALID_STATUS = {'draft', 'published', 'archived'}
VALID_TIERS = {'free', 'premium', 'featured'}
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
    """Simple email validation"""
    if not email:
        return False
    return '@' in email and '.' in email.split('@')[-1]

def validate_url(url):
    """Simple URL validation"""
    if not url:
        return False
    return url.startswith('http://') or url.startswith('https://')

def validate_phone(phone):
    """Check if phone has at least 10 digits"""
    if not phone:
        return False
    digits = ''.join(c for c in phone if c.isdigit())
    return len(digits) >= 10

def count_words(text):
    """Count words in text"""
    if not text:
        return 0
    return len(str(text).split())

def audit_practitioners(pracs):
    """Audit practitioner listings"""
    issues = {
        'critical': [],
        'warnings': [],
        'info': []
    }

    stats = {
        'total': len(pracs),
        'published': sum(1 for p in pracs if p.get('status') == 'published'),
        'draft': sum(1 for p in pracs if p.get('status') == 'draft'),
        'featured': sum(1 for p in pracs if p.get('tier') == 'featured'),
        'missing_photo': 0,
        'missing_bio': 0,
        'missing_contact': 0,
        'broken_modalities': 0,
        'broken_city': 0,
    }

    seen_emails = {}
    seen_phones = {}
    seen_domains = {}

    for p in pracs:
        pid = p.get('id', 'unknown')
        name = p.get('name', 'UNNAMED')
        status = p.get('status')
        tier = p.get('tier')

        # Check 1: Enum values
        if status not in VALID_STATUS:
            issues['critical'].append({
                'type': 'invalid_status',
                'id': pid,
                'name': name,
                'value': status
            })

        if tier not in VALID_TIERS:
            issues['critical'].append({
                'type': 'invalid_tier',
                'id': pid,
                'name': name,
                'value': tier
            })

        if p.get('session_type') not in VALID_SESSION_TYPES:
            issues['critical'].append({
                'type': 'invalid_session_type',
                'id': pid,
                'name': name,
                'value': p.get('session_type')
            })

        # Check 2: Modality validation
        modalities = p.get('modalities', [])
        if not modalities:
            issues['critical'].append({
                'type': 'empty_modalities',
                'id': pid,
                'name': name
            })
            stats['broken_modalities'] += 1
        else:
            invalid_mods = [m for m in modalities if m not in CANONICAL_MODALITIES]
            if invalid_mods:
                issues['critical'].append({
                    'type': 'non_canonical_modalities',
                    'id': pid,
                    'name': name,
                    'invalid': invalid_mods
                })
                stats['broken_modalities'] += 1

        # Check 3: Location validation
        city = p.get('city')
        if city and city not in CANONICAL_CITIES_MAUI:
            issues['warnings'].append({
                'type': 'non_canonical_city',
                'id': pid,
                'name': name,
                'city': city
            })
            stats['broken_city'] += 1

        # Check 4: Contact validation (for published listings)
        if status == 'published':
            # Photo
            avatar_url = p.get('avatar_url')
            if not avatar_url or not validate_url(avatar_url):
                issues['warnings'].append({
                    'type': 'missing_avatar',
                    'id': pid,
                    'name': name
                })
                stats['missing_photo'] += 1

            # Bio
            bio = p.get('bio', '')
            bio_words = count_words(bio)
            if bio_words < 10:
                issues['warnings'].append({
                    'type': 'weak_bio',
                    'id': pid,
                    'name': name,
                    'word_count': bio_words
                })
                stats['missing_bio'] += 1

            # Email
            email = p.get('email')
            if not validate_email(email):
                issues['warnings'].append({
                    'type': 'invalid_email',
                    'id': pid,
                    'name': name,
                    'email': email or '(empty)'
                })
                stats['missing_contact'] += 1
            else:
                if email in seen_emails:
                    issues['warnings'].append({
                        'type': 'duplicate_email',
                        'id': pid,
                        'name': name,
                        'email': email,
                        'first_occurrence': seen_emails[email]
                    })
                else:
                    seen_emails[email] = name

            # Phone
            phone = p.get('phone')
            if not validate_phone(phone):
                issues['warnings'].append({
                    'type': 'invalid_phone',
                    'id': pid,
                    'name': name,
                    'phone': phone or '(empty)'
                })
                stats['missing_contact'] += 1
            else:
                if phone in seen_phones:
                    issues['warnings'].append({
                        'type': 'duplicate_phone',
                        'id': pid,
                        'name': name,
                        'phone': phone,
                        'first_occurrence': seen_phones[phone]
                    })
                else:
                    seen_phones[phone] = name

            # Website
            website_url = p.get('website_url')
            if website_url and validate_url(website_url):
                domain = website_url.replace('https://', '').replace('http://', '').split('/')[0].replace('www.', '')
                if domain in seen_domains:
                    issues['info'].append({
                        'type': 'duplicate_domain',
                        'id': pid,
                        'name': name,
                        'domain': domain,
                        'first_occurrence': seen_domains[domain]
                    })
                else:
                    seen_domains[domain] = name

        # Check 5: Name quality (for practitioners)
        first_name = p.get('first_name', '')
        if first_name and first_name.lower() in {'a', 'an', 'the', 'our', 'we', 'my', 'i', 'for', 'at', 'on', 'in', 'by', 'to'}:
            issues['warnings'].append({
                'type': 'suspicion_bio_in_first_name',
                'id': pid,
                'name': name,
                'first_name': first_name
            })

    return issues, stats

def audit_centers(centers):
    """Audit center listings"""
    issues = {
        'critical': [],
        'warnings': [],
        'info': []
    }

    stats = {
        'total': len(centers),
        'published': sum(1 for c in centers if c.get('status') == 'published'),
        'draft': sum(1 for c in centers if c.get('status') == 'draft'),
        'featured': sum(1 for c in centers if c.get('tier') == 'featured'),
        'missing_photo': 0,
        'missing_description': 0,
        'missing_contact': 0,
        'broken_modalities': 0,
        'broken_city': 0,
    }

    for c in centers:
        cid = c.get('id', 'unknown')
        name = c.get('name', 'UNNAMED')
        status = c.get('status')
        tier = c.get('tier')

        # Check enum values
        if status not in VALID_STATUS:
            issues['critical'].append({
                'type': 'invalid_status',
                'id': cid,
                'name': name,
                'value': status
            })

        if tier not in VALID_TIERS:
            issues['critical'].append({
                'type': 'invalid_tier',
                'id': cid,
                'name': name,
                'value': tier
            })

        # Check modalities
        modalities = c.get('modalities', [])
        if not modalities:
            issues['critical'].append({
                'type': 'empty_modalities',
                'id': cid,
                'name': name
            })
            stats['broken_modalities'] += 1
        else:
            invalid_mods = [m for m in modalities if m not in CANONICAL_MODALITIES]
            if invalid_mods:
                issues['critical'].append({
                    'type': 'non_canonical_modalities',
                    'id': cid,
                    'name': name,
                    'invalid': invalid_mods
                })
                stats['broken_modalities'] += 1

        # Check city
        city = c.get('city')
        if city and city not in CANONICAL_CITIES_MAUI:
            issues['warnings'].append({
                'type': 'non_canonical_city',
                'id': cid,
                'name': name,
                'city': city
            })
            stats['broken_city'] += 1

        # For published centers
        if status == 'published':
            # Photo
            photos = c.get('photos', [])
            if not photos or len(photos) == 0:
                issues['warnings'].append({
                    'type': 'missing_photos',
                    'id': cid,
                    'name': name
                })
                stats['missing_photo'] += 1

            # Description
            description = c.get('description', '')
            desc_words = count_words(description)
            if desc_words < 10:
                issues['warnings'].append({
                    'type': 'weak_description',
                    'id': cid,
                    'name': name,
                    'word_count': desc_words
                })
                stats['missing_description'] += 1

            # Email & Phone
            email = c.get('email')
            phone = c.get('phone')
            if not validate_email(email) or not validate_phone(phone):
                issues['warnings'].append({
                    'type': 'incomplete_contact',
                    'id': cid,
                    'name': name,
                    'has_email': validate_email(email),
                    'has_phone': validate_phone(phone)
                })
                stats['missing_contact'] += 1

    return issues, stats

def generate_report(pracs, centers, pracs_issues, pracs_stats, centers_issues, centers_stats):
    """Generate markdown report"""

    total_published = pracs_stats['published'] + centers_stats['published']
    total_draft = pracs_stats['draft'] + centers_stats['draft']
    total_listings = pracs_stats['total'] + centers_stats['total']

    critical_count = len(pracs_issues['critical']) + len(centers_issues['critical'])
    warning_count = len(pracs_issues['warnings']) + len(centers_issues['warnings'])
    info_count = len(pracs_issues['info']) + len(centers_issues['info'])

    # Quality score: 100 - (critical*10 + warning*2 + info*0.5) but capped 0-100
    quality_score = max(0, 100 - (critical_count * 10 + warning_count * 2))

    report = f"""# Listing Audit Report — Maui
Generated: {datetime.now().isoformat()}

## Executive Summary
- **Total listings:** {pracs_stats['total']} practitioners, {centers_stats['total']} centers
- **Published:** {total_published} | **Draft:** {total_draft}
- **Overall data quality score:** {quality_score:.0f}/100
- **Critical issues:** {critical_count} (blocks publishing)
- **Warnings:** {warning_count} (degrades experience)
- **Info:** {info_count} (nice to fix)

## Production Readiness for Marketing Push

### Quick Answer
**{total_published} published listings are live.** Of these:
- **{pracs_stats['published']} are practitioners**
- **{centers_stats['published']} are centers**

### Quality Assessment
"""

    # Quality breakdown for published
    published_with_photo = pracs_stats['published'] - pracs_stats['missing_photo']
    published_with_bio = pracs_stats['published'] - pracs_stats['missing_bio']
    published_with_contact = pracs_stats['published'] - pracs_stats['missing_contact']

    report += f"""
**For practitioners ({pracs_stats['published']} published):**
- Have photos: {published_with_photo}/{pracs_stats['published']} ({100*published_with_photo//max(1,pracs_stats['published'])}%)
- Have substantial bio (>10 words): {published_with_bio}/{pracs_stats['published']} ({100*published_with_bio//max(1,pracs_stats['published'])}%)
- Have valid contact (email + phone): {published_with_contact}/{pracs_stats['published']} ({100*published_with_contact//max(1,pracs_stats['published'])}%)
- Have modality issues: {pracs_stats['broken_modalities']}

**For centers ({centers_stats['published']} published):**
- Missing issues: {centers_stats['missing_description'] + centers_stats['missing_contact']}

### Recommendation
**Marketing readiness: {"✓ GOOD TO SEND TRAFFIC" if quality_score > 70 and published_with_contact >= pracs_stats['published']*0.8 else "⚠ CAUTION — see critical issues below"}**

---

## Critical Issues (must fix before publishing)
"""

    if critical_count == 0:
        report += "None found. ✓\n"
    else:
        issue_groups = {}
        for issue in pracs_issues['critical'] + centers_issues['critical']:
            itype = issue['type']
            if itype not in issue_groups:
                issue_groups[itype] = []
            issue_groups[itype].append(issue)

        for itype in sorted(issue_groups.keys()):
            group = issue_groups[itype]
            report += f"\n### C{len(issue_groups)}: {itype.replace('_', ' ').title()}\n"
            report += f"**Affected:** {len(group)} records\n"
            for issue in group[:3]:  # Show first 3 examples
                pid = issue['id'][:8]
                name = issue['name'][:50]
                if 'value' in issue:
                    report += f"- `{pid}` {name}: value=`{issue['value']}`\n"
                elif 'invalid' in issue:
                    report += f"- `{pid}` {name}: invalid modalities={issue['invalid']}\n"
                else:
                    report += f"- `{pid}` {name}\n"
            if len(group) > 3:
                report += f"... and {len(group)-3} more\n"

    report += "\n---\n\n## Warnings (degrades user experience)\n"

    if warning_count == 0:
        report += "None found. ✓\n"
    else:
        issue_groups = {}
        for issue in pracs_issues['warnings'] + centers_issues['warnings']:
            itype = issue['type']
            if itype not in issue_groups:
                issue_groups[itype] = []
            issue_groups[itype].append(issue)

        for itype in sorted(issue_groups.keys()):
            group = issue_groups[itype]
            report += f"\n### W{len(issue_groups)}: {itype.replace('_', ' ').title()}\n"
            report += f"**Affected:** {len(group)} records\n"
            for issue in group[:3]:
                pid = issue['id'][:8]
                name = issue['name'][:50]
                if itype == 'missing_avatar':
                    report += f"- `{pid}` {name}: no photo\n"
                elif itype == 'weak_bio':
                    report += f"- `{pid}` {name}: bio too short ({issue.get('word_count', 0)} words)\n"
                elif itype == 'invalid_email':
                    report += f"- `{pid}` {name}: email invalid or missing\n"
                elif itype == 'invalid_phone':
                    report += f"- `{pid}` {name}: phone invalid or missing\n"
                elif itype == 'non_canonical_city':
                    report += f"- `{pid}` {name}: city '{issue['city']}' not in canonical list\n"
                else:
                    report += f"- `{pid}` {name}\n"
            if len(group) > 3:
                report += f"... and {len(group)-3} more\n"

    report += "\n---\n\n## Recommendations for Marketing Push\n\n"

    if published_with_photo < pracs_stats['published'] * 0.8:
        report += f"1. **Add photos to {pracs_stats['published'] - published_with_photo} practitioners** — photos increase conversion. Currently only {published_with_photo}/{pracs_stats['published']} have them.\n"

    if published_with_bio < pracs_stats['published'] * 0.8:
        report += f"2. **Expand bios** — {pracs_stats['published'] - published_with_bio} practitioners have weak descriptions (<10 words). Encourage providers to add more detail.\n"

    if pracs_stats['broken_modalities'] > 0:
        report += f"3. **Fix modality data** — {pracs_stats['broken_modalities']} listings have modality issues. See Critical Issues above.\n"

    if critical_count > 0:
        report += f"4. **Resolve {critical_count} critical issues** before sending traffic.\n"

    report += f"\n**Publication quality:** {quality_score:.0f}/100 — {('Ready for marketing' if quality_score > 70 else 'Needs work before launch')}\n"

    return report

def main():
    print("Fetching Maui practitioners...")
    pracs = fetch_all('practitioners', 'maui')
    print(f"  Found {len(pracs)} practitioners")

    print("Fetching Maui centers...")
    centers = fetch_all('centers', 'maui')
    print(f"  Found {len(centers)} centers")

    print("Auditing practitioners...")
    pracs_issues, pracs_stats = audit_practitioners(pracs)

    print("Auditing centers...")
    centers_issues, centers_stats = audit_centers(centers)

    print("Generating report...")
    report = generate_report(pracs, centers, pracs_issues, pracs_stats, centers_issues, centers_stats)

    # Save report
    output_path = Path('/sessions/inspiring-brave-ritchie/mnt/aloha-health-hub/.skills/listing-audit-workspace/iteration-1/eval-maui-readiness/with_skill/outputs/readiness_report.md')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report)

    print(f"\nReport saved to {output_path}")
    print("\n" + "="*70)
    print(report)

if __name__ == '__main__':
    main()
