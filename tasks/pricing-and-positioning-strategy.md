# Pricing & Positioning Strategy
_Aloha Health Hub — March 2026_

---

## The Core Strategy — Assessment

Your instinct is right, and it's coherent. Here's the underlying logic stated plainly:

**Premium subscription solves three different problems for three different audiences.** The upgrade path and the pitch change by segment, but the product is the same. That's efficient.

**Website bundles are a separate revenue stream** — not a competing product. The key to making the dual strategy work is ensuring these two never feel like the same thing to the same customer. They shouldn't, because they aren't: a Premium profile lives on your domain and earns its value from directory SEO and community trust; a website bundle gives the practitioner their own corner of the internet. Different jobs.

The strategy holds. The execution details are what need to be right.

---

## The Three-Market Map

### Market 1: Practitioners With a Website
**Their mindset:** "I've already invested in a website. I need more clients, not a new online presence."

**What Premium does for them:**
The directory is a marketing channel, not a replacement for their site. The pitch is discovery + complementary conversion:

- Directory pages rank in Google for local wellness searches their site probably doesn't own ("acupuncture Kailua-Kona," "massage therapist Paia")
- Booking CTA on their Premium profile sends traffic *to their existing site*, not away from it
- Testimonials on their profile appear in search results and social proof before visitors even reach their site
- Class schedules and offerings make them visible to people browsing the directory for a specific modality

**The message:**
> "Your website converts. Hawaii Wellness finds."

Two sentences. Two jobs. No competition.

**What NOT to say to this audience:** Anything that implies their website is insufficient. They've invested in it. The play is additive, not replacement.

---

### Market 2: Practitioners Without a Website
**Their mindset:** "I know I need something online, but I've been putting it off for months. It's expensive, it takes time, and I don't know where to start."

**What Premium does for them:**
Their Premium profile genuinely IS a professional online presence. With the expanded feature set — long bio, offerings with descriptions, class schedules, testimonials, social links, booking CTA — the profile page handles everything a typical wellness practitioner website would. And they get it for $49/mo instead of a $1,500–$3,000 build plus $50–$100/mo in hosting.

The proof points that land for this audience:
- Shareable profile URL they can put in their Instagram bio, email signature, and on business cards
- Mobile-optimized — the way most people will view it
- Google-indexed — people searching their name or modality + city will find the profile
- Takes an afternoon to fill out, not a month to build

**The message:**
> "Your Premium profile is your website — shareable, bookable, and found on Google. For the price of a monthly gym membership."

**The comparison that closes:** Frame against the alternative they're *actually* considering. Not "upgrading from free" but "avoiding a $1,500 website build and ongoing hosting." That reframe turns $49/mo from a small upgrade fee into a major savings.

---

### Market 3: Practitioners Who Want Their Own Website
**Their mindset:** "I want my own domain, my own brand, and my own site — but I don't want to build it myself."

**What the Website Bundle does for them:**
Done-for-you. Their own domain. Fully branded. Professional. Plus — critically — they're still on the directory, which is where their new clients will actually find them.

**The message:**
> "Your website + your directory listing, all done for you. Live in two weeks."

**What makes the bundle feel worth it vs. just hiring any web developer:** Speed (two weeks), insider knowledge (the people building the directory know what converts for wellness clients), and the fact that the site and the listing are built to work together.

---

## Pricing Recommendations

### The Double-Charging Problem

The original website package structure — one-time fee PLUS a separate monthly subscription on top — reads as double-charging to practitioners. Even if technically justified, it creates friction at the pricing page. Practitioners see two bills, not one product.

**The fix:** Bundle the subscription into the website package. The practitioner pays one upfront price and gets their website plus a year of Premium. After year one, they stay on Premium at $49/mo.

This structure:
- Eliminates the "why am I paying twice?" objection
- Creates a natural anchor: "This includes $588 in directory subscription — a $997 site for $997 total"
- Builds 12-month retention before the first renewal decision
- Is easier to explain in one sentence

### Recommended Price Points

