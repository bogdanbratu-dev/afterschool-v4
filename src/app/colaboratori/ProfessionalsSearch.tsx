'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ProfessionalCard from '@/components/ProfessionalCard';
import { PROFESSIONAL_CATEGORY_LABELS, PROFESSIONAL_CATEGORY_ORDER, PROFESSIONAL_GROUPS, PROFESSIONAL_GROUP_LABELS, PROFESSIONAL_GROUP_ORDER, type ProfessionalCategory, type ProfessionalGroup } from '@/lib/professionals';

interface ProfessionalData {
  id: number;
  name: string;
  category: ProfessionalCategory;
  kind?: 'independent' | 'institutie';
  address: string | null;
  sector: number | null;
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
  online_available?: number;
  home_service?: number;
  is_premium: number;
  is_featured?: number;
  contacts_hidden: number;
  rating?: number | null;
  reviews_count?: number | null;
  maps_url?: string | null;
}

interface Props {
  initialCount: number;
  initialCategory?: ProfessionalCategory;
  lockCategory?: boolean;
  initialGroup?: ProfessionalGroup;
  lockGroup?: boolean;
  restrictCategories?: string[];
}

export default function ProfessionalsSearch({ initialCount, initialCategory, lockCategory, initialGroup, lockGroup, restrictCategories }: Props) {
  const searchParams = useSearchParams();
  const [professionals, setProfessionals] = useState<ProfessionalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessMode, setBusinessMode] = useState(false);
  const [search, setSearch] = useState(searchParams.get('name') || '');
  const [activeSearch, setActiveSearch] = useState(searchParams.get('name') || '');
  const [sector, setSector] = useState(searchParams.get('sector') || '');
  const [category, setCategory] = useState<string>(initialCategory || searchParams.get('category') || '');
  const [group, setGroup] = useState<string>(initialGroup || searchParams.get('group') || '');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setBusinessMode(d.business_mode));
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/colaboratori', device: window.innerWidth < 768 ? 'mobile' : 'desktop', referrer: document.referrer || '' }),
    });
  }, []);

  const fetchProfessionals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeSearch) params.set('name', activeSearch);
    if (sector) params.set('sector', sector);
    if (category) params.set('category', category);
    if (group) params.set('group', group);
    try {
      const res = await fetch(`/api/professionals?${params.toString()}`);
      setProfessionals(await res.json());
    } catch {}
    setLoading(false);
  }, [activeSearch, sector, category, group]);

  useEffect(() => { fetchProfessionals(); }, [fetchProfessionals]);

  const clearSearch = () => { setSearch(''); setActiveSearch(''); };

  // Categoriile afisate: daca un grup e selectat, doar categoriile lui; altfel toate (sau restrictionate)
  const baseCategories = restrictCategories
    ? PROFESSIONAL_CATEGORY_ORDER.filter(c => restrictCategories.includes(c))
    : PROFESSIONAL_CATEGORY_ORDER;
  const visibleCategories = group
    ? baseCategories.filter(c => (PROFESSIONAL_GROUPS[group as ProfessionalGroup] as string[]).includes(c))
    : baseCategories;

  const selectGroup = (g: string) => {
    setGroup(g);
    // daca categoria curenta nu apartine noului grup, reset
    if (g && category && !(PROFESSIONAL_GROUPS[g as ProfessionalGroup] as string[]).includes(category)) {
      setCategory('');
    }
  };

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
              placeholder="Nume colaborator sau zona..."
              className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-card)] text-[var(--color-text-main)] rounded-xl shadow-sm text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-400"
            />
          </div>
          <button onClick={() => setActiveSearch(search)} className="px-5 py-3.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl shadow-sm font-medium text-sm transition-colors">Cauta</button>
        </div>
      </div>

      {/* Group filter (axa principala) */}
      {!lockGroup && (
      <div className="max-w-4xl mx-auto px-4 pb-3">
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => selectGroup('')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${group === '' ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>Toate</button>
          {PROFESSIONAL_GROUP_ORDER.map(g => (
            <button key={g} onClick={() => selectGroup(g)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${group === g ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>{PROFESSIONAL_GROUP_LABELS[g]}</button>
          ))}
        </div>
      </div>
      )}

      {/* Category filters */}
      {!lockCategory && (
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => setCategory('')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${category === '' ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>Toate</button>
            {visibleCategories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>{PROFESSIONAL_CATEGORY_LABELS[cat]}</button>
            ))}
          </div>
        </div>
      )}

      {/* Sector filters */}
      <div className="max-w-4xl mx-auto px-4 pb-6">
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setSector('')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${sector === '' ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>Toate sectoarele</button>
          {['1','2','3','4','5','6'].map(s => (
            <button key={s} onClick={() => setSector(s)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${sector === s ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>Sector {s}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="min-w-0">
            {activeSearch && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-text-light)] flex-wrap mb-1">
                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full truncate max-w-[200px] sm:max-w-none">{activeSearch}</span>
                <button onClick={clearSearch} className="text-[var(--color-danger)] text-xs flex-shrink-0">✕ Sterge</button>
              </div>
            )}
            <p className="text-sm text-[var(--color-text-light)]">
              <span className="font-semibold text-[var(--color-text-main)]">{loading ? initialCount : professionals.length}</span> colaboratori
              {group && ` · ${PROFESSIONAL_GROUP_LABELS[group as ProfessionalGroup]}`}
              {category && ` · ${PROFESSIONAL_CATEGORY_LABELS[category as ProfessionalCategory]}`}
              {sector && ` · Sector ${sector}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-[var(--color-text-light)]">Se incarca...</span>
          </div>
        ) : professionals.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">👨‍🏫</p>
            <h3 className="text-base sm:text-lg font-medium text-[var(--color-text-main)]">Niciun colaborator gasit</h3>
            <p className="text-sm text-[var(--color-text-light)] mt-1">Incearca o alta cautare sau revino curand</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {professionals.map((p) => (
              <ProfessionalCard key={p.id} data={p} businessMode={businessMode} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
