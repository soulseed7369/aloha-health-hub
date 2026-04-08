# Guides Feature — Session Handoff
**Date:** 2026-04-07  
**Branch:** `feature/guides-hub-and-modalities-pillar`  
**Last commit:** `6f1da94` — feat(guides): editorial guides hub + wellness modalities pillar  
**Status:** Branch pushed to GitHub. Vercel preview deploy should be live.

---

## What Was Built (Shipped in This Session)

### Phase 1 — Guide Infrastructure
| File | What it does |
|------|-------------|
| `src/lib/guides.ts` | Typed `GuideEntry` registry, `MODALITY_GUIDE_ANCHORS` map (modality label → anchor ID), `getModalityGuideUrl()` helper |
| `src/components/GuideCTA.tsx` | Shared `mid` / `end` variant CTA component used inside guide pages |
| `src/views/guides/GuidesHub.tsx` | Editorial hub page at `/guides` — Pololū Valley hero, dept intro, featured volume card, "Also in the Library" list, Resend email capture (TODO: wire), closing CTA |
| `src/views/guides/WellnessModalities.tsx` | Full pillar page at `/guides/wellness-modalities-hawaii` — 9 categories, 44+ modalities, TOC, FAQ accordion, by-island section, JSON-LD (Article + FAQPage + BreadcrumbList) |

### Phase 2 — Surfacing the Guide
| File | Change |
|------|--------|
| `src/App.tsx` | Added lazy routes for `/guides` and `/guides/wellness-modalities-hawaii` |
| `src/components/layout/Header.tsx` | Added "Guides" nav link |
| `src/views/Directory.tsx` | Contextual banner when active modality filter maps to a guide anchor |
| `src/views/IslandHome.tsx` | Promo link below Browse by Modality grid |
| `public/sitemap.xml` | Added both guide URLs |

### Assets Committed
| File | Notes |
|------|-------|
| `public/complete-health-modalities-guide.jpg` | Pololū Valley aerial — used as GuidesHub hero + upcoming guide cover placeholders |
| `public/complete-health-modalities-guide2.jpg` | Portrait source Marcus provided |
| `public/complete-health-modalities-guide2-titled.jpg` | Titled cover rendered with DejaVu Serif (fixes ʻokina tofu bug from Liberation Serif) — used on GuidesHub featured volume |
| `public/og-wellness-modalities.jpg` | 1200×630 social card |

---

## Open Tasks (Next Session Priority Order)

### 1. WellnessModalities.tsx — Magazine Redesign (HIGH — Marcus explicitly requested)
**Problem:** Page feels like a text dump. Long paragraphs of inline sub-modality descriptions, no visual rhythm, no pull quotes, no art breaks.

**Marcus's direction:** "More like a magazine." Use ui-ux-pro-max skill.

**Specific issues to fix:**
- Sub-modality names in Massage and Psychotherapy descriptions are markdown bold (`**Rolfing**`, `**EMDR**`, etc.) — currently stripped with `.replace()`. Need to render them as visual breaks, not inline text.
- Modality cards (`rounded-2xl border border-border bg-card p-6`) feel generic — need editorial treatment.
- No pull quotes / callout boxes between sections.
- TOC is functional but not beautiful.
- Hero text "Updated April 2026" etc. is fine but hero section can be more editorial.
- The "By Island" and FAQ sections are solid, just need visual polish.

**Recommended approach:**
- Split each long modality description (e.g., Massage) into a **lead paragraph** + **sub-modality cards** rendered as distinct entries with their own name, description, and directory link.
- Add **pull quotes** or **callout boxes** for key insights between categories.
- Use the existing terracotta/sage/cream palette but more deliberately — section dividers, color-accented category headers, reading column constraints.
- The `CATEGORIES` data structure already supports this — just needs better rendering.

**Data structure note:** `modalities[].description` contains markdown bold for sub-modalities. Either parse `**...**` to `<strong>` or — better — refactor the data to give Massage and Psychotherapy their own `subModalities: []` array so the component can render them separately.

