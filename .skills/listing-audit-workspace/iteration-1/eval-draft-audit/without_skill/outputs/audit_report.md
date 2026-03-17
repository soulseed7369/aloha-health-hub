# BIG ISLAND DRAFT LISTINGS AUDIT REPORT
**Total Draft Practitioners:** 121
**Total Draft Centers:** 283
**Total Draft Listings:** 404

**Critical Issues (blocking publish):** 35
**Warnings (should fix):** 611
**Potential Duplicates:** 10

---

## CRITICAL ISSUES (BLOCKING PUBLICATION)

### 2. MISSING CONTACT INFO (19 listings)
**Severity:** CRITICAL — Need phone OR email.

- **PRACTITIONER** `1da4ebd8-009f-489f-a952-caa24db7da4f` — Victorious Trainings
- **PRACTITIONER** `bc8e9340-706f-4a61-be18-c1962a5be134` — Kerry Scharf
- **PRACTITIONER** `5c6a47b1-8c70-474d-9a3b-1947a41c82d4` — Ho’omana Strength and Conditioning
- **PRACTITIONER** `0c78b458-d80f-4790-8e85-3c31eaa0a94e` — Sunstar Ayurveda
- **PRACTITIONER** `153ed284-18a4-4e6d-a166-60dcd6749bb1` — Aloha Ayurveda
- **PRACTITIONER** `f862e089-eea2-4b95-9a1d-bfd11347de22` — Lokahi Temple orchidland
- **PRACTITIONER** `cc669b5d-3bd1-45a8-a041-319f87393733` — Pacific Holistics Inc
- **PRACTITIONER** `2810283a-5f0f-42b2-bd1a-ae645c8222fb` — Teje Aliberti
- **PRACTITIONER** `a669a900-c5b0-4663-a7a4-9c9eebed0d26` — Harold V. Hall
- **CENTER** `cfd523de-a70a-49a3-a9ea-6c230f6ead09` — Chiropractic Care and Massage
- **CENTER** `e4e71929-c4b5-4419-9144-8a25b57382bd` — Kambo Hawaii
- **CENTER** `557a61ca-0b98-406a-8ad4-a0f280c898e8` — Ka Hoku Kai Counseling Center
- **CENTER** `87dd0d6c-383b-4481-9016-a2ffe6a7275e` — Hawaii Quantum Alignment Bodywork South Kona Big Island Hawaii
- **CENTER** `e58739f7-878c-42aa-9456-87c7fe36c1eb` — Hilo Bay Spa
- **CENTER** `3cdeea4f-1e8f-44b8-9c8a-c2b8b2bfa2b4` — Stacy Haumea - Nutritionist
- **CENTER** `0b783b17-3f11-477b-a8b8-6513a339034c` — Moana Medicine LLC - Functional Medicine
- **CENTER** `44f529b3-8194-4f91-8b1a-0ad3809d1afa` — Pacific Aacdemy of the Healing Arts
- **CENTER** `caf30173-6a07-4b5c-aff2-29045deba29c` — Honoka’a Wellness Center
- **CENTER** `bb92c083-79bf-4dbb-af6a-2c83c68d74be` — Pristine Beauty Hawaii

**SQL to find these:**
```sql
SELECT id, name, phone, email FROM practitioners WHERE island = 'big_island' AND status = 'draft' AND (phone IS NULL OR phone = '') AND (email IS NULL OR email = '');
SELECT id, name, phone, email FROM centers WHERE island = 'big_island' AND status = 'draft' AND (phone IS NULL OR phone = '') AND (email IS NULL OR email = '');
```

### 4. MISSING LOCATION (7 listings)
**Severity:** CRITICAL — Need city and address for directory display.

- **PRACTITIONER** `41b860dc-da54-4b3d-af65-761df282d854` — Lee
  - City: `Kailua-Kona` | Address: ``
- **PRACTITIONER** `3e773b7b-65c2-44e9-908e-07dad94c2e31` — Mihai
  - City: `Kailua-Kona` | Address: `None`
- **PRACTITIONER** `34580d9b-98ad-4873-a833-1e75e526ba10` — Lindsay
  - City: `Kailua-Kona` | Address: `None`
- **CENTER** `87dd0d6c-383b-4481-9016-a2ffe6a7275e` — Hawaii Quantum Alignment Bodywork South Kona Big Island Hawaii
  - City: `Kona` | Address: `None`
