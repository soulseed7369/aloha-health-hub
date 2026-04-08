# Hawaii Wellness — OpenClaw Weekly Brief

**Handoff from:** Hawaii Wellness (Claude / Cowork)
**Handoff to:** OpenClaw (GPT-5.4 content agent)
**Approval required from:** Marcus before any post goes live unless already explicitly approved/scheduled

---

## Current Posting System

Instagram posting pipeline has been restored.
Use these scripts in `/Users/mythicbitcoin/Claude/hawaii-wellness/scripts/`:

```bash
node scripts/meta-upload-and-publish.mjs \
  --caption "..." \
  --files ./social/output/week-YYYY-MM-DD/post-N-slide1.png [slide2.png ...] \
  [--dry-run]
```

Supporting scripts available:
- `scripts/media-upload.mjs`
- `scripts/meta-publish.mjs`
- `scripts/schedule-instagram-post.sh`

Logs:
- `logs/media-upload.jsonl`
- `logs/meta-publish.jsonl`

---

## Operating Rules from Marcus

1. **Every blog article gets a matching Instagram carousel** — not just a single image snippet.
2. **Practitioner and center spotlights must use real photos** from listing / website / Instagram, never AI-generated.
3. **Modality and guide posts can use stock/public images** when needed.
4. **For the Friday modality guide, all slides should use the same background image and text should render at the top** so more of the image remains visible.
5. **Keep updates concise** — only surface completed work or real blockers.
6. **Posting cadence:** active week schedule may vary; check current schedule section below.

---

## This Week Active Schedule (week of April 6, 2026)

### Sunday — Hula as Medicine
**Status:** already posted manually by OpenClaw on Sunday
**Permalink:** `https://www.instagram.com/p/DWxDSgolJue/`

### Tuesday — Practitioner Spotlight: Wilson Hi Yin Chen
**Status:** scheduled for Tuesday 2026-04-07 08:00 HST via launchd
**Asset:** `projects/hawaii-med-directory/content-engine/output/wilson-spotlight/wilson-cover.png`
**Caption:**
```text
Featured on Hawai'i Wellness 🌺

Today we're highlighting Wilson Hi Yin Chen, a counseling practitioner based in Kailua-Kona.

If you're looking for grounded support for mental and emotional wellbeing on Hawai'i Island, Wilson is one practitioner to look at more closely.

Explore more through the link in bio.

@pursuewholeness

#hawaiiwellness #bigisland #kailuakona #counseling #mentalhealthsupport
```

### Wednesday — Center Spotlight: Inner Alignment Studios
**Status:** scheduled for Wednesday 2026-04-08 08:00 HST via launchd
**Asset:** `projects/hawaii-med-directory/content-engine/output/inner-alignment-cover.png`
**Caption:**
```text
Featured on Hawai'i Wellness 🌺

Today we’re highlighting Inner Alignment Studios, a heart-centered wellness community space in Kailua-Kona.

They offer yoga classes, transformational events, and holistic experiences designed to support your whole self — from community circles and sound baths to seasonal ceremonies and workshops.

Explore more through the link in bio.

@inneralignmentstudios

#hawaiiwellness #bigisland #kailuakona #wellnesscenter #yoga #soundbath
```

### Friday — Wellness Guide: How to Choose the Right Modality
**Status:** scheduled for Friday 2026-04-10 08:00 HST via launchd
**Assets:**
- `projects/hawaii-med-directory/content-engine/output/modality-guide/slide0-cover.png`
- `projects/hawaii-med-directory/content-engine/output/modality-guide/slide2.png`
- `projects/hawaii-med-directory/content-engine/output/modality-guide/slide3.png`
- `projects/hawaii-med-directory/content-engine/output/modality-guide/slide4.png`
- `projects/hawaii-med-directory/content-engine/output/modality-guide/slide5.png`

**Background image for all modality slides:**
`https://images.unsplash.com/uploads/14122810486321888a497/1b0cc699?q=80&w=2942&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`

