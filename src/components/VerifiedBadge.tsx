import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function VerifiedBadge({ className = '', size = 'md' }: VerifiedBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-xs gap-0.5 px-1.5 py-0'
    : 'text-xs gap-1 px-2 py-0.5';
  return (
    <Badge className={`bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 ${sizeClasses} ${className}`}>
      <CheckCircle className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      Verified
    </Badge>
  );
}
