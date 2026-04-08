/**
 * Shared helpers for detecting duplicate listings at create time.
 *
 * Context: `useSaveCenter` / `useSavePractitioner` used to INSERT without
 * checking whether a listing with the same email already existed. This
 * produced pairs like the Ohana Bali Spa case where a pipeline-imported
 * row and a user-created row ended up representing the same business
 * under two different accounts. See `tasks/todo.md` ("Duplicate Listings
 * on Claim") for the full diagnosis.
 *
 * We match by lowercased email only. Phone/website matching was evaluated
 * and rejected — it introduced false positives (shared business numbers,
 * domain parking pages) and only caught one additional real dupe.
 */
import { supabase } from '@/lib/supabase';

/**
 * Emails that appear many times in pipeline data and are not meaningful
 * identifiers. Excluded so a user typing `info@mysite.com` doesn't
 * accidentally collide with 50 scraped placeholder rows.
 */
export const DUPLICATE_PLACEHOLDER_EMAILS = new Set<string>([
  'info@mysite.com',
  'info@workstar.com',
  'info@example.com',
  'info@gmail.com',
  'noreply@gmail.com',
  'test@test.com',
]);

export type DuplicateCandidate = {
  id: string;
  name: string;
  email: string | null;
  city: string | null;
  island: string | null;
  owner_id: string | null;
  status: string;
};

export type DuplicateErrorCode = 'DUPLICATE_UNCLAIMED' | 'DUPLICATE_CLAIMED';

export class DuplicateListingError extends Error {
  code: DuplicateErrorCode;
  candidate: DuplicateCandidate;
  constructor(code: DuplicateErrorCode, candidate: DuplicateCandidate) {
    super(
      code === 'DUPLICATE_UNCLAIMED'
        ? `A listing for "${candidate.name}" already exists and is unclaimed. Please claim it instead of creating a new one.`
        : `A listing for "${candidate.name}" already exists and is owned by another account. Please contact support to resolve.`,
    );
    this.name = 'DuplicateListingError';
    this.code = code;
    this.candidate = candidate;
  }
}

/**
 * Look for an existing non-archived listing in `centers` or `practitioners`
 * whose email matches the one the user is about to submit. Returns the
 * first candidate, or `null` if none found / email is empty / email is a
 * known placeholder.
 *
 * NOTE: This is intentionally scoped by email match only. It does NOT
 * filter by `owner_id IS NULL` — we want to flag even already-claimed
 * rows so the same-business-two-accounts case (Ohana Bali Spa) is caught.
 *
 * RLS CAVEAT: the default `public_read_published` policy on
 * `practitioners`/`centers` restricts SELECT to `status = 'published'`
 * for non-admin authenticated users, so this lookup does NOT see draft
 * rows. A pipeline-imported row still in 'draft' will therefore slip
 * past dedup. The Ohana Bali Spa case (both rows published after the
 * first claim) is still caught, which is the common failure mode.
 */
export async function findDuplicateByEmail(
  table: 'centers' | 'practitioners',
  email: string | null | undefined,
  selfUserId: string,
): Promise<DuplicateCandidate | null> {
  if (!supabase) return null;
  const needle = email?.trim().toLowerCase();
  if (!needle) return null;
  if (DUPLICATE_PLACEHOLDER_EMAILS.has(needle)) return null;
  // Escape LIKE wildcards so emails containing `_` (e.g. `jane_doe@...`)
  // or `%` don't turn into pattern matches. Backslash first so we don't
  // double-escape the escape character.
  const escaped = needle.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&');

  const { data, error } = await supabase
    .from(table)
    .select('id, name, email, city, island, owner_id, status')
    .ilike('email', escaped)
    .neq('status', 'archived')
    .limit(5);

  if (error) {
    // Fail open — a failed dedup check should never block a save.
    console.warn(`[dedup] ${table} lookup failed:`, error);
    return null;
  }
  if (!data || data.length === 0) return null;

  // Skip any row already owned by the current user — that's the normal
  // update-your-own-listing path and `useSaveCenter` already handles it.
  const candidates = data.filter((r) => r.owner_id !== selfUserId);
  if (candidates.length === 0) return null;

  // Prefer an unclaimed candidate (user can self-serve via claim flow);
  // otherwise surface the first claimed one (user must contact support).
  const unclaimed = candidates.find((r) => r.owner_id === null);
  return (unclaimed ?? candidates[0]) as DuplicateCandidate;
}

/**
 * Convenience wrapper: run the lookup and throw a typed error if a
 * duplicate is found. Callers catch `DuplicateListingError` and drive a
 * dialog from `error.code` + `error.candidate`.
 */
export async function assertNoDuplicateByEmail(
  table: 'centers' | 'practitioners',
  email: string | null | undefined,
  selfUserId: string,
): Promise<void> {
  const candidate = await findDuplicateByEmail(table, email, selfUserId);
  if (!candidate) return;
  const code: DuplicateErrorCode = candidate.owner_id === null
    ? 'DUPLICATE_UNCLAIMED'
    : 'DUPLICATE_CLAIMED';
  throw new DuplicateListingError(code, candidate);
}
