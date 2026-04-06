'use client';

import dynamic from 'next/dynamic';

const Concierge = dynamic(() => import('@/views/Concierge'), {
  ssr: false,
});

export default function ConciergeClient() {
  return <Concierge />;
}
