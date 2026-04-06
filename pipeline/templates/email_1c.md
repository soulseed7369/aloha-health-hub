---
name: Email 1c — Claim Your Free Listing
template_id: email_1c
subject: "Your free listing on Hawaiʻi Wellness — {{practitioner_name}}"
from: aloha@hawaiiwellness.net
target_segment: unclaimed  (listings with owner_id IS NULL, status = 'published')
phase: phase1
---

Aloha {{practitioner_name}},

I'm Marcus with Hawaiʻi Wellness — we run hawaiiwellness.net, the directory for holistic wellness practitioners across the Hawaiian Islands.

Your practice already has a **free listing** on our site. Thousands of people searching for wellness services on the Big Island come through Hawaii Wellness every month — and right now your listing is live but unclaimed.

Claiming it is free and takes about two minutes. Once you do, you can:

- Update your bio, photo, and services
- Add your booking link
- Control how you show up in searches

👉 Claim your free listing here:
https://hawaiiwellness.net/auth?claim={{listing_id}}

No credit card, no obligation. It's yours.

Mahalo,
Marcus Woo
808-936-1394
Hawaiʻi Wellness
hawaiiwellness.net
aloha@hawaiiwellness.net

---
<!-- SEND INSTRUCTIONS
  - Target: practitioners and centers where owner_id IS NULL and status = 'published'
  - Filter: has valid email address
  - Placeholders: {{practitioner_name}}, {{listing_id}}
  - Do NOT send to: bad_contact, already claimed, upgraded
  - Follow-up: Email 1a (website redesign pitch) after claim confirmed
-->
