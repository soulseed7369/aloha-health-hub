/**
 * VerificationBadge.tsx
 * Inline badge that shows verification status for email/phone on listings.
 * Used in both the dashboard profile editor and public profile pages.
 */

import { CheckCircle, ShieldCheck } from 'lucide-react';

interface VerificationBadgeProps {
  verified: boolean;
  /** If provided, shows "Verified" when true, label when false */
  label?: string;
  size?: 'sm' | 'md';
}

export function VerificationBadge({ verified, label, size = 'sm' }: VerificationBadgeProps) {
  if (verified) {
    return (
      <span className={`inline-flex items-center gap-1 text-emerald-600 font-medium ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}>
        <CheckCircle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        Verified
      </span>
    );
  }

  if (label) {
    return (
      <span className={`inline-flex items-center gap-1 text-amber-600 font-medium ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}>
        <ShieldCheck className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        {label}
      </span>
    );
  }

  return null;
}