### 2. Hero Image — Convert to WebP (MEDIUM — quick task)
**Task:** Convert `public/complete-health-modalities-guide.jpg` → `public/complete-health-modalities-guide.webp` and update `GuidesHub.tsx` + `WellnessModalities.tsx` to use it.

**Current usage in code:**
```
GuidesHub.tsx:153 — backgroundImage: "url('/complete-health-modalities-guide.jpg')"
WellnessModalities.tsx:564 — src={guide.coverImage}  (guides.ts line 66,83)
```

**Note:** WellnessModalities uses the plain (untitled) image since it has its own H1. That's correct. Use `<picture>` with WebP source + jpg fallback for browser safety, or just serve WebP (Vercel auto-converts but local dev won't).

**Command to run:**
```bash
python3 -c "
from PIL import Image
im = Image.open('public/complete-health-modalities-guide.jpg')
im.save('public/complete-health-modalities-guide.webp', 'WEBP', quality=85)
print(im.size)
"
```

**guides.ts** needs coverImage updated for upcoming guides too:
```ts
coverImage: "/complete-health-modalities-guide.webp",  // lines 66, 83
```

### 3. Email Capture — Resend Integration (HIGH — Marcus confirmed Resend)
**Provider:** Resend (`resend.com`)

**What to build:**
- Supabase Edge Function: `supabase/functions/subscribe-guide/index.ts`
  - POST `{ email: string }`
  - Validate email
  - Add contact to Resend audience (Resend API: `POST /audiences/{id}/contacts`)
  - Return `{ success: true }` or error
- Wire the form in `GuidesHub.tsx` (currently has `// TODO: wire to newsletter provider` comment, `onSubmit` does nothing)
- Add loading/success/error states to the subscribe form UI

**Resend setup needed from Marcus:**
- Resend API key → add to Supabase secrets as `RESEND_API_KEY`
- Resend Audience ID for the guides list → add as `RESEND_AUDIENCE_ID`

**Security note:** See `supabase/CLAUDE.md` — edge functions use `supabaseAdmin` (service role). Don't expose Resend key to browser. Rate-limit the endpoint (check if existing checkout session function has a rate-limit pattern to copy).

**Relevant file to read first:** `supabase/functions/create-checkout-session/index.ts` — follow same structure for CORS, Supabase init, error handling.

### 4. PDF Download (Marcus asked "should we?")
**Recommendation: Yes.** High-value lead magnet. Users save and share PDFs; it extends reach beyond the site. Best practice for pillar content.

**Approach options:**
- **Option A — Static generated PDF** (recommended): Run a Python script (WeasyPrint or reportlab) to produce a polished `complete-guide-wellness-modalities-hawaii.pdf`, commit to `public/`, link from WellnessModalities page as a download button. Marcus confirmed pdf skill is available. One-time generation, easy to update.
- **Option B — Dynamic server-side render**: Edge function that puppeteers the guide page and returns PDF. More complex, overkill for v1.

**Go with Option A.** Use the `pdf` skill in Cowork. The guide content is all in `WellnessModalities.tsx`'s `CATEGORIES` data array — extract that to a standalone Python render script.

**PDF design brief:** Branded cover page (Pololū Valley photo + HW logo + title), editorial typography (Playfair Display), terracotta headings, cream background sections, QR code on back cover linking to directory. Print-friendly (no dark backgrounds on body pages).

**Skill to invoke:** `pdf` (available in available_skills)

### 5. Resend Confirmation Page
**Route:** `/guides/subscribed`  
**Content:** Simple branded thank-you page — "You're on the list." + link back to the guide + link to directory.  
**Priority:** Low — build after email capture is wired.

