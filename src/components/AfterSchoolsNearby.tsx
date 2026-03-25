'use client';

import { useState, useEffect, useCallback } from 'react';
import FilterPanel from '@/components/FilterPanel';
import AfterSchoolCard from '@/components/AfterSchoolCard';

interface AfterSchoolData {
  id: number;
  name: string;
  address: string;
  sector: number;
  lat: number;
  lng: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  price_min: number | null;
  price_max: number | null;
  pickup_time: string | null;
  end_time: string | null;
  age_min: number | null;
  age_max: number | null;
  description: string | null;
  activities: string | null;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  contacts_hidden: number;
  distance?: number;
}

interface Props {
  lat: number;
  lng: number;
  currentId: number;
}

export default function AfterSchoolsNearby({ lat, lng, currentId }: Props) {
  const [afterschools, setAfterschools] = useState<AfterSchoolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [businessMode, setBusinessMode] = useState(false);
  const [filters, setFilters] = useState({
    priceMax: '',
    pickupTime: '',
    endTimeMin: '',
    activities: [] as string[],
    sector: '',
    radiusKm: '3',
    onlyAvailable: false,
  });

  const searchLocation = { lat, lng, label: '' };

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setBusinessMode(d.business_mode));
  }, []);

  const fetchAfterschools = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('lat', lat.toString());
    params.set('lng', lng.toString());
    if (filters.priceMax) params.set('priceMax', filters.priceMax);
    if (filters.pickupTime) params.set('pickupTime', filters.pickupTime);
    if (filters.endTimeMin) params.set('endTimeMin', filters.endTimeMin);
    if (filters.activities.length > 0) params.set('activities', filters.activities.join(','));
    if (filters.sector) params.set('sector', filters.sector);

    try {
      const res = await fetch(`/api/afterschools?${params.toString()}`);
      let data: AfterSchoolData[] = await res.json();
      if (filters.radiusKm) {
        const maxDist = parseFloat(filters.radiusKm);
        data = data.filter(as => (as.distance ?? Infinity) <= maxDist);
      }
      if (filters.onlyAvailable) {
        data = data.filter(as => as.availability === 'available');
      }
      data = data.filter(as => as.id !== currentId);
      setAfterschools(data);
    } catch (err) {
      console.error('Error fetching afterschools:', err);
    }
    setLoading(false);
  }, [lat, lng, currentId, filters]);

  useEffect(() => {
    fetchAfterschools();
  }, [fetchAfterschools]);

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-primary)]">After school-uri în zonă</h2>
          <p className="text-sm text-[var(--color-text-light)] mt-0.5">
            <span className="font-semibold text-[var(--color-text-main)]">{afterschools.length}</span> rezultate în raza de {filters.radiusKm} km
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-semibold shadow-md transition-all md:hidden"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtre
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar desktop */}
        <aside className="hidden md:block w-72 flex-shrink-0">
          <div className="sticky top-4">
            <FilterPanel filters={filters} onFilterChange={setFilters} hasLocation={true} />
          </div>
        </aside>

        {/* Mobile drawer */}
        {showFilters && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-sm bg-[var(--color-bg)] overflow-y-auto">
              <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg)] z-10">
                <h3 className="font-semibold text-base">Filtre</h3>
                <button onClick={() => setShowFilters(false)} className="p-1 text-[var(--color-text-light)]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <FilterPanel filters={filters} onFilterChange={setFilters} hasLocation={true} />
                <button
                  onClick={() => setShowFilters(false)}
                  className="mt-4 w-full py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium text-sm"
                >
                  Aplica filtrele
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-[var(--color-text-light)]">Se incarca...</span>
            </div>
          ) : afterschools.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-14 h-14 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-[var(--color-text-light)]">Niciun after school gasit in zona</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {afterschools.map((as, index) => (
                <AfterSchoolCard
                  key={as.id}
                  data={as}
                  rank={index + 1}
                  businessMode={businessMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
