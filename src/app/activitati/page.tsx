'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ClubCard from '@/components/ClubCard';
import type { ClubCategory } from '@/lib/clubs';
import { CLUB_CATEGORY_LABELS } from '@/lib/clubs';

const VALID_CATEGORIES = Object.keys(CLUB_CATEGORY_LABELS) as ClubCategory[];

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

const KNOWN_LOCATIONS: Record<string, [number, number]> = {
  'piata victoriei': [44.4528, 26.0852],
  'piata unirii': [44.4268, 26.1025],
  'piata romana': [44.4466, 26.0970],
  'universitate': [44.4358, 26.1003],
  'tineretului': [44.4096, 26.1030],
  'dristor': [44.4223, 26.1280],
  'titan': [44.4147, 26.1454],
  'drumul taberei': [44.4219, 26.0186],
  'militari': [44.4306, 26.0106],
  'crangasi': [44.4480, 26.0340],
  'obor': [44.4500, 26.1200],
  'pantelimon': [44.4410, 26.1480],
  'berceni': [44.3940, 26.1060],
  'rahova': [44.4110, 26.0710],
  'cotroceni': [44.4330, 26.0620],
  'floreasca': [44.4600, 26.0960],
  'dorobanti': [44.4520, 26.0900],
  'aviatorilor': [44.4560, 26.0850],
  'domenii': [44.4660, 26.0600],
  'pajura': [44.4730, 26.0670],
  'colentina': [44.4600, 26.1250],
  'iancului': [44.4400, 26.1200],
  'stefan cel mare': [44.4520, 26.1050],
  'mosilor': [44.4420, 26.1080],
  'grozavesti': [44.4380, 26.0580],
  'gara de nord': [44.4452, 26.0796],
  'herastrau': [44.4680, 26.0830],
  'baneasa': [44.4970, 26.0840],
  'pipera': [44.5040, 26.1020],
  'voluntari': [44.4900, 26.1700],
  'popesti': [44.3880, 26.1600],
  'otopeni': [44.5440, 26.0640],
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

const ALL_CATEGORIES = Object.keys(CLUB_CATEGORY_LABELS) as ClubCategory[];

function ActivitatiPageContent() {
  const searchParams = useSearchParams();
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const [loading, setLoading] = useState(false);

  const initCategory = (): ClubCategory | '' => {
    const cat = searchParams.get('category');
    return cat && VALID_CATEGORIES.includes(cat as ClubCategory) ? (cat as ClubCategory) : '';
  };

  const initLocation = () => {
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const label = searchParams.get('label') || '';
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng, label };
    }
    return null;
  };

  const [selectedCategory, setSelectedCategory] = useState<ClubCategory | ''>(initCategory);
  const [businessMode, setBusinessMode] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number; label: string } | null>(initLocation);
  const [addressInput, setAddressInput] = useState(searchParams.get('label') || '');
  const [radiusKm, setRadiusKm] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setBusinessMode(d.business_mode));
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/activitati', device: window.innerWidth < 768 ? 'mobile' : 'desktop' }),
    });
  }, []);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (searchLocation) {
      params.set('lat', searchLocation.lat.toString());
      params.set('lng', searchLocation.lng.toString());
      if (radiusKm) params.set('radiusKm', radiusKm);
    }
    try {
      const res = await fetch(`/api/clubs?${params.toString()}`);
      setClubs(await res.json());
    } catch {}
    setLoading(false);
  }, [selectedCategory, searchLocation, radiusKm]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const handleAddressSearch = () => {
    const normalized = addressInput.toLowerCase().trim();
    if (!normalized) return;
    for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
      if (normalized.includes(key)) {
        setSearchLocation({ lat: coords[0], lng: coords[1], label: addressInput });
        return;
      }
    }
    // Default centrul Bucurestiului daca adresa nu e recunoscuta
    setSearchLocation({ lat: 44.4268, lng: 26.1025, label: addressInput });
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-primary)]">Activități pentru Copii</h1>
            <p className="text-sm text-[var(--color-text-light)]">Sport, muzică, arte și multe altele în București</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">After School</span>
              <span className="sm:hidden">AfterSchool</span>
            </a>
            <a href="/admin" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-primary)] transition-colors">
              Admin
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-600 to-purple-800 text-white py-7 sm:py-10 px-4">
        <div className="max-w-6xl mx-auto text-center mb-5">
          <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-3">
            Gaseste activitatea perfecta pentru copilul tau
          </h2>
          <p className="text-purple-100 text-sm sm:text-base max-w-2xl mx-auto hidden sm:block">
            Introdu adresa sau zona ta si gaseste activitatile cele mai apropiate
          </p>
        </div>

        {/* Address Search */}
        <div className="max-w-2xl mx-auto mb-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                value={addressInput}
                onChange={e => setAddressInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddressSearch()}
                placeholder="Adresa sau zona (ex: Floreasca, Drumul Taberei...)"
                className="w-full pl-12 pr-4 py-3.5 bg-white text-gray-900 rounded-xl shadow-sm text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-300 placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={handleAddressSearch}
              className="px-5 py-3.5 bg-purple-900 hover:bg-purple-950 text-white rounded-xl shadow-sm font-medium text-sm transition-colors"
            >
              Cauta
            </button>
          </div>
        </div>

        {/* Radius Filter — doar cand e selectata o locatie */}
        {searchLocation && (
          <div className="max-w-2xl mx-auto mb-4">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-purple-200 text-xs font-medium">Raza:</span>
              {['', '1', '2', '3', '5', '10', '15', '20'].map(km => (
                <button
                  key={km}
                  onClick={() => setRadiusKm(km)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    radiusKm === km
                      ? 'bg-white text-purple-700'
                      : 'bg-purple-700/50 hover:bg-purple-700 text-white'
                  }`}
                >
                  {km ? `${km} km` : 'Oricare'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === ''
                  ? 'bg-white text-purple-700'
                  : 'bg-purple-700/50 hover:bg-purple-700 text-white'
              }`}
            >
              Toate
            </button>
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-white text-purple-700'
                    : 'bg-purple-700/50 hover:bg-purple-700 text-white'
                }`}
              >
                {CATEGORY_ICONS[cat]} {CLUB_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="min-w-0">
            {searchLocation && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-text-light)] flex-wrap mb-1">
                <span className="font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full truncate max-w-[200px] sm:max-w-none">
                  {searchLocation.label}
                </span>
                <button
                  onClick={() => { setSearchLocation(null); setAddressInput(''); }}
                  className="text-[var(--color-danger)] text-xs flex-shrink-0"
                >
                  ✕ Sterge
                </button>
              </div>
            )}
            <p className="text-sm text-[var(--color-text-light)]">
              <span className="font-semibold text-[var(--color-text-main)]">{clubs.length}</span> activități găsite
              {selectedCategory && ` · ${CLUB_CATEGORY_LABELS[selectedCategory]}`}
              {searchLocation && !radiusKm && ' · ordonate după distanță'}
              {searchLocation && radiusKm && ` · în raza de ${radiusKm} km`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-[var(--color-text-light)]">Se încarcă...</span>
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🎯</p>
            <h3 className="text-base sm:text-lg font-medium text-[var(--color-text-main)]">Nicio activitate găsită</h3>
            <p className="text-sm text-[var(--color-text-light)] mt-1">
              {selectedCategory ? 'Încearcă o altă categorie' : 'Nu există activități adăugate încă'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {clubs.map((club, index) => (
              <ClubCard
                key={club.id}
                data={club}
                rank={searchLocation ? index + 1 : undefined}
                businessMode={businessMode}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-[var(--color-border)] mt-8 py-5">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs sm:text-sm text-[var(--color-text-light)]">
          AfterSchool Finder - Activități pentru copii în București
        </div>
      </footer>
    </div>
  );
}

export default function ActivitatiPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ActivitatiPageContent />
    </Suspense>
  );
}
