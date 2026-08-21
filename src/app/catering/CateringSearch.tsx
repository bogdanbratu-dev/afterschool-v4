'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import CatererCard from '@/components/CatererCard';

interface CatererData {
  id: number;
  name: string;
  address: string;
  sector: number;
  coverage_area: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook_url: string | null;
  price_min: number | null;
  price_max: number | null;
  description: string | null;
  editorial_summary: string | null;
  photo_urls: string | null;
  availability: 'available' | 'full' | 'unknown';
  is_premium: number;
  is_featured?: number;
  contacts_hidden: number;
  rating?: number | null;
  reviews_count?: number | null;
  maps_url?: string | null;
}

export default function CateringSearch({ initialCount }: { initialCount: number }) {
  const searchParams = useSearchParams();
  const [caterers, setCaterers] = useState<CatererData[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessMode, setBusinessMode] = useState(false);
  const [search, setSearch] = useState(searchParams.get('name') || '');
  const [activeSearch, setActiveSearch] = useState(searchParams.get('name') || '');
  const [sector, setSector] = useState(searchParams.get('sector') || '');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setBusinessMode(d.business_mode));
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/catering', device: window.innerWidth < 768 ? 'mobile' : 'desktop', referrer: document.referrer || '' }),
    });
  }, []);

  const fetchCaterers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeSearch) params.set('name', activeSearch);
    if (sector) params.set('sector', sector);
    try {
      const res = await fetch(`/api/caterers?${params.toString()}`);
      setCaterers(await res.json());
    } catch {}
    setLoading(false);
  }, [activeSearch, sector]);

  useEffect(() => { fetchCaterers(); }, [fetchCaterers]);

  const clearSearch = () => { setSearch(''); setActiveSearch(''); };

  return (
    <>
      {/* Search bar */}
      <div className="max-w-2xl mx-auto mb-5 px-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setActiveSearch(search)}
              placeholder="Nume firma sau zona deservita..."
              className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-card)] text-[var(--color-text-main)] rounded-xl shadow-sm text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder:text-gray-400"
            />
          </div>
          <button onClick={() => setActiveSearch(search)} className="px-5 py-3.5 bg-teal-900 hover:bg-teal-950 text-white rounded-xl shadow-sm font-medium text-sm transition-colors">Cauta</button>
        </div>
      </div>

      {/* Sector filters */}
      <div className="max-w-4xl mx-auto px-4 pb-6">
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setSector('')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${sector === '' ? 'bg-[var(--color-card)] text-teal-700' : 'bg-teal-700/50 hover:bg-teal-700 text-white'}`}>Toate sectoarele</button>
          {['1','2','3','4','5','6'].map(s => (
            <button key={s} onClick={() => setSector(s)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${sector === s ? 'bg-[var(--color-card)] text-teal-700' : 'bg-teal-700/50 hover:bg-teal-700 text-white'}`}>Sector {s}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="min-w-0">
            {activeSearch && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-text-light)] flex-wrap mb-1">
                <span className="font-semibold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full truncate max-w-[200px] sm:max-w-none">{activeSearch}</span>
                <button onClick={clearSearch} className="text-[var(--color-danger)] text-xs flex-shrink-0">✕ Sterge</button>
              </div>
            )}
            <p className="text-sm text-[var(--color-text-light)]">
              <span className="font-semibold text-[var(--color-text-main)]">{loading ? initialCount : caterers.length}</span> furnizori de catering
              {sector && ` · Sector ${sector}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-[var(--color-text-light)]">Se încarcă...</span>
          </div>
        ) : caterers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🍽️</p>
            <h3 className="text-base sm:text-lg font-medium text-[var(--color-text-main)]">Niciun furnizor găsit</h3>
            <p className="text-sm text-[var(--color-text-light)] mt-1">Încearcă o altă căutare sau revino curând</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {caterers.map((c) => (
              <CatererCard key={c.id} data={c} businessMode={businessMode} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