**Caption:**
```text
Not sure which type of support is right for you?

The best place to start is not the label — it's the need.

Swipe through for a simple guide to choosing the right modality based on what you're actually looking for.

Link in bio.

#hawaiiwellness #holistichealth #wellnesstips #bigisland #hawaiihealth
```

---

## Weekly Review Page

Current visual review page for this week:

```text
/Users/mythicbitcoin/.openclaw/workspace/projects/hawaii-med-directory/content-engine/NEXT_WEEK_REVIEW.html
```

This contains the preview for:
- Sunday Hula carousel
- Tuesday Wilson spotlight
- Wednesday Inner Alignment spotlight
- Friday modality guide

---

## Article Pipeline Source

OpenClaw can now pull article content directly from Supabase using published article rows.

Use:
```http
GET https://sccksxvjckllxlvyuotv.supabase.co/rest/v1/articles
 ?status=eq.published
 &select=id,title,slug,excerpt,body,cover_image_url,tags,published_at
 &order=published_at.desc
```

Headers:
- `apikey: <VITE_SUPABASE_ANON_KEY>`
- `Authorization: Bearer <VITE_SUPABASE_ANON_KEY>`

Current env vars exist in repo env files:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

OpenClaw should use this as the default source for article-based carousel drafting.

---

## Current Coordination Preference

Preferred coordination location between Claude and OpenClaw for social/content work:

```text
/Users/mythicbitcoin/Claude/hawaii-wellness/social/OPENCLAW_BRIEF.md
```

Keep this document current with:
- this week’s scheduled posts
- assets paths
- captions
- posting status
- blockers only if real

---

## Status Table — Week of April 7

| Post | Status | Scheduled | Published |
|------|--------|-----------|-----------|
| Sunday — Hula as Medicine | ✅ done | n/a | ✅ |
| Tuesday — Wilson spotlight | ✅ ready | ✅ | ⬜ |
| Wednesday — Inner Alignment | ✅ ready | ✅ | ⬜ |
| Friday — Modality guide | ✅ ready | ✅ | ⬜ |

---

## Next Week Active Schedule (week of April 14, 2026)

All 5 posts have full captions + asset briefs. See `HW - Social + Content/02 Instagram Calendar.md` for complete slide content and story strategy.

### Monday, April 14 — Mālama / Cultural Post 🤝
**Status:** Needs asset (image) + scheduling
**Pillar:** Community
**Format:** Single image — warm Hawaiian nature scene, no text overlay
**Caption:**
```text
In Hawaiian, mālama means to care for — the land, each other, ourselves.

It's a value that runs through the healing work happening across these islands. Practitioners who see their work not just as a service, but as an act of care.

We built Hawaiiwellness.net to honor that. A place to find the healers who are rooted here — and to help them be found. 🌺

Explore the directory → link in bio.
```
**Hashtags:** #hawaiiwellness #malama #hawaii #hawaiianvalues #holistichealth #bigisland #maui #healingarts #aloha

---

### Tuesday, April 15 — Practitioner Spotlight 🌺
**Status:** Needs practitioner selection from Supabase + asset + caption fill-in
**Pillar:** Practitioner Spotlight
**Format:** Single image — real practitioner photo (no AI)

**OpenClaw: pull from Supabase**
- Query: island = Big Island, has_owner = true (claimed listings only)
- Exclude: Wilson Hi Yin Chen, Inner Alignment Studios (both featured this week)
- Priority modalities: sound healing, craniosacral, somatic therapy, acupuncture, reiki, naturopathic — NOT counseling
- Use real photo from their listing, website, or Instagram

**Caption template:**
```text
🌺 [FULL NAME] — [MODALITY], [CITY], Hawaiʻi Island

[2–3 sentences about what they do, who they serve, what makes them distinctive. Pull from their bio. Warm and specific — never generic.]

Find [FIRST NAME] on Hawaiʻi Wellness → link in bio

[@their_instagram if available]
```
**Hashtags:** #HawaiiWellness #[Modality] #BigIsland #HolisticHealth #HawaiiHealing

