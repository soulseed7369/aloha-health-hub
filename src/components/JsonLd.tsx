import { useEffect } from 'react';

interface JsonLdProps {
  /** Unique id for the <script> tag — prevents duplicates on re-render. */
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

/**
 * Injects a <script type="application/ld+json"> into <head>.
 * Cleans up on unmount so schemas don't stack across navigations.
 */
export function JsonLd({ id, data }: JsonLdProps) {
  useEffect(() => {
    // Remove any existing script with the same id first
    document.getElementById(id)?.remove();

    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      document.getElementById(id)?.remove();
    };
  // Stringify so the effect only re-runs when the actual content changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, JSON.stringify(data)]);

  return null;
}
