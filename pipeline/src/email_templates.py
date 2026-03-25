"""
Email templates for the Hawaii Wellness outreach campaign.
Each template returns (subject, html_body, text_body) given a contact dict.

Contact dict keys (from DB query):
  id            — listing UUID (required)
  name          — practitioner/center name
  email         — listing email
  city          — listing city
  island        — listing island code ('big_island', 'maui', 'oahu', 'kauai')
  modalities    — list of modality strings
  listing_type  — 'practitioner' or 'center' (must be set by caller)
"""

SITE_URL = "https://www.hawaiiwellness.net"

ISLAND_DISPLAY = {
    "big_island": "Big Island",
    "maui": "Maui",
    "oahu": "Oahu",
    "kauai": "Kauai",
}

# For use in sentences ("on the Big Island" vs "on Maui")
ISLAND_DISPLAY_WITH_ARTICLE = {
    "big_island": "the Big Island",
    "maui": "Maui",
    "oahu": "Oahu",
    "kauai": "Kauai",
}


def _island_name(island: str) -> str:
    return ISLAND_DISPLAY.get(island, island or "Hawaii")


def _primary_modality(modalities: list) -> str:
    if modalities and len(modalities) > 0:
        return modalities[0]
    return "wellness"


def _listing_id(contact: dict) -> str:
    """Extract listing ID from contact dict. Raises if missing."""
    lid = contact.get("listing_id") or contact.get("id") or ""
    if not lid:
        raise ValueError(f"Contact has no listing ID: {contact.get('name', '???')}")
    return lid


def _claim_url(listing_id: str, listing_type: str = "practitioner") -> str:
    """Link to the listing's public profile — the 'Claim this listing' card is shown for unclaimed listings."""
    kind = "center" if listing_type == "center" else "profile"
    return f"{SITE_URL}/{kind}/{listing_id}"


def _upgrade_url() -> str:
    return f"{SITE_URL}/list-your-practice"


def _booking_url() -> str:
    # Replace with actual Calendly or booking link
    return f"{SITE_URL}/websites"


# ─── PHASE 1: Claim Your Listing ─────────────────────────────────────────────

def phase1_claim(contact: dict) -> tuple:
    name = contact.get("name", "there")
    city = contact.get("city", "")
    island = _island_name(contact.get("island", ""))
    modality = _primary_modality(contact.get("modalities", []))
    listing_id = _listing_id(contact)
    listing_type = contact.get("listing_type", "practitioner")
    claim_link = _claim_url(listing_id, listing_type)

    city_str = f" in {city}" if city else f" on {island}"

    subject = f"Your {modality} practice{city_str} is on Hawaii Wellness"

    text_body = f"""Hi {name},

I'm Marcus — I built Hawai'i Wellness (hawaiiwellness.net), a directory I created to help people across the islands find trusted wellness practitioners. It's the only directory dedicated entirely to wellness in Hawai'i, covering everything from lomilomi and yoga to acupuncture, somatic therapy, and beyond.

Your {modality} practice{city_str} is already listed and showing up in searches. Right now your listing is unclaimed, which means you can't update your info, add photos, or know when someone's found you.

Claiming takes about 2 minutes and it's completely free:
{claim_link}

Would love to have you as a full part of what we're building here.

Aloha,
Marcus
Hawai'i Wellness — hawaiiwellness.net"""

    html_body = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
  <p>Hi {name},</p>

  <p>I'm Marcus — I built <a href="{SITE_URL}" style="color: #0369a1;">Hawai'i Wellness</a>, a directory I created to help people across the islands find trusted wellness practitioners. It's the only directory dedicated entirely to wellness in Hawai'i, covering everything from lomilomi and yoga to acupuncture, somatic therapy, and beyond.</p>

  <p>Your {modality} practice{city_str} is already listed and showing up in searches. Right now your listing is unclaimed, which means you can't update your info, add photos, or know when someone's found you.</p>

  <p>Claiming takes about 2 minutes and it's completely free:</p>

  <p style="margin: 24px 0;">
    <a href="{claim_link}" style="background: #0369a1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Your Listing</a>
  </p>

  <p>Would love to have you as a full part of what we're building here.</p>

  <p>Aloha,<br>Marcus<br>
  <span style="color: #64748b; font-size: 14px;"><a href="{SITE_URL}" style="color: #64748b;">Hawai'i Wellness</a></span></p>
