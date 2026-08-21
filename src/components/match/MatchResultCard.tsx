'use client';

import { useEffect, useState } from 'react';
import { formatDistance } from '@/lib/distance';
import { toSlug, cleanAddressDisplay } from '@/lib/slug';
import LeadModal from '@/components/LeadModal';
import type { CriterionResult } from '@/lib/matchScoring';

function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    function step(ts: number) {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      setValue(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function ScoreRing({ score }: { score: number }) {
  const animated = useCountUp(score);
  const color = score >= 80 ? 'var(--color-green)' : score >= 55 ? 'var(--color-star)' : 'var(--color-accent)';
  return (
    <div
      className="relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, var(--color-border) 0deg)` }}
    >
      <div className="absolute inset-[3px] rounded-full bg-[var(--color-card)] flex items-center justify-center">
        <span className="font-display font-extrabold text-base sm:text-lg text-[var(--color-text-main)]">{animated}%</span>
      </div>
    </div>
  );
}

interface MatchListing {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  is_premium: number;
  is_featured: number;
  price_min: number | null;
  price_max: number | null;
}

interface Props {
  listing: MatchListing;
  listingType: 'afterschool' | 'kindergarten';
  score: number;
  breakdown: CriterionResult[];
  recommendReason: string;
  rank: number;
  matchContext: unknown;
}

export default function MatchResultCard({ listing, listingType, score, breakdown, recommendReason, rank, matchContext }: Props) {
  const detailHref = listingType === 'kindergarten' ? `/gradinite/${toSlug(listing.name, listing.id)}` : `/afterschool/${toSlug(listing.name, listing.id)}`;

  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <ScoreRing score={score} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {rank === 1 && (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-400 text-white px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm">
                🥇 Cea mai bună potrivire
              </span>
            )}
            {listing.is_featured === 1 && (
              <span className="inline-flex items-center gap-1 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">✦ Recomandat</span>
            )}
            {listing.is_premium === 1 && (
              <span className="inline-flex items-center gap-1 bg-amber-400 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">★ Premium</span>
            )}
          </div>
          <h3 className="font-display font-bold text-base sm:text-lg text-[var(--color-text-main)] leading-tight mt-1">
            <a href={detailHref} className="hover:text-[var(--color-primary)] transition-colors">{listing.name}</a>
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-text-light)] mt-0.5 break-words">{cleanAddressDisplay(listing.address)}</p>
          {listing.price_min != null && (
            <p className="text-xs sm:text-sm text-[var(--color-text-light)] mt-0.5">
              {listing.price_min === listing.price_max ? `${listing.price_min} lei/lună` : `${listing.price_min}-${listing.price_max} lei/lună`}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-[var(--color-text-main)] bg-blue-50 rounded-xl px-3 py-2.5 mt-3">💡 {recommendReason}</p>

      <div className="mt-3 space-y-1.5">
        {breakdown.map((b) => (
          <div key={b.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 text-[var(--color-text-main)] min-w-0">
              <span>{b.passed ? '✅' : '🟡'}</span>
              <span className="truncate">{b.detail}</span>
            </span>
            <span className="flex-shrink-0 text-xs font-semibold text-[var(--color-text-light)]">{b.points}/{b.maxPoints}p</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--color-border)]">
        <LeadModal listingType={listingType} listingId={listing.id} listingName={listing.name} source="match" matchContext={matchContext} />
        <a href={detailHref} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
          Vezi profilul complet →
        </a>
      </div>
    </div>
  );
}
