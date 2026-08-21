'use client';

import { useState } from 'react';
import { formatDistance } from '@/lib/distance';
import { toSlug, cleanAddressDisplay } from '@/lib/slug';
import type { HardFilterFailure } from '@/lib/matchScoring';

interface NearMissListing {
  id: number;
  name: string;
  address: string;
}

interface NearMissItem {
  listing: NearMissListing;
  score: number;
  distanceKm: number;
  failedHardFilters: HardFilterFailure[];
}

interface Props {
  items: NearMissItem[];
  listingType: 'afterschool' | 'kindergarten';
}

export default function NearMissSection({ items, listingType }: Props) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const detailBase = listingType === 'kindergarten' ? '/gradinite' : '/afterschool';

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-[var(--color-text-main)]">
          🟡 Aproape de potrivire ({items.length}) — nu îndeplinesc un criteriu obligatoriu
        </span>
        <svg
          className={`w-5 h-5 text-[var(--color-text-light)] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item.listing.id} className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-display font-bold text-sm sm:text-base text-[var(--color-text-main)]">
                    <a href={`${detailBase}/${toSlug(item.listing.name, item.listing.id)}`} className="hover:text-[var(--color-primary)] transition-colors">
                      {item.listing.name}
                    </a>
                  </h4>
                  <p className="text-xs text-[var(--color-text-light)] mt-0.5">{cleanAddressDisplay(item.listing.address)} · {formatDistance(item.distanceKm)}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-semibold text-[var(--color-text-light)] bg-[var(--color-bg)] px-2 py-1 rounded-full">
                  {item.score}% potrivire
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {item.failedHardFilters.map((f) => (
                  <div key={f.key} className="flex items-start gap-1.5 text-sm text-red-600">
                    <span>❌</span>
                    <span>{f.label}: {f.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