</div>"""

    return subject, html_body, text_body


# ─── PHASE 2 TRACK A: Premium for Website Owners ─────────────────────────────

def phase2_track_a(contact: dict) -> tuple:
    name = contact.get("name", "there")
    island = _island_name(contact.get("island", ""))
    island_with_article = ISLAND_DISPLAY_WITH_ARTICLE.get(contact.get("island", ""), island)
    modality = _primary_modality(contact.get("modalities", []))
    upgrade_link = _upgrade_url()

    subject = f"More {island} clients from Hawaii Wellness"

    text_body = f"""Hi {name},

You claimed your listing on Hawaii Wellness — thanks for that.

I see you already have a website, which is great. What most practitioners don't realize is that hundreds of people search our directory every week looking for {modality} on {island_with_article}.

Right now your listing is basic. Upgrading to Premium ($49/mo) adds your class schedule, offerings, testimonials, and a booking button — so when people find you on the directory, they can book directly or visit your site.

Your website does the converting. Hawaii Wellness does the finding.

{upgrade_link}

Aloha,
Marcus
Hawaii Wellness"""

    html_body = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
  <p>Hi {name},</p>

  <p>You claimed your listing on <a href="{SITE_URL}" style="color: #0369a1;">Hawaii Wellness</a> — thanks for that.</p>

  <p>I see you already have a website, which is great. What most practitioners don't realize is that hundreds of people search our directory every week looking for {modality} on {island_with_article}.</p>

  <p>Right now your listing is basic. Upgrading to Premium ($49/mo) adds your class schedule, offerings, testimonials, and a booking button — so when people find you on the directory, they can book directly or visit your site.</p>

  <p><strong>Your website does the converting. Hawaii Wellness does the finding.</strong></p>

  <p style="margin: 24px 0;">
    <a href="{upgrade_link}" style="background: #0369a1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Upgrade to Premium</a>
  </p>

  <p>Aloha,<br>Marcus<br>
  <span style="color: #64748b; font-size: 14px;">Hawaii Wellness</span></p>
</div>"""

    return subject, html_body, text_body


# ─── PHASE 2 TRACK B: Premium as Website Replacement ─────────────────────────

def phase2_track_b(contact: dict) -> tuple:
    name = contact.get("name", "there")
    city = contact.get("city", "")
    modality = _primary_modality(contact.get("modalities", []))
    upgrade_link = _upgrade_url()

    city_str = f" in {city}" if city else ""

    subject = f"{name}, your complete online presence for $49/mo"

    text_body = f"""Hi {name},

I noticed your {modality} practice{city_str} doesn't have a website yet — that's actually the most common thing I hear from practitioners.

A Premium profile on Hawaii Wellness gives you everything a website would: a full bio, your offerings with pricing, class schedules, testimonials, social links, and a booking button. All shareable — put it in your Instagram bio, on business cards, in your email signature.

$49/mo. Less than a gym membership. Takes an afternoon to set up.

{upgrade_link}

Aloha,
Marcus
Hawaii Wellness"""

    html_body = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
  <p>Hi {name},</p>

  <p>I noticed your {modality} practice{city_str} doesn't have a website yet — that's actually the most common thing I hear from practitioners.</p>

  <p>A Premium profile on Hawaii Wellness gives you everything a website would: a full bio, your offerings with pricing, class schedules, testimonials, social links, and a booking button. All shareable — put it in your Instagram bio, on business cards, in your email signature.</p>

  <p><strong>$49/mo. Less than a gym membership.</strong> Takes an afternoon to set up.</p>

  <p style="margin: 24px 0;">
    <a href="{upgrade_link}" style="background: #0369a1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Upgrade to Premium</a>
  </p>

  <p>Aloha,<br>Marcus<br>
  <span style="color: #64748b; font-size: 14px;">Hawaii Wellness</span></p>
</div>"""

    return subject, html_body, text_body


# ─── PHASE 2 TRACK C: Website Bundle ─────────────────────────────────────────

def phase2_track_c(contact: dict) -> tuple:
    name = contact.get("name", "there")
    city = contact.get("city", "")
    island = _island_name(contact.get("island", ""))
    booking_link = _booking_url()

    city_str = f" in {city}" if city else f" on {island}"

    subject = f"A website for your{city_str} practice — done for you"

    text_body = f"""Hi {name},

