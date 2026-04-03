# Hawaiʻi Wellness — Project Instructions

**Stack:** React + TypeScript + Vite · Tailwind CSS + shadcn/ui · Supabase · Stripe · Vercel
**Repo:** github.com/soulseed7369/hawaii-wellness · **Site:** hawaiiwellness.net
**Contact:** aloha@hawaiiwellness.net

---

## Execution Contract

**Plan first.** Write `tasks/todo.md` with checkable items before any non-trivial task (3+ steps or architectural decisions). Check in before starting implementation.

**Smallest safe patch.** Touch only what the task requires. Do not refactor adjacent code or restructure files unless explicitly asked.

**Verify before done.** Never mark a task complete without proving it works:
- `npm run build` — must pass with no errors
- Grep for any import paths changed — ensure no broken references
- For Supabase schema changes — confirm migration runs cleanly
- For UI changes — manually trace the affected route in browser

**After corrections.** Update `tasks/lessons.md` with the pattern. Review it at session start.

**Confirm before `git push`.** Always confirm with Marcus first.

---

## Repo-Wide Danger Zones

- **`supabaseAdmin` is null in the browser.** Service role key is server-only. Client-side calls fail silently with no error. → `supabase/CLAUDE.md`
- **Stripe is live mode** (account T47YY). Running checkout locally triggers real charges. → `supabase/CLAUDE.md`
- **Featured slots cap is DB-enforced.** Postgres trigger `check_featured_slot_limit` — 5/island hard cap. Inserting a 6th throws a DB error. → `supabase/CLAUDE.md`
- **`modalities` is `text[]`**, not a string. Always handle as array in TypeScript and Supabase calls. → `.claude/rules/data-model.md`
- **Supabase import is `@/lib/supabase`** — not `@/integrations/supabase/client`. That path doesn't exist and breaks the build.
- **`AdminPanel.tsx` is ~2800 lines.** Read with offset/limit or grep. Surgical edits only. → `src/pages/CLAUDE.md`
- **Qwen rewrites from scratch** on preserve-and-modify tasks. Use Sonnet/Opus for those. → `.claude/rules/architecture.md`
- **`website-examples-demo.html` is committed.** Keep it tracked. Recovery: `curl https://www.hawaiiwellness.net/website-examples-demo.html -o website-examples-demo.html`

---

## Reference Map

| Topic | File |
|-------|------|
| DB schemas, filtering, modalities, island→cities | `.claude/rules/data-model.md` |
| Hooks, auth, file structure, tier system, lm_code.py | `.claude/rules/architecture.md` |
| Search/taxonomy rebuild, sprint status | `.claude/rules/search-taxonomy.md` |
| Supabase, Stripe, auth security, Edge Functions | `supabase/CLAUDE.md` |
| Page-level edit rules, AdminPanel, DOMPurify | `src/pages/CLAUDE.md` |
| GM pipeline, enrichment, web crawl | `pipeline/CLAUDE.md` |