| Package | Price | What's Included | Included Subscription |
|---------|-------|-----------------|----------------------|
| **Essentials** | $597 one-time | 3–4 pages, mobile-ready, contact form, link to directory profile | 6 months Premium (~$294 value) |
| **Standard** | $997 one-time | 5 pages, booking integration, Google Business setup | 12 months Premium (~$588 value) |
| **Pro** | $1,497 one-time | Full site + SEO setup, blog, social link alignment, 2 revision rounds | 12 months Premium (~$588 value) |

These fit your $400–$1,800 target range with appropriate padding:
- $597 is the entry point — accessible but not commodity pricing
- $997 is the flagship. Most prospects should end up here.
- $1,497 is the full-service option for practitioners who want the works

**Why not go lower ($400–$500)?** At that price point, the work doesn't pay for your time unless it's extremely templated, and practitioners perceive it as low-quality. $597 is the floor for professional credibility.

### The Subscription Tiers — No Change Needed

The $49/mo Premium and $149/mo Featured pricing for practitioners is well-positioned. Centers at $79/$199 is justified by the higher complexity and larger business size. No adjustment recommended here.

The main opportunity is *framing*, not *pricing*. The same features priced at $49/mo feel like a modest upgrade from "free listing." Those same features framed as "your complete online presence for less than a gym membership" feel like a no-brainer.

---

## Feature Recommendations for Premium as Website Replacement

For the "Premium is your website" pitch to hold, the profile has to feel like a real destination — not a listing with extra fields. A few additions that would strengthen this significantly:

**Already planned (from sprint backlog):**
- Long-form bio (strong — this is table stakes for website parity)
- Offerings with descriptions and pricing
- Class schedules
- Testimonials
- Social links + booking CTA

**High-value additions to consider:**

1. **Vanity/clean profile URL** — The profile should live at a clean URL (`hawaiiwellness.net/dr-jane-kona` or similar, not `/practitioners/uuid`). This is what goes on a business card. Without it, the "this is your website" pitch is harder to sell.

2. **Contact/inquiry form** — Premium profiles should have a "Send a message" form, not just a displayed phone/email. This is standard on any real website and prevents spam harvesting.

3. **"Share this profile" marketing angle** — Explicitly tell practitioners in the dashboard and in marketing materials: "Add this link to your Instagram bio, email signature, and business cards." Position the URL, don't just provide it.

4. **Profile completeness score** — Already in the backlog (`profile_completeness` column). Surface this in the dashboard with explicit callout: "Your profile is 60% complete — a complete profile gets 3x more views." Drives engagement and fills out the profile to website-quality.

---

## The Marketing Positioning Framework

### For Website-Owner Practitioners (Market 1)

**Primary channels:** Email outreach (you have their address), dashboard banner, upgrade prompt in profile editor

**Messaging hierarchy:**
1. The problem: You have a great website, but clients are searching on directories, not just Google
2. The solution: Premium puts you in front of those searches with a booking CTA that sends them to your existing site
3. The proof: Other [island] practitioners in your modality are already getting inquiries this way
4. The CTA: "Upgrade and be visible where your future clients are already searching"

**What to avoid:** Any implication their current website isn't good enough. This is additive.

---

### For No-Website Practitioners (Market 2)

**Primary channels:** Email outreach (segment by `website_url IS NULL`), onboarding flow for new sign-ups, dashboard banner

**Messaging hierarchy:**
1. The reframe: Don't ask them to "upgrade their listing." Ask them: what's your plan for getting found online?
2. The comparison: $49/mo vs. $1,500 to build a website + $50–$100/mo hosting + maintenance headaches
3. The features: Here's what your Premium profile includes (bio, offerings, schedules, testimonials, booking CTA — walk through each)
4. The use cases: Instagram bio link, business cards, email signature, Google search result for your name
5. The CTA: "Turn your listing into your online presence"

**The single most important message for this segment:** Make the profile URL the hero. If they can copy one link and put it everywhere, the mental model clicks.

---

### For Website Bundle Prospects (Market 3)

