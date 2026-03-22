import type { VerifiedTestimonialRow } from '@/types/database';

/**
 * Calculate the number of invites sent this month.
 * Counts invites created in the current month.
 */
export function calculateInviteQuota(invites: VerifiedTestimonialRow[]): number {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return invites.filter((invite) => {
    const invitedDate = new Date(invite.invited_at);
    return invitedDate >= currentMonth;
  }).length;
}
