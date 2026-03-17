# "Grow Your Practice Online" — Website Sales Campaign
### Hawaii Wellness LLC · Launch Week: March 16, 2026

---

## Campaign Overview

**Product:** Done-for-you websites for Hawaii wellness practitioners and centers
**Offer positioning:** "Your Hawaii Wellness listing is live — let's build the full website to match."
**Target:** All practitioners and centers in the Hawaii Wellness database with an email on file
**Goal:** 5–10 paying clients within 30 days
**Primary channels:** Email → Phone/SMS → Dashboard message

---

## Why This Works (Your Built-In Advantage)

You're not a cold caller. You have three things most website sellers don't:

1. **A warm relationship** — every prospect is already listed on your platform. You know their name, modality, island, and whether they have a website or not.
2. **Built-in urgency** — providers without a website_url have a visible gap. Providers with a dated site have a benchmark to compare against.
3. **Bundled credibility** — "The people who run the directory you're already listed on built this site" is a far stronger pitch than any cold agency.

---

## Prospect Segmentation (DB-Driven)

Run these queries against the `practitioners` and `centers` tables to build your outreach lists.

### Tier 1 — Hottest Leads: No Website + Claimed Listing
```sql
SELECT id, name, email, phone, island, city, modalities, tier
FROM practitioners
WHERE status = 'published'
  AND email IS NOT NULL
  AND (website_url IS NULL OR website_url = '')
  AND owner_id IS NOT NULL
ORDER BY tier DESC, created_at ASC;

-- Repeat for centers table
```
**Why:** They're active, paying or engaged with the platform, and have a proven gap. The value prop writes itself.

### Tier 2 — Strong Leads: Has Website, Premium or Featured Tier
```sql
SELECT id, name, email, phone, island, website_url, tier
FROM practitioners
WHERE status = 'published'
  AND email IS NOT NULL
  AND website_url IS NOT NULL
  AND tier IN ('premium', 'featured')
  AND owner_id IS NOT NULL
ORDER BY tier DESC;
```
**Why:** Already investing in their online presence. A better website = protect and grow their investment.

### Tier 3 — Broad List: All Published Providers With Email
```sql
SELECT id, name, email, phone, island, city, modalities, tier, website_url
FROM practitioners
WHERE status = 'published'
  AND email IS NOT NULL
ORDER BY tier DESC, island, name;
```
**Why:** Everyone is a potential client. Tier 1 and 2 get personalized outreach; Tier 3 gets a slightly more templated version.

---

## The Offer

### Recommended Pricing Structure

| Package | Price | What's Included |
|---------|-------|-----------------|
| **Starter Site** | $997 one-time + $49/mo | 5-page site, mobile-optimized, contact form, basic SEO, 1 round of revisions |
| **Practice Pro** | $1,497 one-time + $79/mo | Everything above + booking integration, testimonials, blog, 2 revision rounds |
| **Featured Bundle** | $1,997 one-time + $99/mo | Practice Pro + Google Business setup, local SEO, social link alignment |

> **Early bird offer for launch week:** First 10 clients get $200 off any package. Creates urgency and helps you hit your 5–10 goal.

### The Anchor Message (use this in all outreach)
> "You're already in front of thousands of people searching for wellness on Hawaii Wellness. A matching website turns that visibility into clients — we build it for you, completely done."

---

## Outreach Sequence

Each prospect gets a 3-touch sequence over ~10 days. Stop the sequence the moment they respond.

---

### Touch 1 — Email (Send Day 1, Week of March 16)

**Subject line options (A/B test these):**
- `Your [Kona / Maui / etc.] practice + a real website`
- `Quick question about your Hawaii Wellness listing`
- `[First name], we build websites for practitioners like you`

**Email body (Tier 1 — no website):**

> Hi [First name],
>
> I run Hawaii Wellness — the directory where your [modality] practice is listed.
>
> I noticed you don't have a website yet. That's actually the most common thing I hear from practitioners: "I know I need one, I just haven't gotten around to it."
>
> We now build done-for-you websites specifically for Hawaii wellness providers — designed to match your listing, optimized for local search, and up and running in 2 weeks.
>
> Would a 15-minute call this week make sense? I'd love to show you a few examples from other [island] practitioners.
>
> Aloha,
> Marcus
> Hawaii Wellness / hawaiiwellness.net

**For Tier 2 (has a website):**

> Hi [First name],
>
> I run Hawaii Wellness — you're one of our [premium / featured] providers on the platform.
>
> I've been looking at how our top-listed practitioners are presenting online, and there's a real opportunity for providers like you to go further. A lot of wellness sites in Hawaii are outdated, slow, or not built for local search — which means you're leaving clients on the table even when people find your listing.
>
> We now offer done-for-you websites for practitioners already on the platform. Since we know your practice, island, and modalities, we can turn a site around in under 2 weeks.
>
> Worth a quick call this week?
>
> Aloha,
> Marcus

**Practical tips:**
- Send from a real inbox (aloha@hawaiiwellness.net), not a marketing tool, for the first wave
- Personalize the island and modality in every email — it takes 10 seconds and dramatically improves response rate
- Batch by island: send Big Island emails together, Maui together, etc.
- Aim for 20–30 emails per day to keep it manageable and personal

---

### Touch 2 — Phone or SMS (Day 4–5 after email)

Only call/text if they haven't responded to the email.

**SMS template (highest response rate for this audience):**

> Hi [First name], this is Marcus from Hawaii Wellness. Sent you an email about building a website for your practice — just wanted to make sure it didn't get buried! Happy to chat for 15 min this week if you're curious. Reply anytime 🤙

**Phone script:**

