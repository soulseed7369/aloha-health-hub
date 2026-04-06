'use client';

import { useState } from 'react';
import { Phone, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackContactClick } from '@/hooks/useTrackEvent';

interface Props {
  listingId: string;
  listingType: 'practitioner' | 'center';
  type: 'phone' | 'email';
  className?: string;
}

/**
 * ContactReveal — reveals phone/email on button click via the
 * server-side /api/contact route (rate-limited, service-role only).
 *
 * This prevents contact info from appearing in page source HTML,
 * stopping naive scrapers while keeping it accessible to real users.
 * Also works inside the SPA (ProfileDetail, CenterDetail views).
 */
export function ContactReveal({ listingId, listingType, type, className }: Props) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notAvailable, setNotAvailable] = useState(false);

  const reveal = async () => {
    setLoading(true);
    setNotAvailable(false);
    try {
      const res = await fetch(
        `/api/contact?id=${encodeURIComponent(listingId)}&type=${listingType}&field=${type}`
      );

      if (res.status === 429) {
        setNotAvailable(true);
        return;
      }

      if (!res.ok) {
        setNotAvailable(true);
        return;
      }

      const data = await res.json();
      const val: string | null = data[type] ?? null;

      if (val) {
        setValue(val);
        trackContactClick(listingId, listingType, type);
      } else {
        setNotAvailable(true);
      }
    } catch {
      setNotAvailable(true);
    } finally {
      setLoading(false);
    }
  };

  const Icon = type === 'phone' ? Phone : Mail;

  if (value) {
    const href = type === 'phone' ? `tel:${value}` : `mailto:${value}`;
    return (
      <a
        href={href}
        className={`flex w-full items-center gap-2 font-medium text-primary hover:text-primary/80 transition-colors ${className ?? ''}`}
      >
        <Icon className="h-4 w-4 flex-shrink-0" /> {value}
      </a>
    );
  }

  if (notAvailable) {
    return (
      <div className={`flex w-full items-center gap-2 text-sm text-muted-foreground ${className ?? ''}`}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>Not available</span>
      </div>
    );
  }

  const label = type === 'phone' ? 'Show Phone' : 'Show Email';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={reveal}
      disabled={loading}
      className={`w-full justify-start gap-2 text-primary ${className ?? ''}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </Button>
  );
}

export default ContactReveal;
