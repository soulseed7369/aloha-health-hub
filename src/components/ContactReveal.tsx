import { useState } from 'react';
import { Phone, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface Props {
  listingId: string;
  listingType: 'practitioner' | 'center';
  type: 'phone' | 'email';
  className?: string;
}

export function ContactReveal({ listingId, listingType, type, className }: Props) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notAvailable, setNotAvailable] = useState(false);

  const reveal = async () => {
    if (!supabase) return;
    setLoading(true);
    setNotAvailable(false);
    try {
      const table = listingType === 'center' ? 'centers' : 'practitioners';
      const field = type === 'phone' ? 'phone' : 'email';

      const { data, error } = await supabase
        .from(table)
        .select(field)
        .eq('id', listingId)
        .eq('status', 'published')
        .single();

      if (error || !data) {
        setNotAvailable(true);
        return;
      }

      const val = (data as Record<string, string | null>)[field];
      if (val) {
        setValue(val);
      } else {
        setNotAvailable(true);
      }
    } catch {
      setNotAvailable(true);
    } finally {
      setLoading(false);
    }
  };

  if (value) {
    const href = type === 'phone' ? `tel:${value}` : `mailto:${value}`;
    const Icon = type === 'phone' ? Phone : Mail;
    return (
      <a href={href} className={`flex w-full items-center gap-2 font-medium text-primary hover:text-primary/80 transition-colors ${className ?? ''}`}>
        <Icon className="h-4 w-4 flex-shrink-0" /> {value}
      </a>
    );
  }

  if (notAvailable) {
    const Icon = type === 'phone' ? Phone : Mail;
    return (
      <div className={`flex w-full items-center gap-2 text-sm text-muted-foreground ${className ?? ''}`}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>Not available</span>
      </div>
    );
  }

  const Icon = type === 'phone' ? Phone : Mail;
  const label = type === 'phone' ? 'Show Phone' : 'Show Email';

  return (
    <Button variant="ghost" size="sm" onClick={reveal} disabled={loading}
      className={`w-full justify-start gap-2 text-primary ${className ?? ''}`}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </Button>
  );
}
