#!/usr/bin/env python3
"""
Data quality audit for Big Island draft listings.
Identifies missing fields, bad data, duplicates, and other blockers.
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from collections import defaultdict
from difflib import SequenceMatcher

# Load environment
load_dotenv(dotenv_path=Path('.env'))

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env")
    sys.exit(1)

client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Define canonical modalities
CANONICAL_MODALITIES = {
    "Acupuncture", "Alternative Therapy", "Art Therapy", "Astrology", "Ayurveda",
    "Birth Doula", "Breathwork", "Chiropractic", "Counseling", "Craniosacral",
    "Dentistry", "Energy Healing", "Family Constellation", "Fitness", "Functional Medicine",
    "Hawaiian Healing", "Herbalism", "Hypnotherapy", "IV Therapy", "Life Coaching",
    "Lomilomi / Hawaiian Healing", "Longevity", "Massage", "Meditation", "Midwife",
    "Nature Therapy", "Naturopathic", "Nervous System Regulation", "Network Chiropractic",
    "Nutrition", "Osteopathic", "Physical Therapy", "Psychic", "Psychotherapy", "Reiki",
    "Ritualist", "Somatic Therapy", "Soul Guidance", "Sound Healing",
    "TCM (Traditional Chinese Medicine)", "Trauma-Informed Care",
    "Watsu / Water Therapy", "Women's Health", "Yoga"
}

def normalize_phone(phone):
    """Extract 10-digit phone number."""
    if not phone:
        return None
    digits = ''.join(c for c in phone if c.isdigit())
    return digits[-10:] if len(digits) >= 10 else None

def normalize_domain(url):
    """Extract domain from URL."""
    if not url:
        return None
    url = url.lower().strip()
    url = url.replace('https://', '').replace('http://', '').replace('www.', '')
    return url.rstrip('/').split('/')[0]

def fuzzy_match(s1, s2, threshold=0.85):
    """Fuzzy string matching."""
    if not s1 or not s2:
        return False
    ratio = SequenceMatcher(None, s1.lower(), s2.lower()).ratio()
    return ratio >= threshold

def analyze_drafts():
    """Run comprehensive audit."""
    print("Fetching Big Island draft listings...")

    # Fetch all draft practitioners and centers
    try:
        prac_response = client.table('practitioners').select('*').eq('island', 'big_island').eq('status', 'draft').execute()
        practitioners = prac_response.data if prac_response.data else []
    except Exception as e:
        print(f"Error fetching practitioners: {e}")
        practitioners = []

    try:
        center_response = client.table('centers').select('*').eq('island', 'big_island').eq('status', 'draft').execute()
        centers = center_response.data if center_response.data else []
    except Exception as e:
        print(f"Error fetching centers: {e}")
        centers = []

    print(f"Found {len(practitioners)} draft practitioners, {len(centers)} draft centers\n")

    # Initialize audit results
    issues = {
        'missing_name': [],
        'missing_contact': [],
        'missing_modalities': [],
        'bad_modalities': [],
        'missing_location': [],
        'missing_geo': [],
        'invalid_session_type': [],
        'missing_bio': [],
        'potential_duplicates': [],
        'missing_avatar': [],
    }

    sql_fixes = []

    # ============================================================
    # PRACTITIONERS AUDIT
    # ============================================================

    print("=" * 70)
    print("PRACTITIONERS AUDIT")
    print("=" * 70)

    for p in practitioners:
        pid = p['id']

        # Missing name
        if not p.get('name') or not str(p.get('name')).strip():
            issues['missing_name'].append(('practitioner', pid, p))

        # Missing contact (phone AND email)
        has_phone = bool(p.get('phone') and str(p.get('phone')).strip())
        has_email = bool(p.get('email') and str(p.get('email')).strip())
        if not has_phone and not has_email:
            issues['missing_contact'].append(('practitioner', pid, p))

        # Missing modalities
        modalities = p.get('modalities') or []
        if not modalities:
            issues['missing_modalities'].append(('practitioner', pid, p))
        else:
            # Check for invalid modalities
            bad_mods = [m for m in modalities if m not in CANONICAL_MODALITIES]
            if bad_mods:
                issues['bad_modalities'].append(('practitioner', pid, p, bad_mods))

        # Missing location (city and address)
        has_city = bool(p.get('city') and str(p.get('city')).strip())
        has_address = bool(p.get('address') and str(p.get('address')).strip())
        if not has_city or not has_address:
            issues['missing_location'].append(('practitioner', pid, p))

        # Missing geographic coordinates
        has_lat = p.get('lat') is not None
        has_lng = p.get('lng') is not None
        if not has_lat or not has_lng:
            issues['missing_geo'].append(('practitioner', pid, p))

        # Invalid session_type
        session_type = p.get('session_type')
        if session_type and session_type not in ('in_person', 'online', 'both'):
            issues['invalid_session_type'].append(('practitioner', pid, p, session_type))

        # Missing bio (critical for discovery)
        bio = p.get('bio')
        if not bio or len(str(bio).strip()) < 20:
            issues['missing_bio'].append(('practitioner', pid, p))

        # Missing avatar
        if not p.get('avatar_url'):
            issues['missing_avatar'].append(('practitioner', pid, p))

    # ============================================================
    # CENTERS AUDIT
    # ============================================================

    print("\n" + "=" * 70)
    print("CENTERS AUDIT")
    print("=" * 70)

    for c in centers:
        cid = c['id']

        # Missing name
        if not c.get('name') or not str(c.get('name')).strip():
            issues['missing_name'].append(('center', cid, c))

        # Missing contact
        has_phone = bool(c.get('phone') and str(c.get('phone')).strip())
        has_email = bool(c.get('email') and str(c.get('email')).strip())
        if not has_phone and not has_email:
            issues['missing_contact'].append(('center', cid, c))

        # Missing modalities
        modalities = c.get('modalities') or []
        if not modalities:
            issues['missing_modalities'].append(('center', cid, c))
        else:
            bad_mods = [m for m in modalities if m not in CANONICAL_MODALITIES]
            if bad_mods:
                issues['bad_modalities'].append(('center', cid, c, bad_mods))

        # Missing location
        has_city = bool(c.get('city') and str(c.get('city')).strip())
        has_address = bool(c.get('address') and str(c.get('address')).strip())
        if not has_city or not has_address:
            issues['missing_location'].append(('center', cid, c))

        # Missing geo
        has_lat = c.get('lat') is not None
        has_lng = c.get('lng') is not None
        if not has_lat or not has_lng:
            issues['missing_geo'].append(('center', cid, c))

        # Invalid session_type
        session_type = c.get('session_type')
        if session_type and session_type not in ('in_person', 'online', 'both'):
            issues['invalid_session_type'].append(('center', cid, c, session_type))

        # Missing description
        desc = c.get('description')
        if not desc or len(str(desc).strip()) < 20:
            issues['missing_bio'].append(('center', cid, c))

        # Missing photos
        photos = c.get('photos') or []
        if not photos:
            issues['missing_avatar'].append(('center', cid, c))

    # ============================================================
    # DEDUPLICATION CHECK
    # ============================================================

    all_listings = [(t, 'practitioner', d) for t, d in [('p', p) for p in practitioners]] + \
                   [(t, 'center', d) for t, d in [('c', c) for c in centers]]

    # Build lookup maps
    phone_map = defaultdict(list)
    domain_map = defaultdict(list)
    name_map = defaultdict(list)

    for listing_type, table_type, data in [('practitioner', 'practitioner', p) for p in practitioners] + \
                                           [('center', 'center', c) for c in centers]:
        if data.get('phone'):
            norm_phone = normalize_phone(data['phone'])
            if norm_phone:
                phone_map[norm_phone].append((listing_type, data['id'], data))

        if data.get('website_url'):
            norm_domain = normalize_domain(data['website_url'])
            if norm_domain:
                domain_map[norm_domain].append((listing_type, data['id'], data))

        if data.get('name'):
            name_map[data['name'].lower()].append((listing_type, data['id'], data))

    # Find duplicates
    dupes_found = set()
    for phone, items in phone_map.items():
        if len(items) > 1:
            for item in items:
                dupes_found.add(item[1])
            issues['potential_duplicates'].append(('phone', phone, items))

    for domain, items in domain_map.items():
        if len(items) > 1:
            for item in items:
                dupes_found.add(item[1])
            issues['potential_duplicates'].append(('domain', domain, items))

    # Fuzzy name matching within same island
    checked_pairs = set()
    for name, items in name_map.items():
        if len(items) > 1:
            for i, item1 in enumerate(items):
                for item2 in items[i+1:]:
                    pair = tuple(sorted([item1[1], item2[1]]))
                    if pair not in checked_pairs:
                        checked_pairs.add(pair)
                        if fuzzy_match(item1[2]['name'], item2[2]['name'], 0.80):
                            issues['potential_duplicates'].append(('fuzzy_name', name, [item1, item2]))

    # ============================================================
    # REPORT GENERATION
    # ============================================================

    report = []
    report.append("# BIG ISLAND DRAFT LISTINGS AUDIT REPORT\n")
    report.append(f"**Total Draft Practitioners:** {len(practitioners)}\n")
    report.append(f"**Total Draft Centers:** {len(centers)}\n")
    report.append(f"**Total Draft Listings:** {len(practitioners) + len(centers)}\n\n")

    # Count critical issues
    critical_count = (
        len(issues['missing_name']) +
        len(issues['missing_contact']) +
        len(issues['missing_modalities']) +
        len(issues['missing_location']) +
        len(issues['missing_geo'])
    )

    report.append(f"**Critical Issues (blocking publish):** {critical_count}\n")
    report.append(f"**Warnings (should fix):** {len(issues['bad_modalities']) + len(issues['missing_bio']) + len(issues['missing_avatar'])}\n")
    report.append(f"**Potential Duplicates:** {len(issues['potential_duplicates'])}\n\n")

    # ============================================================
    # CRITICAL ISSUES (RANKED BY SEVERITY)
    # ============================================================

    report.append("---\n\n")
    report.append("## CRITICAL ISSUES (BLOCKING PUBLICATION)\n\n")

    # 1. Missing Name (hardest to fix, most critical)
    if issues['missing_name']:
        report.append(f"### 1. MISSING NAME ({len(issues['missing_name'])} listings)\n")
        report.append("**Severity:** CRITICAL — Cannot publish without a name.\n\n")
        for listing_type, listing_id, data in issues['missing_name']:
            name = data.get('name', '(empty)')
            email = data.get('email', 'N/A')
            phone = data.get('phone', 'N/A')
            report.append(f"- **{listing_type.upper()}** `{listing_id}`\n")
            report.append(f"  - Current name: `{name}`\n")
            report.append(f"  - Contact: {email} / {phone}\n")
        report.append("\n**SQL Fix (manual review required first):**\n```sql\n")
        for listing_type, listing_id, data in issues['missing_name']:
            table = 'practitioners' if listing_type == 'practitioner' else 'centers'
            report.append(f"-- Review and update this entry\n")
            report.append(f"-- UPDATE {table} SET name = '???' WHERE id = '{listing_id}';\n")
        report.append("```\n\n")

    # 2. Missing Contact
    if issues['missing_contact']:
        report.append(f"### 2. MISSING CONTACT INFO ({len(issues['missing_contact'])} listings)\n")
        report.append("**Severity:** CRITICAL — Need phone OR email.\n\n")
        for listing_type, listing_id, data in issues['missing_contact']:
            name = data.get('name', 'N/A')
            report.append(f"- **{listing_type.upper()}** `{listing_id}` — {name}\n")
        report.append("\n**SQL to find these:**\n```sql\n")
        report.append("SELECT id, name, phone, email FROM practitioners WHERE island = 'big_island' AND status = 'draft' AND (phone IS NULL OR phone = '') AND (email IS NULL OR email = '');\n")
        report.append("SELECT id, name, phone, email FROM centers WHERE island = 'big_island' AND status = 'draft' AND (phone IS NULL OR phone = '') AND (email IS NULL OR email = '');\n")
        report.append("```\n\n")

    # 3. Missing Modalities
    if issues['missing_modalities']:
        report.append(f"### 3. MISSING MODALITIES ({len(issues['missing_modalities'])} listings)\n")
        report.append("**Severity:** CRITICAL — Must classify what services are offered.\n\n")
        for listing_type, listing_id, data in issues['missing_modalities']:
            name = data.get('name', 'N/A')
            report.append(f"- **{listing_type.upper()}** `{listing_id}` — {name}\n")
        report.append("\n**SQL to fix (set modalities array):**\n```sql\n")
        report.append("-- Example: Assign modalities based on business name or type\n")
        for listing_type, listing_id, data in issues['missing_modalities'][:5]:
            table = 'practitioners' if listing_type == 'practitioner' else 'centers'
            name = data.get('name', 'N/A')
            report.append(f"-- UPDATE {table} SET modalities = ARRAY['Massage', 'Wellness'] WHERE id = '{listing_id}'; -- {name}\n")
        if len(issues['missing_modalities']) > 5:
            report.append(f"-- ... and {len(issues['missing_modalities']) - 5} more\n")
        report.append("```\n\n")

    # 4. Missing Location (City/Address)
    if issues['missing_location']:
        report.append(f"### 4. MISSING LOCATION ({len(issues['missing_location'])} listings)\n")
        report.append("**Severity:** CRITICAL — Need city and address for directory display.\n\n")
        for listing_type, listing_id, data in issues['missing_location']:
            name = data.get('name', 'N/A')
            city = data.get('city', '(empty)')
            address = data.get('address', '(empty)')
            report.append(f"- **{listing_type.upper()}** `{listing_id}` — {name}\n")
            report.append(f"  - City: `{city}` | Address: `{address}`\n")
        report.append("\n**SQL to review:**\n```sql\n")
        report.append("SELECT id, name, city, address FROM practitioners WHERE island = 'big_island' AND status = 'draft' AND (city IS NULL OR city = '' OR address IS NULL OR address = '');\n")
        report.append("```\n\n")

    # 5. Missing Geographic Coordinates
    if issues['missing_geo']:
        report.append(f"### 5. MISSING GEO COORDINATES ({len(issues['missing_geo'])} listings)\n")
        report.append("**Severity:** CRITICAL — Map won't work without lat/lng.\n\n")
        for listing_type, listing_id, data in issues['missing_geo']:
            name = data.get('name', 'N/A')
            address = data.get('address', 'N/A')
            report.append(f"- **{listing_type.upper()}** `{listing_id}` — {name} @ {address}\n")
        report.append("\n**SQL to find:**\n```sql\n")
        report.append("SELECT id, name, address, city, lat, lng FROM practitioners WHERE island = 'big_island' AND status = 'draft' AND (lat IS NULL OR lng IS NULL);\n")
        report.append("```\n\n")
        report.append("**Solution:** Use Google Maps API or manual geocoding to populate lat/lng:\n")
        report.append("```sql\n")
        report.append("UPDATE practitioners SET lat = 19.7299, lng = -156.1551 WHERE id = '...' AND name LIKE '%..%';\n")
        report.append("```\n\n")

    # ============================================================
    # WARNINGS (SHOULD FIX)
    # ============================================================

    report.append("---\n\n")
    report.append("## WARNINGS (SHOULD FIX BEFORE PUBLISHING)\n\n")

    # Bad modalities
    if issues['bad_modalities']:
        report.append(f"### Invalid Modalities ({len(issues['bad_modalities'])} listings)\n")
        report.append("**Issue:** Modalities don't match canonical list. These won't appear in search filters.\n\n")
        bad_mod_set = set()
        for listing_type, listing_id, data, bad_mods in issues['bad_modalities']:
            name = data.get('name', 'N/A')
            report.append(f"- **{listing_type.upper()}** `{listing_id}` — {name}\n")
            report.append(f"  - Invalid: {bad_mods}\n")
            for mod in bad_mods:
                bad_mod_set.add(mod)

        report.append(f"\n**Invalid modalities found (map to canonical):**\n")
        for mod in sorted(bad_mod_set):
            report.append(f"- `{mod}` → (closest match?)\n")

        report.append("\n**SQL to replace bad modalities:**\n```sql\n")
        report.append("-- EXAMPLE: Replace 'Massage Therapy' with 'Massage'\n")
        report.append("UPDATE practitioners SET modalities = array_replace(modalities, 'Massage Therapy', 'Massage') WHERE island = 'big_island' AND status = 'draft';\n")
        report.append("```\n\n")

    # Missing bio
    if issues['missing_bio']:
        report.append(f"### Missing Description/Bio ({len(issues['missing_bio'])} listings)\n")
        report.append("**Issue:** No description makes listings less discoverable and professional.\n\n")
        for listing_type, listing_id, data in issues['missing_bio'][:10]:
            name = data.get('name', 'N/A')
            bio_len = len(str(data.get('bio') or '').strip())
            report.append(f"- **{listing_type.upper()}** `{listing_id}` — {name} (bio: {bio_len} chars)\n")
        if len(issues['missing_bio']) > 10:
            report.append(f"- ... and {len(issues['missing_bio']) - 10} more\n")
        report.append("\n**Recommendation:** Use website enrichment pipeline to auto-fill bios:\n")
        report.append("```bash\ncd pipeline\npython scripts/22_website_enrich.py --island big_island --apply\n```\n\n")

    # Missing avatar
    if issues['missing_avatar']:
        report.append(f"### Missing Avatar/Photos ({len(issues['missing_avatar'])} listings)\n")
        report.append("**Issue:** No images = lower engagement in directory.\n\n")
        report.append(f"- Practitioners without avatar_url: {len([x for x in issues['missing_avatar'] if x[0] == 'practitioner'])}\n")
        report.append(f"- Centers without photos: {len([x for x in issues['missing_avatar'] if x[0] == 'center'])}\n")
        report.append("\n**Recommendation:** Use website enrichment pipeline:\n")
        report.append("```bash\ncd pipeline\npython scripts/22_website_enrich.py --island big_island --apply\n```\n\n")

    # Invalid session type
    if issues['invalid_session_type']:
        report.append(f"### Invalid Session Type ({len(issues['invalid_session_type'])} listings)\n")
        report.append("**Issue:** session_type must be 'in_person', 'online', or 'both'.\n\n")
        for listing_type, listing_id, data, st in issues['invalid_session_type']:
            name = data.get('name', 'N/A')
            report.append(f"- **{listing_type.upper()}** `{listing_id}` — {name}: `{st}`\n")
        report.append("\n**SQL to fix:**\n```sql\n")
        report.append("UPDATE practitioners SET session_type = 'in_person' WHERE island = 'big_island' AND status = 'draft' AND session_type NOT IN ('in_person', 'online', 'both');\n")
        report.append("UPDATE centers SET session_type = 'in_person' WHERE island = 'big_island' AND status = 'draft' AND session_type NOT IN ('in_person', 'online', 'both');\n")
        report.append("```\n\n")

    # ============================================================
    # DUPLICATES
    # ============================================================

    if issues['potential_duplicates']:
        report.append("---\n\n")
        report.append(f"## POTENTIAL DUPLICATES ({len(issues['potential_duplicates'])} groups)\n\n")

        for i, dup_group in enumerate(issues['potential_duplicates'], 1):
            if dup_group[0] == 'phone':
                _, phone, items = dup_group
                report.append(f"### Duplicate Set {i}: Phone Match `{phone}`\n")
                for listing_type, listing_id, data in items:
                    name = data.get('name', 'N/A')
                    address = data.get('address', 'N/A')
                    report.append(f"- **{listing_type.upper()}** `{listing_id}` — {name}\n")
                    report.append(f"  - {address}\n")
                report.append("\n")

            elif dup_group[0] == 'domain':
                _, domain, items = dup_group
                report.append(f"### Duplicate Set {i}: Website Match `{domain}`\n")
                for listing_type, listing_id, data in items:
                    name = data.get('name', 'N/A')
                    website = data.get('website_url', 'N/A')
                    report.append(f"- **{listing_type.upper()}** `{listing_id}` — {name}\n")
                    report.append(f"  - {website}\n")
                report.append("\n")

            elif dup_group[0] == 'fuzzy_name':
                _, name_key, items = dup_group
                report.append(f"### Duplicate Set {i}: Fuzzy Name Match `{name_key}`\n")
                for listing_type, listing_id, data in items:
                    name = data.get('name', 'N/A')
                    city = data.get('city', 'N/A')
                    report.append(f"- **{listing_type.upper()}** `{listing_id}` — {name} ({city})\n")
                report.append("\n")

        report.append("**Action:** Review each set and delete the lower-quality duplicate.\n")
        report.append("```sql\n")
        report.append("-- Delete by ID (after review)\n")
        report.append("DELETE FROM practitioners WHERE id = '...';\n")
        report.append("DELETE FROM centers WHERE id = '...';\n")
        report.append("```\n\n")

    # ============================================================
    # SUMMARY & NEXT STEPS
    # ============================================================

    report.append("---\n\n")
    report.append("## SUMMARY & NEXT STEPS\n\n")

    total_issues = sum(len(v) if isinstance(v, list) else 0 for v in issues.values())
    report.append(f"**Total Data Quality Issues:** {total_issues}\n\n")

    report.append("### Priority Order to Fix\n\n")
    report.append("1. **Delete duplicates** — Most critical. Prevents confusion.\n")
    report.append("2. **Add missing names** — Can't publish without identifying information.\n")
    report.append("3. **Add contact info** — Phone or email required for each listing.\n")
    report.append("4. **Classify modalities** — Must map to canonical list for search/filters.\n")
    report.append("5. **Geocode locations** — lat/lng required for map display.\n")
    report.append("6. **Enrich descriptions** — Run website enrichment pipeline.\n")
    report.append("7. **Fix invalid fields** — session_type, modalities.\n\n")

    report.append("### Bulk Fix Commands\n\n")

    report.append("**Set default session_type for missing values:**\n")
    report.append("```sql\n")
    report.append("UPDATE practitioners SET session_type = 'in_person' WHERE island = 'big_island' AND status = 'draft' AND (session_type IS NULL OR session_type NOT IN ('in_person', 'online', 'both'));\n")
    report.append("UPDATE centers SET session_type = 'in_person' WHERE island = 'big_island' AND status = 'draft' AND (session_type IS NULL OR session_type NOT IN ('in_person', 'online', 'both'));\n")
    report.append("```\n\n")

    report.append("**View all draft practitioners on Big Island (review before publishing):**\n")
    report.append("```sql\n")
    report.append("SELECT id, name, city, modalities, phone, email, lat, lng, bio FROM practitioners WHERE island = 'big_island' AND status = 'draft' ORDER BY created_at DESC;\n")
    report.append("```\n\n")

    report.append("**View all draft centers on Big Island:**\n")
    report.append("```sql\n")
    report.append("SELECT id, name, city, center_type, modalities, phone, email, lat, lng, description FROM centers WHERE island = 'big_island' AND status = 'draft' ORDER BY created_at DESC;\n")
    report.append("```\n\n")

    report.append("### Recommended Tooling\n\n")
    report.append("- **Website Enrichment:** `pipeline/scripts/22_website_enrich.py --island big_island --apply`\n")
    report.append("- **Geocoding:** Google Maps API (already integrated in pipeline)\n")
    report.append("- **Taxonomy validation:** Check modalities against canonical list in CLAUDE.md\n\n")

    return "".join(report)

if __name__ == '__main__':
    output = analyze_drafts()
    print(output)

    # Save report
    output_dir = Path('.skills/listing-audit-workspace/iteration-1/eval-draft-audit/without_skill/outputs')
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / 'audit_report.md'
    report_path.write_text(output)
    print(f"\n✓ Report saved to {report_path}")
