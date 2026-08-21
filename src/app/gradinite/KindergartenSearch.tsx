'use client';

import { useState, useEffect, useCallback } from 'react';
import KindergartenCard from '@/components/KindergartenCard';
import KindergartenFilterPanel from '@/components/KindergartenFilterPanel';

interface KData {
  id: number; name: string; type: 'gradinita' | 'cresa'; address: string; sector: number | null;
  phone: string | null; email: string | null; website: string | null; facebook_url: string | null;
  price_min: number | null; price_max: number | null; program: string | null;
  program_start: string | null; program_end: string | null;
  age_min: number | null; age_max: number | null; description: string | null; editorial_summary: string | null;
  activities: string | null; photo_urls: string | null; availability: 'available' | 'full' | 'unknown';
  is_premium: number; is_featured?: number; contacts_hidden: number;
  rating?: number | null; reviews_count?: number | null; maps_url?: string | null; distance?: number;
}

// Geocoding simplu pe zone cunoscute din Bucuresti (ca la afterschool)
const KNOWN: Record<string, [number, number]> = {
  'piata victoriei': [44.4528, 26.0852], 'piata unirii': [44.4268, 26.1025], 'piata romana': [44.4466, 26.0970],
  'universitate': [44.4358, 26.1003], 'tineretului': [44.4096, 26.1030], 'dristor': [44.4223, 26.1280],
  'titan': [44.4147, 26.1454], 'drumul taberei': [44.4219, 26.0186], 'militari': [44.4306, 26.0106],
  'crangasi': [44.4480, 26.0340], 'obor': [44.4500, 26.1200], 'pantelimon': [44.4410, 26.1480],
  'berceni': [44.3940, 26.1060], 'rahova': [44.4110, 26.0710], 'cotroceni': [44.4330, 26.0620],
  'floreasca': [44.4600, 26.0960], 'dorobanti': [44.4520, 26.0900], 'aviatorilor': [44.4560, 26.0850],
  'domenii': [44.4660, 26.0600], 'colentina': [44.4600, 26.1250], 'iancului': [44.4400, 26.1200],
  'stefan cel mare': [44.4520, 26.1050], 'mosilor': [44.4420, 26.1080], 'pipera': [44.4760, 26.1230],
  'baneasa': [44.5050, 26.0850], 'vitan': [44.4150, 26.1300], 'giurgiului': [44.3850, 26.0950],
};

export default function KindergartenSearch({ initialCount, initialType }: { initialCount: number; initialType?: 'gradinita' | 'cresa' }) {
  const [items, setItems] = useState<KData[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessMode, setBusinessMode] = useState(false);
  const [address, setAddress] = useState('');
  const [loc, setLoc] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [filters, setFilters] = useState({
    type: initialType || '',
    priceMax: '',
    dropoffTime: '',
    pickupMin: '',
    activities: [] as string[],
    sector: '',
    radiusKm: '',
    onlyAvailable: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setBusinessMode(d.business_mode));
    fetch('/api/analytics/pageview', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/gradinite', device: window.innerWidth < 768 ? 'mobile' : 'desktop', referrer: document.referrer || '' }) });
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (loc) { params.set('lat', String(loc.lat)); params.set('lng', String(loc.lng)); }
    if (filters.sector) params.set('sector', filters.sector);
    if (filters.type) params.set('type', filters.type);
    if (filters.priceMax) params.set('priceMax', filters.priceMax);
    if (filters.dropoffTime) params.set('dropoffTime', filters.dropoffTime);
    if (filters.pickupMin) params.set('pickupMin', filters.pickupMin);
    if (filters.onlyAvailable) params.set('onlyAvailable', 'true');
    if (filters.activities.length > 0) params.set('activities', filters.activities.join(','));
    try {
      const res = await fetch(`/api/kindergartens?${params.toString()}`);
      let data: KData[] = await res.json();
      if (loc && filters.radiusKm) {
        const maxDist = parseFloat(filters.radiusKm);
        data = data.filter(k => (k.distance ?? Infinity) <= maxDist);
      }
      setItems(data);
    } catch {}
    setLoading(false);
  }, [loc, filters]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const geocode = () => {
    const norm = address.toLowerCase().trim();
    if (!norm) { setLoc(null); return; }
    for (const [k, c] of Object.entries(KNOWN)) {
      if (norm.includes(k)) { setLoc({ lat: c[0], lng: c[1], label: address }); return; }
    }
    setLoc({ lat: 44.4268, lng: 26.1025, label: address }); // centru Bucuresti fallback
  };

  const activeFilterCount = [filters.type, filters.priceMax, filters.dropoffTime, filters.pickupMin, filters.sector, filters.radiusKm].filter(Boolean).length
    + filters.activities.length + (filters.onlyAvailable ? 1 : 0);

  return (
    <>
      {/* Address search */}
      <div className="max-w-2xl mx-auto mb-4 px-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => e.key === 'Enter' && geocode()}
              placeholder="Introdu adresa sau zona (ex: Floreasca, Drumul Taberei, Pipera...)"
              className="w-full pl-12 pr-4 py-3.5 bg-[var(--color-card)] text-[var(--color-text-main)] rounded-xl shadow-sm text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-gray-400" />
          </div>
          <button onClick={geocode} className="px-5 py-3.5 bg-pink-700 hover:bg-pink-800 text-white rounded-xl shadow-sm font-medium text-sm transition-colors">Caută</button>
        </div>
        {loc && (<div className="mt-2 text-xs text-[var(--color-text-light)]">Caut langa: <span className="font-semibold text-pink-600">{loc.label}</span> <button onClick={() => { setLoc(null); setAddress(''); }} className="text-[var(--color-danger)] ml-1">✕ reset</button></div>)}
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <p className="text-sm text-[var(--color-text-light)]">
            <span className="font-semibold text-[var(--color-text-main)]">{loading ? initialCount : items.length}</span> rezultate
          </p>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-3 bg-pink-700 hover:bg-pink-800 active:opacity-90 text-white rounded-xl text-sm font-semibold shadow-md transition-all md:hidden"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtreaza
            {activeFilterCount > 0 && (<span className="w-2 h-2 rounded-full bg-white" />)}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden md:block w-72 flex-shrink-0">
            <div className="sticky top-4">
              <KindergartenFilterPanel filters={filters} onFilterChange={setFilters} hasLocation={!!loc} />
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
                  <KindergartenFilterPanel filters={filters} onFilterChange={(f) => { setFilters(f); }} hasLocation={!!loc} />
                  <button
                    onClick={() => setShowFilters(false)}
                    className="mt-4 w-full py-3 bg-pink-700 text-white rounded-lg font-medium text-sm"
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
              <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : items.length === 0 ? (
              <div className="text-center py-16"><p className="text-4xl mb-4">🧸</p><h3 className="text-base sm:text-lg font-medium text-[var(--color-text-main)]">Nicio grădiniță găsită</h3></div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {items.map(k => (<KindergartenCard key={k.id} data={k} businessMode={businessMode} />))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