- **CENTER** `06a79858-8425-435d-872c-0b747348352c` —  HAWAIIAN HEALING AND WISDOM for MODERN LIVING
  - City: `None` | Address: `None`
- **CENTER** `18770742-5c66-4360-b088-fffc2455bc8b` — Holotropic Breathwork retreat
  - City: `Naalehu` | Address: `None`
- **CENTER** `d1569ad3-16ae-476a-8ec2-b2527a9e121c` — Experience Energy Healing Hawaii for Holistic Wellness
  - City: `Captain Cook` | Address: `None`

**SQL to review:**
```sql
SELECT id, name, city, address FROM practitioners WHERE island = 'big_island' AND status = 'draft' AND (city IS NULL OR city = '' OR address IS NULL OR address = '');
```

### 5. MISSING GEO COORDINATES (9 listings)
**Severity:** CRITICAL — Map won't work without lat/lng.

- **PRACTITIONER** `41b860dc-da54-4b3d-af65-761df282d854` — Lee @ 
- **PRACTITIONER** `3e773b7b-65c2-44e9-908e-07dad94c2e31` — Mihai @ None
- **PRACTITIONER** `34580d9b-98ad-4873-a833-1e75e526ba10` — Lindsay @ None
- **CENTER** `557a61ca-0b98-406a-8ad4-a0f280c898e8` — Ka Hoku Kai Counseling Center @ 166 Kamehameha Ave, Hilo, HI 96720
- **CENTER** `87dd0d6c-383b-4481-9016-a2ffe6a7275e` — Hawaii Quantum Alignment Bodywork South Kona Big Island Hawaii @ None
- **CENTER** `06a79858-8425-435d-872c-0b747348352c` —  HAWAIIAN HEALING AND WISDOM for MODERN LIVING @ None
- **CENTER** `18770742-5c66-4360-b088-fffc2455bc8b` — Holotropic Breathwork retreat @ None
- **CENTER** `d1569ad3-16ae-476a-8ec2-b2527a9e121c` — Experience Energy Healing Hawaii for Holistic Wellness @ None
- **CENTER** `f65adb5c-3813-44cb-b084-34cc5541bf97` — Ohana Osteopathic & Wellness Center @ 122 Oneawa Street #101 Kailua, None None

**SQL to find:**
```sql
SELECT id, name, address, city, lat, lng FROM practitioners WHERE island = 'big_island' AND status = 'draft' AND (lat IS NULL OR lng IS NULL);
```

**Solution:** Use Google Maps API or manual geocoding to populate lat/lng:
```sql
UPDATE practitioners SET lat = 19.7299, lng = -156.1551 WHERE id = '...' AND name LIKE '%..%';
```

---

## WARNINGS (SHOULD FIX BEFORE PUBLISHING)

### Invalid Modalities (2 listings)
**Issue:** Modalities don't match canonical list. These won't appear in search filters.

- **CENTER** `d1569ad3-16ae-476a-8ec2-b2527a9e121c` — Experience Energy Healing Hawaii for Holistic Wellness
  - Invalid: ['energy healing']
- **CENTER** `f65adb5c-3813-44cb-b084-34cc5541bf97` — Ohana Osteopathic & Wellness Center
  - Invalid: ['Trauma Informed Services']

**Invalid modalities found (map to canonical):**
- `Trauma Informed Services` → (closest match?)
- `energy healing` → (closest match?)

**SQL to replace bad modalities:**
```sql
-- EXAMPLE: Replace 'Massage Therapy' with 'Massage'
UPDATE practitioners SET modalities = array_replace(modalities, 'Massage Therapy', 'Massage') WHERE island = 'big_island' AND status = 'draft';
```

### Missing Description/Bio (224 listings)
**Issue:** No description makes listings less discoverable and professional.

