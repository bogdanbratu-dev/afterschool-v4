'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import TutorCard from '@/components/TutorCard';
import { TUTOR_SUBJECT_LABELS, TUTOR_SUBJECT_ORDER, type TutorSubject } from '@/lib/tutors';

interface TutorData {
  id: number;
  name: string;
  subject: TutorSubject;
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
  distance?: number;
}

interface Props {
  initialCount: number;
  initialSubject?: TutorSubject;
  lockSubject?: boolean;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, Bucuresti, Romania`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ro`,
      { headers: { 'Accept-Language': 'ro', 'User-Agent': 'activkids.ro/1.0' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

export default function TutorsSearch({ initialCount, initialSubject, lockSubject }: Props) {
  const searchParams = useSearchParams();
  const [tutors, setTutors] = useState<TutorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessMode, setBusinessMode] = useState(false);
  const [search, setSearch] = useState(searchParams.get('name') || '');
  const [activeSearch, setActiveSearch] = useState(searchParams.get('name') || '');
  const [sector, setSector] = useState(searchParams.get('sector') || '');
  const [subject, setSubject] = useState<string>(initialSubject || searchParams.get('subject') || '');
  const [kind, setKind] = useState<string>(searchParams.get('kind') || '');
  const [addressInput, setAddressInput] = useState('');
  const [activeAddress, setActiveAddress] = useState('');
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setBusinessMode(d.business_mode));
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/meditatii', device: window.innerWidth < 768 ? 'mobile' : 'desktop', referrer: document.referrer || '' }),
    });
  }, []);

  const fetchTutors = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeSearch) params.set('name', activeSearch);
    if (sector) params.set('sector', sector);
    if (subject) params.set('subject', subject);
    if (kind) params.set('kind', kind);
    if (geoCoords) {
      params.set('lat', String(geoCoords.lat));
      params.set('lng', String(geoCoords.lng));
    }
    try {
      const res = await fetch(`/api/tutors?${params.toString()}`);
      setTutors(await res.json());
    } catch {}
    setLoading(false);
  }, [activeSearch, sector, subject, kind, geoCoords]);

  useEffect(() => { fetchTutors(); }, [fetchTutors]);

  const handleAddressSearch = async () => {
    if (!addressInput.trim()) {
      setGeoCoords(null);
      setActiveAddress('');
      return;
    }
    setGeocoding(true);
    const coords = await geocodeAddress(addressInput.trim());
    setGeocoding(false);
    if (coords) {
      setGeoCoords(coords);
      setActiveAddress(addressInput.trim());
      setSector('');
    } else {
      alert('Adresa nu a putut fi gasita. Incearca alt format (ex: Strada Mihai Eminescu 10).');
    }
  };

  const clearAddress = () => {
    setAddressInput('');
    setActiveAddress('');
    setGeoCoords(null);
  };

  const clearSearch = () => { setSearch(''); setActiveSearch(''); };

  return (
    <>
      {/* Address proximity search */}
      <div className="max-w-2xl mx-auto mb-3 px-4">
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
              placeholder="Adresa ta (ex: Soseaua Pantelimon 200)..."
              className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-card)] text-[var(--color-text-main)] rounded-xl shadow-sm text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={handleAddressSearch}
            disabled={geocoding}
            className="px-5 py-3.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl shadow-sm font-medium text-sm transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {geocoding ? '...' : 'Aproape de mine'}
          </button>
        </div>
      </div>

      {/* Name search */}
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
              placeholder="Cauta dupa nume..."
              className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-card)] text-[var(--color-text-main)] rounded-xl shadow-sm text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-400"
            />
          </div>
          <button onClick={() => setActiveSearch(search)} className="px-5 py-3.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl shadow-sm font-medium text-sm transition-colors">Cauta</button>
        </div>
      </div>

      {/* Kind filter */}
      <div className="max-w-4xl mx-auto px-4 pb-3">
        <div className="flex flex-wrap justify-center gap-2">
          {([['', 'Toti'], ['independent', 'Se deplaseaza la tine'], ['institutie', 'Centru de meditatii']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setKind(v)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${kind === v ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Category filters */}
      {!lockSubject && (
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => setSubject('')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${subject === '' ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>Toate</button>
            {TUTOR_SUBJECT_ORDER.map(cat => (
              <button key={cat} onClick={() => setSubject(cat)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${subject === cat ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>{TUTOR_SUBJECT_LABELS[cat]}</button>
            ))}
          </div>
        </div>
      )}

      {/* Sector filters — hidden when geo search active */}
      {!geoCoords && (
        <div className="max-w-4xl mx-auto px-4 pb-6">
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => setSector('')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${sector === '' ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>Toate sectoarele</button>
            {['1','2','3','4','5','6'].map(s => (
              <button key={s} onClick={() => setSector(s)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${sector === s ? 'bg-[var(--color-card)] text-indigo-700' : 'bg-indigo-700/50 hover:bg-indigo-700 text-white'}`}>Sector {s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="min-w-0">
            {activeAddress && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-text-light)] flex-wrap mb-1">
                <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full truncate max-w-[200px] sm:max-w-none">{activeAddress}</span>
                <button onClick={clearAddress} className="text-[var(--color-danger)] text-xs flex-shrink-0">x Sterge</button>
              </div>
            )}
            {activeSearch && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-text-light)] flex-wrap mb-1">
                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full truncate max-w-[200px] sm:max-w-none">{activeSearch}</span>
                <button onClick={clearSearch} className="text-[var(--color-danger)] text-xs flex-shrink-0">x Sterge</button>
              </div>
            )}
            <p className="text-sm text-[var(--color-text-light)]">
              <span className="font-semibold text-[var(--color-text-main)]">{loading ? initialCount : tutors.length}</span> meditatii
              {subject && ` · ${TUTOR_SUBJECT_LABELS[subject as TutorSubject]}`}
              {sector && !geoCoords && ` · Sector ${sector}`}
              {activeAddress && ` · sortate dupa distanta`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-[var(--color-text-light)]">Se incarca...</span>
          </div>
        ) : tutors.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">&#128104;&#8205;&#127979;</p>
            <h3 className="text-base sm:text-lg font-medium text-[var(--color-text-main)]">Niciun meditator gasit</h3>
            <p className="text-sm text-[var(--color-text-light)] mt-1">Incearca o alta cautare sau revino curand</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {tutors.map((p) => (
              <TutorCard key={p.id} data={p} businessMode={businessMode} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
