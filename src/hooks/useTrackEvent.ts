import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Generate a stable session hash for deduplication (no PII)
function getSessionHash(): string {
  let hash = sessionStorage.getItem('aloha_session_hash');
  if (!hash) {
    hash = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('aloha_session_hash', hash);
  }
  return hash;
}

async function trackEvent(payload: Record<string, unknown>) {
  if (!supabase) return;
  try {
    await supabase.functions.invoke('track-event', {
      body: payload,
      headers: {}, // No auth needed — edge function uses service role
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
}

/** Track a profile/center page view. Call once on mount. */
export function useTrackView(listingId: string | undefined, listingType: 'practitioner' | 'center', referrer?: string) {
  const tracked = useRef(false);
  useEffect(() => {
    if (!listingId || tracked.current) return;
    tracked.current = true;
    trackEvent({
      event_type: 'view',
      listing_id: listingId,
      listing_type: listingType,
      referrer: referrer || document.referrer || 'direct',
      session_hash: getSessionHash(),
    });
  }, [listingId, listingType, referrer]);
}

/** Returns a callback to track contact CTA clicks. */
export function useTrackClick(listingId: string | undefined, listingType: 'practitioner' | 'center') {
  return useCallback((clickType: 'phone' | 'email' | 'website' | 'booking' | 'discovery_call') => {
    if (!listingId) return;
    trackEvent({
      event_type: 'click',
      listing_id: listingId,
      listing_type: listingType,
      click_type: clickType,
    });
  }, [listingId, listingType]);
}

/** Track batch impressions (for directory/homepage). */
export function trackImpressions(items: Array<{ listing_id: string; listing_type: string; impression_type: string }>) {
  if (items.length === 0) return;
  trackEvent({ event_type: 'impressions', items });
}
