'use client';

import { useEffect } from 'react';

interface Props {
  page: string;
}

export default function PageviewTracker({ page }: Props) {
  useEffect(() => {
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page,
        device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        referrer: document.referrer || '',
      }),
    });
  }, [page]);

  return null;
}
