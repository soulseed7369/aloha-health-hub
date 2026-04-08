# RLS Lockdown — 4 Public Tables

Supabase linter flagged `rls_disabled_in_public` ERROR on 4 tables, 2026-04-08.

## Plan

- [x] Grep all references (src/ + supabase/functions/ + pipeline/)
- [x] Classify each table by caller (browser vs service role)
- [x] Confirm existing `is_admin()` helper exists and pattern matches
- [ ] Write migration `20260408000000_enable_rls_on_public_tables.sql`
  - [ ] `claim_sms_otps`: ENABLE RLS, no policies (service-role only)
  - [ ] `campaign_emails`: ENABLE RLS, admin SELECT policy
  - [ ] `pipeline_corrections`: ENABLE RLS, admin INSERT+SELECT policies
  - [ ] `campaign_outreach`: ENABLE RLS, admin ALL policy
  - [ ] RPC `mark_campaign_claimed(uuid)` — SECURITY DEFINER, verifies ownership
- [ ] Edit `src/views/ClaimListing.tsx` — swap direct UPDATE for RPC call
- [ ] `npm run build` — confirm clean
- [ ] Marcus applies migration via Supabase Dashboard SQL Editor
- [ ] Re-run Supabase linter — confirm 4 errors cleared
- [ ] QA: attempt a test claim to confirm `mark_campaign_claimed` fires

## Follow-ups (not blocking)

- Audit `claim-listing-otp/index.ts` hashing — confirm it's salted/HMAC not raw SHA
- Re-run full Supabase linter for any other tables missing RLS
