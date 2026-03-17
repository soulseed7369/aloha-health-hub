# Verification System — Deployment Guide

## Overview

Two-channel contact verification (email + phone SMS) for practitioner and center listings.

- **SMS:** Twilio → 6-digit OTP from +1 (808) 556-6506 (Kaunakakai, HI)
- **Email:** Supabase Auth → uses project's built-in SMTP (zero extra cost)
- **Storage:** SHA-256 hashed codes in `verification_codes` table, 10-min expiry, 3 attempts max

---

## Step 1: Apply the Database Migration

1. Open Supabase Dashboard → SQL Editor
2. Paste the contents of `supabase/migrations/20260316000000_verification.sql`
3. Run it

This creates:
- `email_verified_at` / `phone_verified_at` columns on `practitioners` and `centers`
- `verification_codes` table with RLS
- `pending_review` status value
- 5 RPC functions (`store_verification_code`, `check_verification_code`, `request_listing_review`, `claim_listing` v2, `cleanup_expired_verification_codes`)
- Triggers that clear verification when contact info changes

---

## Step 2: Customize the Supabase Email Template

The email verification uses Supabase Auth's `signInWithOtp` as a delivery mechanism.
We pass the verification code via the `data` parameter, which is accessible in the
email template as `{{ .Data.verification_code }}`.

1. Go to Supabase Dashboard → Auth → Email Templates → **Magic Link**
2. Replace the template with:

```html
<h2 style="color: #2d5016; font-family: sans-serif;">🌺 Aloha Health Hub</h2>

<p>Your verification code for <strong>{{ .Data.listing_name }}</strong> is:</p>

<div style="background: #f5f3ff; border: 2px solid #e0daf5; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
  <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333; font-family: 'Courier New', monospace;">
    {{ .Data.verification_code }}
  </span>
</div>

<p style="color: #666; font-size: 13px;">
  This code expires in <strong>10 minutes</strong>.
  If you didn't request this, you can safely ignore this email.
</p>

<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
<p style="color: #999; font-size: 11px; text-align: center;">
  Aloha Health Hub · hawaiiwellness.net
</p>
```

3. Set the Subject to: `{{ .Data.verification_code }} — Verify your listing on Aloha Health Hub`

**Optional — Custom SMTP for branded sender:**
If you want emails to come from `noreply@hawaiiwellness.net` instead of Supabase's
default, go to Project Settings → Auth → SMTP Settings and add your domain's SMTP
credentials (e.g. from your email host, Zoho, or Google Workspace).

---

## Step 3: Set Edge Function Secrets

In Supabase Dashboard → Project Settings → Edge Functions → Secrets, add:

| Secret Name | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | *(your Twilio account SID — starts with AC)* |
| `TWILIO_AUTH_TOKEN` | *(your Twilio auth token)* |
| `TWILIO_FROM_NUMBER` | `+18085566506` |

That's it — only 3 secrets needed. Email uses Supabase's built-in SMTP, no extra keys.

**Or via Supabase CLI:**
```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=your_account_sid_here \
  TWILIO_AUTH_TOKEN=your_token_here \
  TWILIO_FROM_NUMBER=+18085566506
```

---

## Step 4: Deploy Edge Functions

```bash
cd aloha-health-hub

# Deploy both new Edge Functions
supabase functions deploy send-verification-code --no-verify-jwt
supabase functions deploy verify-code --no-verify-jwt
```

Note: `--no-verify-jwt` is used because the functions handle their own JWT verification internally (they need to call `supabase.auth.getUser(token)`). This is the same pattern used by `create-checkout-session`.

---

## Step 5: Deploy Frontend

Push to git → Vercel auto-deploys. The new files are:

**New components:**
- `src/components/ContactVerification.tsx` — inline verify widget
- `src/components/VerificationBadge.tsx` — reusable badge

**New hook:**
- `src/hooks/useVerification.ts` — `useSendVerificationCode`, `useVerifyCode`, `useRequestReview`

**Modified files:**
- `src/pages/dashboard/DashboardProfile.tsx` — verify buttons next to email/phone
- `src/pages/dashboard/DashboardHome.tsx` — "Verify contact info" onboarding step
- `src/hooks/usePractitioner.ts` — `verified` now reads from DB
- `src/lib/adapters.ts` — passes `verified` to Provider cards
- `src/components/ProviderCard.tsx` — checkmark badge on verified listings
- `src/data/mockData.ts` — `verified` field on Provider type
- `src/types/database.ts` — new columns + `pending_review` status

---

## Step 6: Test

### Phone verification test:
1. Log in as a practitioner
2. Add a real phone number to your listing → Save
3. Click "Verify phone" → should receive SMS from (808) 556-6506
4. Enter 6-digit code → should show green "Verified" badge

### Email verification test:
1. Add a real email to your listing → Save
2. Click "Verify email" → should receive email with 6-digit code
3. Enter 6-digit code → green "Verified" badge

### Request review test:
1. With at least one verified channel, the "Request Review" card appears
2. Click it → listing status changes to `pending_review`
3. In Admin Panel, listing shows as pending review → admin publishes

---

## Twilio Account Details

- **Account SID:** *(in Twilio Dashboard → Account Info)*
- **Phone Number:** +1 (808) 556-6506 (Kaunakakai, Molokai)
- **Number SID:** PNd4d2ca764e8474c102ace86d117ce68e
- **Cost:** $1.15/mo for number + ~$0.0079/SMS sent

---

## Cost Estimates

| Channel | Per verification | Monthly (100 verifications) |
|---------|-----------------|---------------------------|
| SMS (Twilio) | $0.0079 | $0.79 |
| Email (Supabase) | Free (built-in) | $0.00 |
| Phone number | — | $1.15 |
| **Total** | | **~$1.94/mo** |

---

## How Email Verification Works (Technical Detail)

The Edge Function calls `supabase.auth.signInWithOtp()` which sends an email through
Supabase's configured SMTP. The OTP code is passed via the `data` parameter:

```typescript
await supabase.auth.signInWithOtp({
  email: to,
  options: {
    shouldCreateUser: false,
    data: {
      verification_code: code,      // our 6-digit code
      listing_name: listingName,     // shown in email
    },
  },
});
```

The email template (configured in Step 2) renders `{{ .Data.verification_code }}`
prominently. The Supabase Auth OTP token that also arrives in the email is ignored —
our `verify-code` Edge Function validates against the `verification_codes` table.

If the listing email doesn't have a Supabase Auth account, the Edge Function creates
a placeholder user first (with `email_confirm: true`) so the OTP email can be delivered.

---

## Future Enhancements

1. **Custom SMTP:** Configure Supabase Auth SMTP so emails come from `noreply@hawaiiwellness.net`
2. **Automated outreach:** Send batch SMS/email to pipeline listings inviting them to claim
3. **Twilio Verify API:** Migrate from raw SMS to Twilio Verify for built-in fraud detection
4. **Email notifications:** Notify practitioners when claim is approved/denied
5. **pg_cron cleanup:** Schedule `SELECT cleanup_expired_verification_codes()` to run daily