- **PRACTITIONER** `472e05fb-0fd3-48e7-9c40-fd4598a23a20` — LMHC (bio: 0 chars)
- **PRACTITIONER** `a4bcb8f4-174f-48ac-b8ab-f376c0e4107c` — Dr. David Shapiro (bio: 0 chars)
- **PRACTITIONER** `b693ba31-9665-4e6f-b9e3-9477475ff87e` — Nagareda Chiropractic (bio: 0 chars)
- **PRACTITIONER** `ffdbe614-4510-4125-9957-407fc858d012` — Laura Williams (bio: 0 chars)
- **PRACTITIONER** `ec5c3f78-e618-4721-bc71-0d30dbfd036f` — Saki Toguchi, DPT (bio: 0 chars)
- **PRACTITIONER** `1da4ebd8-009f-489f-a952-caa24db7da4f` — Victorious Trainings (bio: 0 chars)
- **PRACTITIONER** `abb552ed-aaeb-478f-913d-57690a7e0359` — Grow Slow Counseling LLC (bio: 0 chars)
- **PRACTITIONER** `551552df-b775-4ea8-a646-f2a30fd2032e` — Chavez Deborah (bio: 0 chars)
- **PRACTITIONER** `821d1624-81a9-45c1-8a42-6b7211f59a90` — Ken Kotner LMT (bio: 0 chars)
- **PRACTITIONER** `be794a31-6a38-465e-a8b3-bfc9119d7244` — Seva Natural Medicine (bio: 0 chars)
- ... and 214 more

**Recommendation:** Use website enrichment pipeline to auto-fill bios:
```bash
cd pipeline
python scripts/22_website_enrich.py --island big_island --apply
```

### Missing Avatar/Photos (385 listings)
**Issue:** No images = lower engagement in directory.

- Practitioners without avatar_url: 102
- Centers without photos: 283

**Recommendation:** Use website enrichment pipeline:
```bash
cd pipeline
python scripts/22_website_enrich.py --island big_island --apply
```

---

## POTENTIAL DUPLICATES (10 groups)

### Duplicate Set 1: Phone Match `3141925352`
- **PRACTITIONER** `41b860dc-da54-4b3d-af65-761df282d854` — Lee
  - 
- **PRACTITIONER** `3e773b7b-65c2-44e9-908e-07dad94c2e31` — Mihai
  - None
- **PRACTITIONER** `34580d9b-98ad-4873-a833-1e75e526ba10` — Lindsay
  - None
- **CENTER** `600eb2c7-553c-46cc-9c6e-420cb54295d9` — Kirpal Meditation & Ecological Center
  - 13-260 Pohoiki Road
Pāhoa, HI, 96778

### Duplicate Set 2: Phone Match `8083265629`
- **CENTER** `29c74e7a-a649-4011-9416-0f1b4d3adc8e` — HICHC Kealakehe Family Health
  - 74-5214 Keanalehu Dr, Kailua-Kona, HI 96740, USA
- **CENTER** `724a5b66-3e59-481a-af07-e07aec4bb745` — HICHC Kuakini Family Health
  - 75-5751 Kuakini Hwy # 104, Kailua-Kona, HI 96740, USA

### Duplicate Set 3: Phone Match `3333333333`
- **CENTER** `27bf1e84-82f8-4881-a387-15ed7d0c6dfc` — Tanaka Family Chiropractic Center
  - 76-6225 Kuakini Hwy STE C-104, Kailua Kona, HI 96740
- **CENTER** `f65adb5c-3813-44cb-b084-34cc5541bf97` — Ohana Osteopathic & Wellness Center
  - 122 Oneawa Street #101 Kailua, None None

### Duplicate Set 4: Website Match `malamaponomassage.com`
- **PRACTITIONER** `41b860dc-da54-4b3d-af65-761df282d854` — Lee
  - https://www.malamaponomassage.com/
- **PRACTITIONER** `3e773b7b-65c2-44e9-908e-07dad94c2e31` — Mihai
  - https://www.malamaponomassage.com/
- **PRACTITIONER** `34580d9b-98ad-4873-a833-1e75e526ba10` — Lindsay
  - https://www.malamaponomassage.com/

### Duplicate Set 5: Website Match `massagebook.com`
- **PRACTITIONER** `999d4db8-7e46-43c9-964e-fc72fb1593fe` — Kalaoa Body Works
  - http://massagebook.com/biz/kalaoabodyworks
- **CENTER** `ad98003f-ea02-4f39-a631-b5544486b2dc` — LeesaLei Massage llc
  - https://www.massagebook.com/leesalei-massage
- **CENTER** `d6219fea-c147-4550-96f3-ca372d1ecd5e` — Precision Massage Therapy LLC
  - https://www.massagebook.com/biz/PrecisionMT
- **CENTER** `324712a1-23bd-4690-b6e3-7a015ed48bd1` — Head to Sole Massage
  - http://massagebook.com/biz/head-to-sole