I created Hawai'i Wellness — you're listed in our directory and I've been thinking about practitioners like you who could benefit from having their own website alongside their listing.

We now build done-for-you websites for Hawaii wellness practitioners:
- Designed to work with your directory profile
- Optimized for local search on {island}
- Live in 2 weeks
- Your Premium subscription is included

Would a 15-minute call make sense? I can show you examples from other {island} practitioners.

{booking_link}

Aloha,
Marcus
Hawaii Wellness"""

    html_body = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
  <p>Hi {name},</p>

  <p>I created <a href="{SITE_URL}" style="color: #0369a1;">Hawai'i Wellness</a> — you're listed in our directory and I've been thinking about practitioners like you who could benefit from having their own website alongside their listing.</p>

  <p>We now build done-for-you websites for Hawaii wellness practitioners:</p>
  <ul style="color: #334155; padding-left: 20px;">
    <li>Designed to work with your directory profile</li>
    <li>Optimized for local search on {island}</li>
    <li>Live in 2 weeks</li>
    <li>Your Premium subscription is included</li>
  </ul>

  <p>Would a 15-minute call make sense? I can show you examples from other {island} practitioners.</p>

  <p style="margin: 24px 0;">
    <a href="{booking_link}" style="background: #0369a1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Book a 15-Min Call</a>
  </p>

  <p>Aloha,<br>Marcus<br>
  <span style="color: #64748b; font-size: 14px;">Hawaii Wellness</span></p>
</div>"""

    return subject, html_body, text_body


# ─── FOLLOW-UP (any phase) ───────────────────────────────────────────────────

def follow_up(contact: dict, original_subject: str = "", original_cta_url: str = "") -> tuple:
    name = contact.get("name", "there")

    subject = f"Re: {original_subject}" if original_subject else "Following up — Hawaii Wellness"

    cta_link = original_cta_url or SITE_URL

    text_body = f"""Hi {name},

Just following up — I sent a note last week about your listing on Hawaii Wellness. Wanted to make sure it didn't get buried.

{cta_link}

Happy to answer any questions.

Aloha,
Marcus
Hawaii Wellness"""

    html_body = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
  <p>Hi {name},</p>

  <p>Just following up — I sent a note last week about your listing on Hawaii Wellness. Wanted to make sure it didn't get buried.</p>

  <p style="margin: 24px 0;">
    <a href="{cta_link}" style="background: #0369a1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Your Listing</a>
  </p>

  <p>Happy to answer any questions.</p>

  <p>Aloha,<br>Marcus<br>
  <span style="color: #64748b; font-size: 14px;">Hawaii Wellness</span></p>
</div>"""

    return subject, html_body, text_body


# ─── Template selector ────────────────────────────────────────────────────────

TEMPLATE_MAP = {
    "phase1_claim": phase1_claim,
    "phase2_track_a": phase2_track_a,
    "phase2_track_b": phase2_track_b,
    "phase2_track_c": phase2_track_c,
    "follow_up": follow_up,
}

SEGMENT_TO_TEMPLATE = {
    "unclaimed": "phase1_claim",
    "claimed_has_website": "phase2_track_a",
    "claimed_no_website": "phase2_track_b",
    "bundle_prospect": "phase2_track_c",
}


def render_email(contact: dict, template_name: str = None) -> tuple:
    """
    Render an email for a contact. Auto-selects template from segment if not specified.

    Args:
        contact: dict with listing data (id, name, email, city, island, modalities, listing_type)
        template_name: one of TEMPLATE_MAP keys, or None to auto-select from contact['segment']

    Returns:
        (subject, html_body, text_body)
    """
    if not isinstance(contact, dict):
        raise TypeError(f"render_email() first arg must be a contact dict, got {type(contact).__name__}. "
                        f"Usage: render_email(contact_dict, 'phase1_claim')")
    if not template_name:
        template_name = SEGMENT_TO_TEMPLATE.get(contact.get("segment", ""), "phase1_claim")
    fn = TEMPLATE_MAP.get(template_name, phase1_claim)
    return fn(contact)
