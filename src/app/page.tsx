'use client';

import { useState, useEffect, useCallback } from 'react';
import SearchBar from '@/components/SearchBar';
import FilterPanel from '@/components/FilterPanel';
import AfterSchoolCard from '@/components/AfterSchoolCard';
import ActivitiesWidget from '@/components/ActivitiesWidget';

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

export default function Home() {
  const [afterschools, setAfterschools] = useState<AfterSchoolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [filters, setFilters] = useState({
    priceMax: '',
    pickupTime: '',
    endTimeMin: '',
    activities: [] as string[],
    sector: '',
    radiusKm: '',
    onlyAvailable: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [businessMode, setBusinessMode] = useState(false);

  const fetchAfterschools = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();

    if (searchLocation) {
      params.set('lat', searchLocation.lat.toString());
      params.set('lng', searchLocation.lng.toString());
    }
    if (filters.priceMax) params.set('priceMax', filters.priceMax);
    if (filters.pickupTime) params.set('pickupTime', filters.pickupTime);
    if (filters.endTimeMin) params.set('endTimeMin', filters.endTimeMin);
    if (filters.activities.length > 0) params.set('activities', filters.activities.join(','));
    if (filters.sector) params.set('sector', filters.sector);

    try {
      const res = await fetch(`/api/afterschools?${params.toString()}`);
      let data: AfterSchoolData[] = await res.json();
      if (searchLocation && filters.radiusKm) {
        const maxDist = parseFloat(filters.radiusKm);
        data = data.filter(as => (as.distance ?? Infinity) <= maxDist);
      }
      if (filters.onlyAvailable) {
        data = data.filter(as => as.availability === 'available');
      }
      setAfterschools(data);
    } catch (err) {
      console.error('Error fetching afterschools:', err);
    }
    setLoading(false);
  }, [searchLocation, filters]);

  useEffect(() => {
    fetchAfterschools();
  }, [fetchAfterschools]);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setBusinessMode(d.business_mode));
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/', device: window.innerWidth < 768 ? 'mobile' : 'desktop' }),
    });
  }, []);

  const handleSearch = (lat: number, lng: number, label: string) => {
    setSearchLocation({ lat, lng, label });
    fetch('/api/analytics/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: label }),
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-primary)]">
              AfterSchool Finder
            </h1>
            <p className="text-sm text-[var(--color-text-light)]">Gaseste after school-ul perfect pentru copilul tau</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/activitati" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
              <span className="hidden sm:inline-flex gap-1">⚽💃🏊🥋</span>
              <span>Activități</span>
            </a>
            <a href="/admin" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-primary)] transition-colors">
              Admin
            </a>
          </div>
        </div>
      </header>

      {/* Hero / Search */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-7 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto text-center mb-5 sm:mb-8">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-3">
            Cauta after school-ul ideal in Bucuresti
          </h2>
          <p className="text-blue-100 text-sm sm:text-lg max-w-2xl mx-auto hidden sm:block">
            Introdu numarul scolii copilului tau sau o adresa si gaseste cele mai apropiate after school-uri,
            ordonate dupa distanta
          </p>
        </div>
        <SearchBar onSearch={handleSearch} />
      </section>

      {/* Activities Promo Banner */}
      {!searchLocation && (
        <section className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
          <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-purple-800">Cauti si activitati extracurriculare?</p>
              <p className="text-xs text-purple-600 mt-0.5">Inot, fotbal, dans, muzica si multe altele aproape de tine</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {(['🏊','⚽','💃','🥋','🤸','🌍','🤖','🎵','🎨'] as const).map((icon, i) => (
                <span key={i} className="text-xl">{icon}</span>
              ))}
            </div>
            <a
              href="/activitati"
              className="flex-shrink-0 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              Vezi activitati →
            </a>
          </div>
        </section>
      )}

      {/* Activities Widget */}
      {searchLocation && (
        <ActivitiesWidget
          lat={searchLocation.lat}
          lng={searchLocation.lng}
          label={searchLocation.label}
        />
      )}

      {/* Results */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-safe-bottom">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <div className="min-w-0">
            {searchLocation && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-text-light)] flex-wrap">
                <span className="font-semibold text-[var(--color-primary)] bg-blue-50 px-2.5 py-0.5 rounded-full truncate max-w-[180px] sm:max-w-none">
                  {searchLocation.label}
                </span>
                <button
                  onClick={() => setSearchLocation(null)}
                  className="text-[var(--color-danger)] text-xs flex-shrink-0"
                >
                  ✕ Sterge
                </button>
              </div>
            )}
            <p className="text-xs sm:text-sm text-[var(--color-text-light)] mt-0.5">
              <span className="font-semibold text-[var(--color-text-main)]">{afterschools.length}</span> after school-uri
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors md:hidden flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtre
            {(filters.priceMax || filters.pickupTime || filters.endTimeMin || filters.activities.length > 0 || filters.sector || filters.radiusKm || filters.onlyAvailable) && (
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            )}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden md:block w-72 flex-shrink-0">
            <div className="sticky top-4">
              <FilterPanel filters={filters} onFilterChange={setFilters} hasLocation={!!searchLocation} />
            </div>
          </aside>

          {/* Mobile Filters — drawer de jos pe mobil */}
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
                  <FilterPanel filters={filters} onFilterChange={(f) => { setFilters(f); }} hasLocation={!!searchLocation} />
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

          {/* Results List */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-[var(--color-text-light)]">Se incarca...</span>
              </div>
            ) : afterschools.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-14 h-14 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-base sm:text-lg font-medium text-[var(--color-text-main)]">Niciun rezultat gasit</h3>
                <p className="text-sm text-[var(--color-text-light)] mt-1">Incearca sa modifici filtrele sau cauta o alta locatie</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {afterschools.map((as, index) => (
                  <AfterSchoolCard
                    key={as.id}
                    data={as}
                    rank={searchLocation ? index + 1 : undefined}
                    businessMode={businessMode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[var(--color-border)] mt-8 sm:mt-12 py-5">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs sm:text-sm text-[var(--color-text-light)]">
          AfterSchool Finder - Platforma pentru parinti din Bucuresti
        </div>
      </footer>
    </div>
  );
}
