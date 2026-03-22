# Verified Client Testimonials — Build Plan

## Overview

Add a verified testimonial system where practitioners invite real clients to write testimonials via a unique email link. Clients write their own words (guided by prompts). Practitioners can respond but cannot edit or delete. AI extracts a highlight sentence for the profile detail page, with click-through to the full testimonial.

The existing unverified/self-managed testimonials system has been removed from the dashboard nav. This verified system is the **only** testimonial experience going forward.

---

## Data Model

### New table: `verified_testimonials`

```sql
CREATE TABLE verified_testimonials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id     uuid NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  -- Invite fields
  invite_token        uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_email_hash  text NOT NULL,           -- SHA-256 of lowercase email, for dedup
  invite_status       text NOT NULL DEFAULT 'pending'
                      CHECK (invite_status IN ('pending','submitted','published','flagged','expired')),
  invited_at          timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  -- Client-written content
  client_display_name text,                    -- chosen by client: first name, or first + last initial
  client_island       text,                    -- optional: which island they're on
  prompt_what_brought text,                    -- "What brought you to this practitioner?"
  prompt_sessions     text,                    -- "Roughly how many sessions have you had?"
  prompt_what_changed text,                    -- "What changed for you?"
  full_text           text,                    -- combined narrative (stitched from prompts or free-form)
  -- AI-generated
  highlight           text,                    -- 1-2 sentence "most helpful part", generated on submission
  -- Practitioner response
  practitioner_response text,                  -- optional "Thank you" reply
  responded_at        timestamptz,
  -- Metadata
  submitted_at        timestamptz,
  published_at        timestamptz,
  flagged_at          timestamptz,
  flag_reason         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_verified_testimonials_practitioner
  ON verified_testimonials(practitioner_id, invite_status);
CREATE UNIQUE INDEX idx_verified_testimonials_token
  ON verified_testimonials(invite_token);
CREATE INDEX idx_verified_testimonials_email_hash
  ON verified_testimonials(invited_email_hash);
```

### Constraints (enforced in Edge Function, not DB)

- Same email can only be invited once per practitioner (unique on `practitioner_id` + `invited_email_hash`)
- Same email can submit testimonials for max 5 different practitioners per month (prevents bulk gaming)
- Invite expires after 14 days (`expires_at`)
- Practitioner must be Premium or Featured tier to send invites

### RLS Policies

```sql
-- Public: anyone can read published testimonials
CREATE POLICY "Published testimonials are public"
  ON verified_testimonials FOR SELECT
  USING (invite_status = 'published');

-- Client: can update their own testimonial via invite_token (handled by Edge Function, not direct DB access)

-- Practitioner: can read all their own testimonials (any status) and add response
CREATE POLICY "Practitioners read own testimonials"
  ON verified_testimonials FOR SELECT
  USING (practitioner_id IN (
    SELECT id FROM practitioners WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Practitioners can respond to testimonials"
  ON verified_testimonials FOR UPDATE
  USING (practitioner_id IN (
    SELECT id FROM practitioners WHERE owner_id = auth.uid()
  ))
  WITH CHECK (
    -- Can only update response fields, not client content
    -- (enforced in application layer, not SQL)
    true
  );
```

---

## Architecture

### Flow Diagram

```
Practitioner Dashboard          Edge Function              Client Browser
─────────────────────          ─────────────              ──────────────
1. "Invite client"     ──►  create-testimonial-invite
   (enter email)              │ Hash email
                              │ Check dedup (same practitioner? 3-practitioner limit?)
                              │ Insert row (status: pending)
                              │ Send email via Resend
                              ▼
                         Email arrives ──────────────►  2. Client clicks link
                                                           /testimonial/{invite_token}

                                                        3. Client sees guided form:
                                                           - Display name (first name default)
                                                           - Island (optional)
                                                           - "What brought you?" (textarea)
                                                           - "How many sessions?" (text)
                                                           - "What changed?" (textarea)
                                                           - Or: "Write freely" toggle

                                                        4. Client submits ──►  submit-testimonial
                                                                                │ Validate token
                                                                                │ Check not expired
                                                                                │ Stitch prompts → full_text
                                                                                │ Call AI for highlight
                                                                                │ Update row (status: submitted)
                                                                                │ Notify practitioner
                                                                                ▼
5. Practitioner sees
   new testimonial in dashboard
   - Can add response
   - Can flag (→ admin review)
   - CANNOT edit client text
   - CANNOT delete

6. Auto-publish after 24h
   (or immediately if practitioner
   has auto-publish enabled)
```