### Duplicate Set 6: Website Match `parks.hawaiicounty.gov`
- **PRACTITIONER** `84aeee74-21f4-4e1c-9f15-24387b61ae30` — Honokaʻa Sports Complex and Skate Park
  - https://www.parks.hawaiicounty.gov/Home/Components/FacilityDirectory/FacilityDirectory/506/1912?selamenityid=11
- **CENTER** `36d1b1e0-7268-4804-b869-c9cb4f5e9117` — Kea`au Community Center
  - https://www.parks.hawaiicounty.gov/Home/Components/FacilityDirectory/FacilityDirectory/543/1912?npage=5

### Duplicate Set 7: Website Match `instagram.com`
- **PRACTITIONER** `8343acac-d0e1-40b8-9805-f3b8598de364` — Health In Motion Massage
  - https://www.instagram.com/health.in.motion.bodywork
- **CENTER** `caf30173-6a07-4b5c-aff2-29045deba29c` — Honoka’a Wellness Center
  - https://www.instagram.com/honokaawellnesscenter?igsh=c3MwcWIyYWF1OGc3&utm_source=qr

### Duplicate Set 8: Website Match `hichc.org`
- **CENTER** `29c74e7a-a649-4011-9416-0f1b4d3adc8e` — HICHC Kealakehe Family Health
  - http://www.hichc.org/
- **CENTER** `724a5b66-3e59-481a-af07-e07aec4bb745` — HICHC Kuakini Family Health
  - http://www.hichc.org/

### Duplicate Set 9: Website Match `easthawaiihealthclinics.org`
- **CENTER** `a2765316-25f8-4f96-89dd-70ae4c1be958` — East Hawaii Health Clinic at Puna Kai
  - https://www.easthawaiihealthclinics.org/puna-kai/#contact
- **CENTER** `b3e3ac09-9473-434d-8228-a2a9b90c9890` — East Hawaii Health - Orthopedics
  - https://www.easthawaiihealthclinics.org/orthopedics/
- **CENTER** `a2c87224-5361-48a3-ac34-259ba79b4ea1` — East Hawaii Health Clinic - Kea’au
  - https://www.easthawaiihealthclinics.org/east-hawaii-health-clinic-at-keaau/

### Duplicate Set 10: Website Match `policefamilychiropractic.com`
- **CENTER** `c876de1b-dc36-422e-9c44-fe85505deb5b` — Police Family Chiropractic- Kona
  - http://www.policefamilychiropractic.com/
- **CENTER** `05257599-1c8d-421a-8452-531031de3663` — Police Family Chiropractic- Waimea
  - http://www.policefamilychiropractic.com/

**Action:** Review each set and delete the lower-quality duplicate.
```sql
-- Delete by ID (after review)
DELETE FROM practitioners WHERE id = '...';
DELETE FROM centers WHERE id = '...';
```

---

## SUMMARY & NEXT STEPS

**Total Data Quality Issues:** 656

### Priority Order to Fix

1. **Delete duplicates** — Most critical. Prevents confusion.
2. **Add missing names** — Can't publish without identifying information.
3. **Add contact info** — Phone or email required for each listing.
4. **Classify modalities** — Must map to canonical list for search/filters.
5. **Geocode locations** — lat/lng required for map display.
6. **Enrich descriptions** — Run website enrichment pipeline.
7. **Fix invalid fields** — session_type, modalities.

### Bulk Fix Commands

**Set default session_type for missing values:**
```sql
UPDATE practitioners SET session_type = 'in_person' WHERE island = 'big_island' AND status = 'draft' AND (session_type IS NULL OR session_type NOT IN ('in_person', 'online', 'both'));
UPDATE centers SET session_type = 'in_person' WHERE island = 'big_island' AND status = 'draft' AND (session_type IS NULL OR session_type NOT IN ('in_person', 'online', 'both'));
```

**View all draft practitioners on Big Island (review before publishing):**
```sql
SELECT id, name, city, modalities, phone, email, lat, lng, bio FROM practitioners WHERE island = 'big_island' AND status = 'draft' ORDER BY created_at DESC;
```

**View all draft centers on Big Island:**
```sql
SELECT id, name, city, center_type, modalities, phone, email, lat, lng, description FROM centers WHERE island = 'big_island' AND status = 'draft' ORDER BY created_at DESC;
```

### Recommended Tooling

- **Website Enrichment:** `pipeline/scripts/22_website_enrich.py --island big_island --apply`
- **Geocoding:** Google Maps API (already integrated in pipeline)
- **Taxonomy validation:** Check modalities against canonical list in CLAUDE.md