### 6. Vercel Preview QA
On the branch `feature/guides-hub-and-modalities-pillar`:
- [ ] `/guides` — hub renders, hero image loads, featured volume displays, "Also in the Library" shows 2 items
- [ ] `/guides/wellness-modalities-hawaii` — pillar renders, TOC works, anchor links resolve, FAQ accordion opens/closes, JSON-LD present in `<head>`
- [ ] Directory with modality filter active → banner appears with correct guide URL
- [ ] IslandHome (any island) → promo link appears below modality chips
- [ ] Mobile responsive check on both guide pages

---

## Key Constraints / Gotchas

### CLAUDE.md danger zones relevant to this work:
- **`supabaseAdmin` is null in the browser** — Resend edge function must run server-side
- **Supabase import is `@/lib/supabase`** not `@/integrations/supabase/client`
- **Build script:** `npm run build` fails in sandbox (runs `bash scripts/build-hybrid.sh` which tries to `rm` read-only files). Use `npx vite build --outDir /tmp/vite-out` instead.
- **Git lock file:** `.git/index.lock` can't be deleted via `rm` on the FUSE mount. Use `mv .git/index.lock .git/index.lock.stale-N` before every git command that needs it.

### Design system:
```
--primary: hsl(15, 65%, 52%)  → #d36b3a terracotta
--sage: hsl(143, 25%, 45%)    → #5a9070
--background: hsl(35, 30%, 97%) → warm cream #faf6ee
Fonts: Playfair Display (display) / Source Sans 3 (body)
```

### ʻOkina rendering:
- **Liberation Serif Bold Italic** renders U+02BB as tofu square — DO NOT USE for image text
- **DejaVu Serif Bold Italic** renders ʻokina correctly ✅
- Python PIL cover render script is at `/sessions/adoring-laughing-bohr/cover_render2.py`

### guides.ts is the source of truth:
All guide metadata (titles, slugs, og:images, cover images, stats, teaser copy) lives in `src/lib/guides.ts`. If you rename an image, update it there.

---

## Files to Read at Session Start

1. `src/views/guides/WellnessModalities.tsx` — the file being redesigned (714 lines)
2. `src/views/guides/GuidesHub.tsx` — hub page (340 lines, editorial design approved by Marcus)
3. `src/lib/guides.ts` — registry (159 lines)
4. `supabase/functions/create-checkout-session/index.ts` — pattern for Resend edge function
5. `supabase/CLAUDE.md` — security rules for edge functions

---

## Marcus's Design Preferences (captured this session)

- **No running-series framing** — no "Vol. 01", "Published Quarterly", "In This Issue", hard publication dates
- **Editorial magazine aesthetic** — inspired by Hana Hou (Hawaiian Airlines magazine): typographic, beautiful photography, generous whitespace, serif display, story-led
- **Title:** "Hawaiʻi Wellness Guides" — simple, descriptive, no clever branding
- **Hub tagline:** "A field journal of holistic healing across the islands."
- **Hub dept headline:** "From traditional Hawaiian healing to modern somatic practice, our guides are a living reference to what it means to care for the body, mind, and spirit in Hawaiʻi."
- **Photography:** Pololū Valley, Big Island (not Kauaʻi — he corrected this)
- **Hero images:** Plain (no title text overlay) when page has its own H1
- **Cover image on hub featured volume:** Titled version (`guide2-titled.jpg`) with rendered text — DejaVu Serif font required for ʻokina
- **Coming soon items:** "In Progress" label only, no dates
- **Upcoming guides section:** "Also in the Library" — not "In the Next Volumes"

---

## Questions Still Pending from Marcus

None — he answered all open questions:
- Newsletter provider: **Resend** ✅
- Guide redesign: **Yes, magazine treatment, ui-ux-pro-max** ✅
- PDF: He asked "should we?" — **Recommend yes, Option A (static generated)**

---

## Commit to Merge to Main

When the branch is QA'd on Vercel, merge `feature/guides-hub-and-modalities-pillar` → `main`.  
Marcus must confirm before any `git push` to main.