---

## Sprint Breakdown

### Sprint 1: Database + Invite Flow (3–4 days)

**Migration file:** `20260322000001_verified_testimonials.sql`
- [ ] Create `verified_testimonials` table with schema above
- [ ] Add RLS policies
- [ ] Add `testimonial_invite_quota` column to `user_profiles` (default 10/month for Premium, 20/month for Featured)

**Edge Function:** `supabase/functions/create-testimonial-invite/index.ts`
- [ ] Accept: `practitionerId`, `clientEmail`
- [ ] Require auth JWT, verify user owns the practitioner listing
- [ ] Verify practitioner is Premium or Featured tier
- [ ] Hash email (SHA-256 of lowercase trimmed)
- [ ] Check dedup: same email + same practitioner = reject
- [ ] Check global limit: same email hash across 3+ practitioners = reject
- [ ] Check monthly quota: count pending/submitted invites this month vs quota
- [ ] Insert row with `invite_status: 'pending'`
- [ ] Send invite email via Resend (see email template below)
- [ ] Return success

**Email template (Resend):**
```
Subject: [Practitioner Name] would love your feedback

Aloha [no name — we don't have it yet],

[Practitioner Name] on Hawaiʻi Wellness has invited you to share
your experience working with them.

Your testimonial helps other people on the islands find the right
practitioner for their wellness journey.

[Share Your Experience →]  (link to /testimonial/{invite_token})

This link expires in 14 days. Your response will be displayed on
their Hawaiʻi Wellness profile with only your first name and island.

With aloha,
Hawaiʻi Wellness
```

**Hook:** `src/hooks/useTestimonialInvites.ts`
- [ ] `useMyInvites(practitionerId)` — fetch all invites (pending, submitted, published) for dashboard
- [ ] `useSendInvite()` — mutation calling the Edge Function
- [ ] `useRespondToTestimonial()` — mutation to add practitioner response
- [ ] `useFlagTestimonial()` — mutation to flag for admin review

### Sprint 2: Client Submission Page (3–4 days)

**Public page:** `src/pages/TestimonialSubmit.tsx`
- Route: `/testimonial/:token` (no auth required)
- [ ] Fetch testimonial row by `invite_token` (new Edge Function or public RPC)
- [ ] Validate: not expired, status is 'pending'
- [ ] Show practitioner name + photo (fetched via practitioner_id)
- [ ] Form with write-freely first, guided prompts as alternative:
  - Default: single "Share your experience" textarea (max 500 words)
  - Toggle: "I'd prefer guided prompts" → shows three prompts:
    - "What brought you to [Name]?" (textarea, required, max 200 words)
    - "Roughly how many sessions have you had?" (short text or select: 1, 2–5, 6–10, 10+)
    - "What changed for you?" (textarea, required, max 300 words)
- [ ] Display name field: options for "First name only", "First name + last initial", or "Initials only"
- [ ] Island select (optional): Big Island, Maui, Oahu, Kauai
- [ ] Preview before submit: show how it will appear on the profile
- [ ] Consent checkbox: "I understand this will be displayed on [Name]'s public profile on Hawaiʻi Wellness"

**Edge Function:** `supabase/functions/submit-testimonial/index.ts`
- [ ] Accept: `invite_token`, `client_display_name`, `client_island`, prompt responses or free text
- [ ] No auth required (token is the auth)
- [ ] Validate token exists, status is 'pending', not expired
- [ ] Stitch prompt responses into `full_text`:
  ```
  "I came to [practitioner] because [what_brought]. After [sessions] sessions,
  [what_changed]."
  ```
  (Or use the free-form text directly)