> "Hi [First name], this is Marcus from Hawaii Wellness — the directory your practice is listed on. I sent you a short email a few days ago about a website offer we're doing for providers on the platform. Did you happen to see it? ... [If yes: great, happy to walk you through it.] [If no: totally fine, I'll keep it short — basically we build done-for-you websites for practitioners like yourself, and since you're already on our directory we can move really fast. Would 15 minutes this week work?]"

**Notes:**
- Keep it under 90 seconds if they're not engaged
- Have a Calendly link ready to text them if they say yes
- Best call times: Tuesday–Thursday, 10am–12pm or 2–4pm Hawaii time

---

### Touch 3 — Dashboard Notification (Day 8–10)

For providers who have logged in and have `owner_id` set, add an in-app notification or banner in their dashboard.

**Notification copy:**

> 🌺 **New for Hawaii Wellness providers** — We now build done-for-you websites for practitioners on our platform. First 10 spots available at a launch discount. [Learn more →]

**Implementation options (in order of ease):**
1. Add a dismissable banner to `DashboardHome.tsx` for providers without a `website_url` — links to a simple landing page or Calendly
2. Add a banner for ALL dashboard users (premium/featured) with a different message about upgrading their online presence
3. If you want to be more targeted, query `owner_id IS NOT NULL AND website_url IS NULL` in the DashboardHome component and show the banner conditionally

---

## Landing Page / Social Proof (Build This Week)

You need one destination to send people to. Keep it simple — this can be a single page.

**URL suggestion:** hawaiiwellness.net/websites

**Page must-haves:**
- 3 example websites (build 1 real one first, or use mockups)
- Pricing table (Starter, Practice Pro, Featured Bundle)
- 2–3 testimonials or "as seen in" if available
- Clear CTA: "Book a free 15-min call" → Calendly link
- FAQ: How long does it take? Do I own it? What do I need to provide?

**Quick win:** If you don't have time to build the landing page before outreach starts, just link to your Calendly and add a sentence in the email: "I can share a few examples on the call."

---

## Content Calendar — 4 Weeks

| Week | Activity | Channel | Notes |
|------|----------|---------|-------|
| **Mar 16–20** | Pull and segment DB lists. Send Tier 1 emails (no website, claimed). | Email | 20–30/day, personalized by island |
| **Mar 16–20** | Post on Instagram: "We now build websites for Hawaii wellness providers. DM us." | Social | One post, simple. Link in bio to landing page or Calendly |
| **Mar 16–20** | Add dashboard banner for no-website providers | Dashboard | Target `website_url IS NULL AND owner_id IS NOT NULL` |
| **Mar 17–19** | Send Tier 2 emails (premium/featured, has website) | Email | Upgrade angle |
| **Mar 20–21** | Phone/SMS follow-up on Tier 1 non-responders | Phone/SMS | 10–15 calls/day is manageable |
| **Mar 23–27** | Send Tier 3 emails (broad list) | Email | Slightly more templated, still island-personalized |
| **Mar 23–27** | Follow up via SMS on Tier 2 non-responders | SMS | Lighter touch |
| **Mar 23–27** | Conduct discovery/sales calls with anyone who responded Week 1 | Calls | Close first 3–5 clients |
| **Mar 30–Apr 3** | Referral ask: email anyone who booked a call (converted or not) | Email | "Know anyone who could use this?" |
| **Mar 30–Apr 3** | Post a "client spotlight" if first site is live | Instagram/Email | Social proof flywheel begins |

---

## Leveraging the Database for Ongoing Marketing

Beyond this launch, the DB is a recurring marketing asset.

### Signals to watch for
- **New providers who join without a website** → auto-trigger an onboarding email 3 days after listing goes live
- **Free-tier providers who have been listed > 30 days with no upgrade** → upsell sequence
- **Providers with social_links but no website** → they're active online, just need a hub

### Data points that make outreach smarter
- `modalities[]` → reference their specific practice in the email ("your Reiki practice")
- `island` → reference their island ("other Big Island practitioners we've built for")
- `tier` → tailor the pitch (free gets "you're missing out," featured gets "protect your investment")
- `city` → hyperlocal angle ("practitioners in Kailua-Kona are starting to compete online")
- `accepts_new_clients` → if true, emphasize that a website helps them fill those spots faster

### Automate this eventually
Once you have 5–10 clients and a repeatable offer, add a `website_built` boolean or similar field to your DB so you can track which providers have been converted and suppress them from future outreach.

---

## Success Metrics (30-Day Scorecard)

| Metric | Target | How to Track |
|--------|--------|-------------|
| Emails sent | 150–300 | Email client or spreadsheet |
| Email reply rate | 10–20% | 15–30 replies |
| Calls booked | 15–25 | Calendly |
| Calls completed | 10–20 | Manual log |
| Proposals sent | 8–15 | Manual log |
| Clients closed | 5–10 | ✅ Primary goal |
| Revenue | $5k–$15k | Based on package mix |

---

## Quick-Start Checklist (This Week)

- [ ] Run Tier 1 DB query, export to CSV with name / email / phone / island / modality
- [ ] Write and personalize first 20–30 emails (start with Big Island or your strongest island)
- [ ] Set up Calendly with 15-min "Website Consultation" slots
- [ ] Build or sketch the landing page (hawaiiwellness.net/websites)
- [ ] Add dashboard banner to DashboardHome.tsx for no-website providers
- [ ] Draft 3 SMS templates (Tier 1 follow-up, Tier 2 follow-up, general)
- [ ] Start outreach Monday March 16

---

*Plan prepared: March 13, 2026 · Hawaii Wellness LLC*
