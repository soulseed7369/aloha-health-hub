# App Architecture Reference

## Key Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAdmin` | `src/hooks/useAdmin.ts` | All admin mutations — practitioners, centers, retreats, articles, flags |
| `useSetListingTier` | `src/hooks/useAdmin.ts` | Set tier on listing + manage featured_slots atomically |
| `useAccounts` | `src/hooks/useAccounts.ts` | All user accounts, subscription status, linked listings (admin functions stubbed — see `supabase/CLAUDE.md`) |
| `useMyPractitioner` | `src/hooks/useMyPractitioner.ts` | Provider's own practitioner profile CRUD + `uploadMyPhoto()` |
| `useStripe` | `src/hooks/useStripe.ts` | `useCreateCheckoutSession`, `useMyBillingProfile`, `PLAN_OPTIONS` |
| `useListingFlags` | `src/hooks/useListingFlags.ts` | Flag listings for review |
| `usePractitioners` | `src/hooks/usePractitioners.ts` | Public directory fetch with island filter |
| `useCenters` | `src/hooks/useCenters.ts` | Public directory fetch for centers |
| `useArticles` / `useArticleBySlug` | `src/hooks/useArticles.ts` | Blog article fetch |

---

## Auth Flow

- **Magic link** is the primary sign-in method (`supabase.auth.signInWithOtp`)
- Password sign-in is available as a secondary toggle
- **Plan intent persistence:** `localStorage.setItem('pendingPlan', priceId)` before auth redirect; `DashboardHome` checks on mount and fires checkout automatically
- **Redirect priority after login:** pendingPlan → claimId → redirectTo param → /dashboard
- `pendingPlan` must be validated against a price ID whitelist — see `supabase/CLAUDE.md`

---

## Key File Locations

```
src/
  pages/
    admin/AdminPanel.tsx         — admin UI (~2800 lines — see src/pages/CLAUDE.md)
    dashboard/
      DashboardHome.tsx          — onboarding + pending checkout resume
      DashboardProfile.tsx       — provider profile editor (island, modalities, photo)
      DashboardBilling.tsx       — subscription management
    Auth.tsx                     — magic link + password sign-in
    ListYourPractice.tsx         — pricing/signup page
    Directory.tsx                — public directory with filters
    PrivacyPolicy.tsx            — /privacy-policy
    TermsOfService.tsx           — /terms-of-service
    HelpCenter.tsx               — /help (FAQ accordion)
  hooks/                         — see hooks table above
  lib/
    stripe.ts                    — STRIPE_PRICES constants
    supabaseAdmin.ts             — service-role client (server-only, null in browser)
    parseSearchQuery.ts          — client-side query parser for new search
  components/
    SearchBar.tsx                — taxonomy-powered autocomplete
    layout/Footer.tsx            — sitewide footer
    AdminProtectedRoute.tsx      — admin route guard
supabase/
  functions/
    create-checkout-session/     — Stripe checkout edge function
    stripe-webhook/              — Stripe event handler
  migrations/                    — all schema migrations (apply via Supabase dashboard SQL editor)
pipeline/
  scripts/                       — Python pipeline scripts (00–32)
  src/config.py                  — OUTPUT_DIR, island town lists, city config
  src/supabase_client.py         — Supabase client for pipeline
  output/                        — intermediate JSONL files
```

---

## Local LLM via lm_code.py

`lm_code.py` (project root) delegates coding tasks to a locally-running LM Studio model via OpenAI-compatible REST API.

**When to use Qwen vs. Sonnet/Opus:**
- **Qwen (`qwen3-coder-30b`):** New files, new hooks, type additions, focused spec-driven tasks
- **Sonnet/Opus:** Preserve-and-modify tasks, complex refactors, anything requiring "keep existing code and patch it" — Qwen rewrites from scratch on these

**Environment:**
```bash
LM_HOST=192.168.68.65   # current network host
LM_PORT=1234
LM_MODEL=qwen/qwen3-coder-30b
```

**Common usage:**
```bash
# Ask a question
python3 lm_code.py "What does useSetListingTier do?"

# Edit a file (rewrites and saves in place)
python3 lm_code.py "Add loading spinner to ProviderCard" src/components/ProviderCard.tsx

# Edit multiple files
python3 lm_code.py "Refactor pagination" src/hooks/usePractitioners.ts src/pages/Directory.tsx

# Read task from file
python3 lm_code.py --task-file task.txt src/pages/Directory.tsx

# Dry run (print only, don't write)
python3 lm_code.py --print-only "Refactor X" src/components/Foo.tsx

# Use lighter model
python3 lm_code.py --model qwen/qwen3-8b "Quick fix" src/pages/Auth.tsx

# List loaded models
python3 lm_code.py --list-models
```

**How it works:** Reads files into `=== FILE: path ===` blocks → single chat completion at temperature 0.2 → parses `=== FILE: path ===` separators in response to write files.

| Model | Use case |
|-------|----------|
| `qwen/qwen3-coder-30b` | Default — best quality, handles large files |
| `qwen/qwen3-8b` | Faster, good for small targeted edits |