- [ ] Generate AI highlight (see Sprint 3 — can stub with first sentence for now)
- [ ] Update row: set all client fields, `invite_status: 'submitted'`, `submitted_at: now()`
- [ ] Send notification email to practitioner: "You received a new testimonial from [display_name]!"
- [ ] Return success + show thank-you page

**Thank-you page:**
> Mahalo! Your testimonial has been submitted. [Practitioner Name] may add a short
> response, and it will appear on their profile within 24 hours.

### Sprint 3: AI Highlight Generation (1–2 days)

**Purpose:** Extract the 1–2 sentence "most helpful part" from the full testimonial to display as a teaser on the profile detail page.

**Implementation:** Call an AI model from the `submit-testimonial` Edge Function after stitching the full text.

**Edge Function addition** (inside `submit-testimonial`):
```typescript
// After stitching full_text:
const highlight = await generateHighlight(fullText, practitionerName);

async function generateHighlight(text: string, practitionerName: string): Promise<string> {
  // Use Anthropic API (Claude Haiku for speed + cost)
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Extract the single most impactful 1-2 sentence quote from this client testimonial about ${practitionerName}. Choose the part that would most help a potential new client decide to book. Return ONLY the extracted quote, nothing else. If the testimonial is very short (under 2 sentences), return it as-is.

Testimonial:
${text}`
      }]
    })
  });
  const data = await response.json();
  return data.content[0].text.trim();
}
```

**Env var needed:** `ANTHROPIC_API_KEY` in Supabase Edge Function secrets.

**Cost:** Haiku at ~$0.25/M input tokens + $1.25/M output. A 500-word testimonial ≈ 700 tokens in, ~50 tokens out. Cost per highlight: ~$0.0002. At 100 testimonials/month: $0.02/month. Negligible.

**Fallback:** If the API call fails, use the first sentence of `full_text` as the highlight.

### Sprint 4: Dashboard Management UI (2–3 days)

**Update:** `src/pages/dashboard/DashboardTestimonials.tsx`

Add a new tab/section: "Client Testimonials" (alongside existing self-managed ones).

**Invite flow UI:**
- [ ] "Invite a Client" button → opens dialog
  - Email input
  - Note: "We'll send them a link to share their experience. You can't edit their response."
  - Send button
  - Show remaining monthly quota: "3 of 5 invites remaining this month"
- [ ] Invite status list:
  - Pending invites (with "Resend" and "Cancel" options)
  - Submitted testimonials awaiting publish (with response option)
  - Published testimonials (with response option)

**Testimonial card in dashboard:**
- [ ] Client display name + island
- [ ] AI highlight (bold) + full text (expandable)
- [ ] Status badge: Pending / Submitted / Published / Flagged
- [ ] "Add Response" button → text input (max 200 chars)
- [ ] "Flag" button → reason select + submit to admin
- [ ] NO edit or delete buttons for client content

**Existing self-managed testimonials section stays as-is.** Label it "Your Testimonials" and label the new section "Client Testimonials (Verified)."

### Sprint 5: Public Display + Highlights (2–3 days)

**Update:** `src/pages/ProfileDetail.tsx` testimonials section

**New display hierarchy:**
1. **Verified client testimonials first** (from `verified_testimonials` table, status = 'published')
   - Each card shows:
     - AI highlight in slightly larger/emphasized text
     - "Read full testimonial →" expand link
     - Client display name · Island · Date
     - Small "Verified client" badge (checkmark icon + text)
     - Practitioner response (if any), indented below
2. **Self-managed testimonials below** (from `practitioner_testimonials` table, unchanged)
   - No "Verified" badge
   - Display as they do today

**Profile detail page highlight teaser:**
- In the main "About" tab, show up to 2 verified testimonial highlights as a compact preview:
  ```
  ┌─────────────────────────────────────────────────┐
  │ "After 6 sessions, the chronic migraines I'd    │
  │  had for 3 years went from weekly to maybe      │
  │  once a month."                                 │
  │                          — Kailani · Maui       │
  │                    ✓ Verified client             │
  │                                                 │
  │  [Read all 4 client testimonials →]             │
  └─────────────────────────────────────────────────┘
  ```
- This sits in the About section (above the fold), not buried in a Testimonials tab
- Clicking "Read all" scrolls to / switches to the Testimonials tab

**Hook:** `src/hooks/useVerifiedTestimonials.ts`
- [ ] `useVerifiedTestimonials(practitionerId)` — fetch published verified testimonials
- [ ] Returns testimonials with `highlight` field for teaser display

**Center support:**
- Same system works for centers (the table has `practitioner_id` but we could either rename to `listing_id` + `listing_type`, or create a parallel `verified_center_testimonials` table for consistency with existing pattern)
- **Recommendation:** Add a `listing_type` column ('practitioner' | 'center') and rename `practitioner_id` to `listing_id`. Single table, less duplication.

### Sprint 6: Admin Moderation (1 day)

**Update:** `AdminPanel.tsx` (or new admin tab)

- [ ] View all flagged testimonials
- [ ] View all testimonials with suspicious patterns:
  - Same IP for multiple testimonials on one practitioner
  - All invites submitted within same 24-hour window
  - Display name patterns (e.g., "A. B.", "C. D." — suspiciously generic)
- [ ] Admin actions: Publish / Unpublish / Delete
- [ ] Note: this is lightweight moderation, not a full fraud system. At your scale, eyeballing flagged items is sufficient.

---

## Tier Gating

| Feature | Free | Premium | Featured |
|---------|------|---------|----------|
| Receive verified testimonials | ❌ | ✅ | ✅ |
| Monthly invite quota | — | 10/month | 20/month |
| AI highlight generation | — | ✅ | ✅ |
| Practitioner response | — | ✅ | ✅ |
| Testimonial highlights in About section | — | ❌ (in tab only) | ✅ (About section teaser) |
| Self-managed testimonials (existing) | ❌ | ✅ | ✅ |

The About-section teaser for Featured only is a nice differentiator — Featured practitioners get their best testimonials right at the top of the page, while Premium ones have them in a tab.

---

## Migration Strategy

1. **No changes to existing `practitioner_testimonials` table.** The self-managed system stays as-is.
2. **New `verified_testimonials` table lives alongside it.** Two separate data sources, two separate display sections.
3. **ProfileDetail merges both** in the Testimonials tab, with verified ones on top.
4. **Future option:** Once verified testimonials have traction, you could sunset the self-managed system and only show verified ones. But that's a post-launch decision based on adoption data.

---

## Effort Summary

| Sprint | Description | Days | Dependencies |
|--------|------------|------|-------------|
| 1 | Database + invite Edge Function + email | 3–4 | Resend account |
| 2 | Client submission page + Edge Function | 3–4 | Sprint 1 |
| 3 | AI highlight generation | 1–2 | Anthropic API key |
| 4 | Dashboard management UI | 2–3 | Sprint 1 |
| 5 | Public display + highlights | 2–3 | Sprints 2, 3 |
| 6 | Admin moderation | 1 | Sprint 5 |
| **Total** | | **12–17 days** | |

Sprints 1+4 can be parallelized (dashboard UI can be built with mock data while Edge Functions are developed). Sprints 2+3 can also overlap. Realistic calendar time: **2–3 weeks**.

---

## Open Questions

1. **Auto-publish timing:** 24 hours after submission (gives practitioner time to respond first), or immediately? Immediate is simpler; delay lets practitioner add context.
2. **Resend invite:** Should practitioners be able to resend to the same email if the client hasn't responded? Recommend yes, once, after 7 days.
3. **Testimonial ordering on profile:** By date (newest first)? Or by "most helpful" (which would need a second AI pass or manual practitioner reordering)?
4. **Do you want the About-section teaser to be Featured-only, or Premium too?** Featured-only creates a stronger upgrade differentiator.
