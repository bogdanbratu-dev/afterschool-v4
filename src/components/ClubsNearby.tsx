'use client';

import { useState, useEffect, useCallback } from 'react';
import ClubCard from '@/components/ClubCard';
import type { ClubCategory } from '@/lib/clubs';
import { CLUB_CATEGORY_LABELS } from '@/lib/clubs';

const ALL_CATEGORIES = Object.keys(CLUB_CATEGORY_LABELS) as ClubCategory[];

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

interface ClubData {
  id: number;
  name: string;
  address: string;
  sector: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  price_min: number | null;
  price_max: number | null;
  schedule: string | null;
  age_min: number | null;
  age_max: number | null;
  description: string | null;
  category: ClubCategory;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  contacts_hidden: number;
  distance?: number;
}

interface Props {
  lat: number;
  lng: number;
  currentId: number;
  defaultCategory?: ClubCategory;
}

export default function ClubsNearby({ lat, lng, currentId, defaultCategory }: Props) {
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const [loading, setLoading] = useState(false);
  const [businessMode, setBusinessMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ClubCategory | ''>(defaultCategory ?? '');
  const [radiusKm, setRadiusKm] = useState('3');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setBusinessMode(d.business_mode));
  }, []);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('lat', lat.toString());
    params.set('lng', lng.toString());
    if (selectedCategory) params.set('category', selectedCategory);
    if (radiusKm) params.set('radiusKm', radiusKm);

    try {
      const res = await fetch(`/api/clubs?${params.toString()}`);
      const data: ClubData[] = await res.json();
      setClubs(data.filter(c => c.id !== currentId));
    } catch {}
    setLoading(false);
  }, [lat, lng, currentId, selectedCategory, radiusKm]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  return (
    <div className="mt-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[var(--color-primary)]">Activități în zonă</h2>
        <p className="text-sm text-[var(--color-text-light)] mt-0.5">
          <span className="font-semibold text-[var(--color-text-main)]">{clubs.length}</span> activități în raza de {radiusKm} km
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-4 mb-4 space-y-3">
        {/* Radius */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-[var(--color-text-light)]">Raza:</span>
          {['1', '2', '3', '5', '10', '15', '20'].map(km => (
            <button
              key={km}
              onClick={() => setRadiusKm(km)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                radiusKm === km
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {km} km
            </button>
          ))}
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === ''
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toate
          </button>
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {CATEGORY_ICONS[cat]} {CLUB_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-[var(--color-text-light)]">Se incarca...</span>
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🎯</p>
          <p className="text-sm text-[var(--color-text-light)]">Nicio activitate gasita in zona</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {clubs.map((club, index) => (
            <ClubCard
              key={club.id}
              data={club}
              rank={index + 1}
              businessMode={businessMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
