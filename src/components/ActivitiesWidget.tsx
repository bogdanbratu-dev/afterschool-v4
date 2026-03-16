'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CLUB_CATEGORY_LABELS, type ClubCategory } from '@/lib/clubs';

const CATEGORY_ICONS: Record<ClubCategory, string> = {
  inot: '🏊',
  fotbal: '⚽',
  dansuri: '💃',
  arte_martiale: '🥋',
  gimnastica: '🤸',
  limbi_straine: '🌍',
  robotica: '🤖',
  muzica: '🎵',
  arte_creative: '🎨',
};

const ALL_CATEGORIES = Object.keys(CLUB_CATEGORY_LABELS) as ClubCategory[];

interface Props {
  lat: number;
  lng: number;
  label: string;
}

export default function ActivitiesWidget({ lat, lng, label }: Props) {
  const [counts, setCounts] = useState<Partial<Record<ClubCategory, number>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clubs/counts?lat=${lat}&lng=${lng}&radiusKm=5`)
      .then(r => r.json())
      .then(data => { setCounts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lat, lng]);

  return (
    <div className="bg-white border-b border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <p className="text-sm font-medium text-[var(--color-text-light)] mb-3">
          Și alte activități pentru copilul tău în zonă:
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map(cat => {
            const count = counts[cat] ?? 0;
            const hasResults = !loading && count > 0;
            const params = new URLSearchParams({
              category: cat,
              lat: lat.toString(),
              lng: lng.toString(),
              label,
            });
            return (
              <Link
                key={cat}
                href={`/activitati?${params.toString()}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  hasResults
                    ? 'border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700'
                    : 'border-gray-200 bg-gray-50 text-gray-400 opacity-60'
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span className="font-medium">{CLUB_CATEGORY_LABELS[cat]}</span>
                <span className="text-xs">
                  {loading ? '...' : `(${count})`}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
