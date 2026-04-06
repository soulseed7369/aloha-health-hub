'use client';

import dynamic from 'next/dynamic';

const ListYourPractice = dynamic(() => import('@/views/ListYourPractice'), {
  ssr: false,
});

export default function ListYourPracticeClient() {
  return <ListYourPractice />;
}