---

### Wednesday, April 16 — Education: Naturopath vs. Conventional Medicine 📚
**Status:** Needs carousel assets + scheduling
**Pillar:** Educational
**Format:** Carousel (5 slides) — clean minimal design, text-forward

**Slides:**
1. Cover: "Naturopathic vs. Conventional Medicine" / subtext: "Both can help you heal. Here's what sets them apart."
2. Conventional: Diagnosis + treatment. Acute illness, emergencies. Asks: *what's wrong and how do we treat it?*
3. Naturopathic: Root cause. Whole-person. Nutrition, lifestyle, botanicals. Licensed 4-year grad programs. Asks: *why is this happening and what does your whole system need?*
4. When to consider a naturopath: Chronic conditions, fatigue, hormonal health, prevention. Works alongside conventional care.
5. CTA: "Find a licensed naturopathic doctor in Hawaiʻi → Hawaiiwellness.net"

**Caption:**
```text
Both can help you heal — but they ask different questions.

Conventional medicine asks: what's wrong and how do we treat it? Naturopathic medicine asks: why is this happening, and what does your whole body need?

Neither is better. Knowing the difference helps you find the right support.

Swipe through for a quick breakdown — and find licensed naturopathic doctors in Hawaiʻi at the link in bio.
```
**Hashtags:** #hawaiiwellness #naturopathicmedicine #holistichealth #naturopath #hawaii #integrativemedicine #functionalmedicine #wellnesstips

---

### Thursday, April 17 — Local Discovery: Maui Wellness Guide 🗺️
**Status:** Needs practitioner selection from Supabase + carousel assets + scheduling
**Pillar:** Local Wellness Discovery
**Format:** Carousel (5 slides)

**OpenClaw: pull from Supabase**
- Query: island = Maui, status = published
- Pick 3 entries (2 practitioners + 1 center, OR 3 practitioners) — varied modalities, varied towns
- Prefer claimed listings (can tag them, they may reshare)
- Real photos if available; location card style as fallback
- Cover slide: Maui landscape photo

**Slides:** Cover → Practitioner 1 → Practitioner 2 → Practitioner 3 → CTA ("See all Maui listings → Hawaiiwellness.net")

**Caption:**
```text
Maui's wellness scene is one of the most vibrant in the islands — and a lot of it flies under the radar.

Swipe to meet a few practitioners worth knowing. More in the full Maui directory at the link in bio.

Are you a Maui practitioner not yet listed? Your profile is free to claim. 🌺
```
**Hashtags:** #hawaiiwellness #maui #mauiwellness #mauilife #holistichealth #mauihawaii #hawaii

---

### Friday, April 18 — Claim Your Listing (Softer) 📣
**Status:** Needs asset + scheduling
**Pillar:** Claim Your Listing
**Format:** Single image — warm, inviting (practitioner at work or peaceful studio)

**Caption:**
```text
Every week, people come to Hawaiiwellness.net looking for someone like you.

They're searching by island, by modality, by what they need. And if your listing isn't there — or isn't complete — they might not find you.

Claiming your profile is free and takes about five minutes.

Link in bio → Claim Your Listing.
```
**Hashtags:** #hawaiiwellness #practitioners #hawaii #wellnesshawaii #holistichealth #bigisland #maui #claimyourlisting

---

## Status Table — Week of April 14

| Post | Status | Scheduled | Published |
|------|--------|-----------|-----------|
| Monday — Mālama cultural | 📋 needs asset | ⬜ | ⬜ |
| Tuesday — Big Island spotlight | 📋 needs practitioner selection | ⬜ | ⬜ |
| Wednesday — Naturopath carousel | 📋 needs carousel assets | ⬜ | ⬜ |
| Thursday — Maui wellness guide | 📋 needs practitioner selection | ⬜ | ⬜ |
| Friday — Claim your listing | 📋 needs asset | ⬜ | ⬜ |

---

*This brief reflects the current and upcoming week. Update status as assets are created and posts are scheduled. Marcus must approve before any post goes live.*