**Primary channels:** Direct outreach (identified from DB: no website + active listing OR engaged practitioners who ask about building a site), the in-dashboard website promotion

**Messaging hierarchy:**
1. The combined value: Your own website AND your directory listing — both working for you
2. The done-for-you appeal: You provide the content (bio, photos, offerings), we handle everything else
3. The speed: Live in two weeks — no agency delays, no learning curve
4. The insider advantage: We built the directory. We know what converts wellness clients. We build the site around that.
5. The price: One upfront fee, subscription included for a year
6. The CTA: "Book a 15-minute call — I'll show you examples from other [island] practitioners"

---

## Business Case Assessment

### Subscription Revenue (Conservative Projection)

The "Premium as website replacement" positioning, if effective, could convert 10–15% more of the free-tier-no-website segment into Premium subscribers.

Assuming 200 free practitioners across all islands with no website and an active listing (conservative from your DB):
- 15% conversion = 30 additional Premium subscribers
- 30 × $49/mo = **$1,470/mo additional MRR**
- Annualized: **$17,640/yr**

That's from better positioning alone — no new features required.

### Website Bundle Revenue

Your 30-day goal (from the marketing campaign doc) is 5–10 clients. At average $997:
- 5 clients = $4,985 one-time
- 10 clients = $9,970 one-time
- Plus year-2 subscription retention: if 80% stay on Premium after year 1 → $2,352–$4,704/yr recurring

**Year 1 total from bundles (5–10 clients):** $4,985–$9,970 one-time + ~$1,200–$2,400 in subscription run-rate by month 13

### Retention Value of Bundles

Website bundle clients have significantly higher retention than regular subscribers because:
- They've invested money and trust in the relationship beyond a monthly subscription
- Their site and listing are interlinked — churning would mean losing both
- They're more likely to upgrade to Featured (they've already committed to the platform)

Model this as 24-month LTV vs. 12-month for standard Premium:
- Standard Premium LTV (12 months): $49 × 12 = $588
- Bundle client LTV (24 months, Premium included month 1–12, retained month 13–24): $588 (year 2) + bundle one-time revenue
- A $997 bundle client with 24-month retention = $997 + $588 = **$1,585 LTV** vs. $588 for a standard subscriber

---

## Prioritized Action Items

### Immediate (this week)

1. **Write two distinct upgrade CTAs** in the dashboard: one for practitioners with a website URL ("Boost your discoverability") and one for those without ("Turn your profile into your website"). Segment by `website_url IS NULL` in DashboardHome.tsx.

2. **Define and expose the profile URL clearly.** Wherever practitioners manage their profile, show them their shareable URL explicitly with instructions: "This is your link — add it to Instagram, your email signature, and business cards."

3. **Restructure website bundle pricing** to lead with "includes X months Premium" — not "one-time fee + monthly." Update the campaign doc and any landing page copy accordingly.

### Near-term (this month)

4. **Segment the launch email blast** into three tracks (has website, no website, bundle prospect) and write separate messaging for each. The templates in `marketing-website-sales-campaign.md` are a strong start but conflate all three audiences.

5. **Build the website landing page** at hawaiiwellness.net/websites with the three bundle tiers, "includes X months Premium" framing, and real examples. The sales campaign depends on having somewhere to send people.

6. **Add "profile completeness" to the dashboard** with a percentage and explicit callout. A 70%+ profile is competitive with a standalone website. A 40% profile isn't. Give practitioners a clear path to close the gap.

### Strategic (next quarter)

7. **Add vanity/clean profile URLs** as a Premium feature. This is the linchpin of the "profile as website" argument and unlocks real QR code + business card use cases.

8. **Add inquiry form for Premium** profiles. "Send a message" button with email-to-practitioner delivery. Standard on any real website; currently missing from the profile.

9. **Track website bundle conversions in DB.** Add a `website_built` boolean (or similar) to practitioners/centers so you can suppress converted clients from outreach and measure LTV over time.

---

_Strategy prepared: March 17, 2026 · Hawaii Wellness LLC_
