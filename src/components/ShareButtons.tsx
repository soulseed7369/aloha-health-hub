import { useState } from 'react';
import { Facebook, Instagram, Link2, Check, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SITE_URL } from '@/lib/siteConfig';

/** WhatsApp icon — not in lucide-react */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface ShareButtonsProps {
  /** The URL to share. Defaults to current page. */
  url?: string;
  /** Text to include with the share (used by WhatsApp / X). */
  title: string;
  /** Compact row layout vs spread */
  compact?: boolean;
  /** Show "Share:" label before the icons (default true) */
  showLabel?: boolean;
  className?: string;
}

export function ShareButtons({ url, title, compact, showLabel = true, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || `${SITE_URL}${window.location.pathname}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const openFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'width=600,height=400');
  };

  const openX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, '_blank', 'width=600,height=400');
  };

  const openInstagram = async () => {
    // Instagram doesn't support direct URL sharing — copy link then open IG
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied! Opening Instagram…');
      window.open('https://www.instagram.com/', '_blank');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, '_blank');
  };

  const btnClass = compact
    ? 'h-8 w-8 p-0 rounded-full'
    : 'h-9 w-9 p-0 rounded-full';

  const iconClass = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground mr-0.5">Share:</span>
      )}

      <Button
        variant="outline"
        size="icon"
        className={`${btnClass} text-[#1877F2] border-[#1877F2]/20 hover:bg-[#1877F2]/10 hover:text-[#1877F2]`}
        onClick={openFacebook}
        title="Share on Facebook"
      >
        <Facebook className={iconClass} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={`${btnClass} text-[#000000] border-border hover:bg-muted hover:text-foreground`}
        onClick={openX}
        title="Share on X (Twitter)"
      >
        <Twitter className={iconClass} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={`${btnClass} text-[#E4405F] border-[#E4405F]/20 hover:bg-[#E4405F]/10 hover:text-[#E4405F]`}
        onClick={openInstagram}
        title="Share on Instagram"
      >
        <Instagram className={iconClass} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={`${btnClass} text-[#25D366] border-[#25D366]/20 hover:bg-[#25D366]/10 hover:text-[#25D366]`}
        onClick={openWhatsApp}
        title="Share on WhatsApp"
      >
        <WhatsAppIcon className={iconClass} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={`${btnClass} ${copied ? 'text-emerald-600 border-emerald-300 bg-emerald-50' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={copyLink}
        title="Copy link"
      >
        {copied ? <Check className={iconClass} /> : <Link2 className={iconClass} />}
      </Button>
    </div>
  );
}
