# src/pages — Edit Rules

## Default Rules for All Pages

- **Do not rewrite existing page layout** unless explicitly asked.
- **Preserve route behavior and existing copy** by default.
- **Manual QA the affected route** after any page change — verify in browser, not just a passing build.

---

## AdminPanel.tsx (~2800 lines)

- Always read with `offset`/`limit` or grep for the specific section. Never read the whole file at once.
- Make surgical edits only. Do not restructure tabs, reorganize state, or rename props unless asked.
- The Subscription Tier dropdown in Edit Practitioner and Edit Center dialogs calls `setListingTier.mutate()` immediately on change — there is no save button. This atomically updates the listing tier and creates/removes a `featured_slots` row.

---

## ArticleDetail.tsx

**DOMPurify is required.** It sanitizes article body HTML before render for XSS protection. Do not remove it, even during "cleanup" or dependency pruning passes.

---

## Hero Images (Maui / Oahu / Kauai)

Public asset filenames contain spaces. Always use URL-encoded paths in `heroImageUrl` config:
- `/maui%20hero.jpg`
- `/oahu%20hero.jpg`
- `/kauai%20hero.jpg`

---

## Auth.tsx / DashboardHome.tsx / AuthCallback.tsx

`pendingPlan` localStorage key is a security control — must be validated against a price ID whitelist before firing checkout. Do not simplify or remove this validation. See `supabase/CLAUDE.md` for context.

---

## DashboardProfile.tsx

`avatar_url` is part of `PractitionerFormData`. Always pass `{ ...form, avatar_url }` to `saveMutation.mutateAsync()`. Omitting it silently drops the avatar from the DB record.
