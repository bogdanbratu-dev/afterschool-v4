'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logSearch } from '@/lib/logSearch';

interface Result {
  slug: string;
  school_name: string;
  type: string;
  sector: number | null;
  street: string;
}

const TYPE_BADGE: Record<string, string> = {
  gimnaziu: 'Școală gimnazială',
  liceu: 'Liceu (clase gimnaziale)',
  colegiu: 'Colegiu (clase gimnaziale)',
  structura: 'Structură arondată',
};

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

type Mode = 'street' | 'number' | 'name';

export default function CircSearch() {
  const [mode, setMode] = useState<Mode>('street');
  const [street, setStreet] = useState('');
  const [sector, setSector] = useState('');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [resolved, setResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const query = mode === 'street' ? street : mode === 'number' ? number : name;
  const queryReady = mode === 'street' ? street.trim().length >= 3 : mode === 'number' ? number.trim().length >= 1 : name.trim().length >= 3;

  useEffect(() => {
    if (!queryReady) { setResults([]); setSuggestions([]); return; }
    setLoading(true);
    setTouched(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (mode === 'street') {
        params.set('street', street.trim());
        if (sector) params.set('sector', sector);
      } else if (mode === 'number') {
        params.set('number', number.trim());
      } else {
        params.set('name', name.trim());
      }
      fetch(`/api/circumscriptii?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          const results: Result[] = d.results || [];
          setResults(results);
          setSuggestions(d.suggestions || []);
          setResolved(!!d.resolved);
          setLoading(false);
          logSearch({
            query: query.trim(),
            source: 'circumscriptii',
            sector: mode === 'street' ? (sector ? Number(sector) : (results[0]?.sector ?? null)) : (results[0]?.sector ?? null),
            resolved: results.length > 0,
          });
        })
        .catch(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, street, sector, number, name]);

  // Cand userul alege o sugestie, pastram numarul de casa scris deja (daca exista) si inlocuim
  // doar partea de strada, ca sa nu piarda progresul introdus.
  function pickSuggestion(norm: string) {
    const trailingNumber = street.trim().match(/(\d+[A-Za-z]?)\s*$/);
    setStreet(trailingNumber ? `${titleCase(norm)} ${trailingNumber[1]}` : titleCase(norm));
  }

  function switchMode(next: Mode) {
    setMode(next);
    setResults([]);
    setSuggestions([]);
    setTouched(false);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => switchMode('street')}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            mode === 'street'
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
          }`}
        >
          Caută după stradă
        </button>
        <button
          type="button"
          onClick={() => switchMode('number')}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            mode === 'number'
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
          }`}
        >
          Caută după numărul școlii
        </button>
        <button
          type="button"
          onClick={() => switchMode('name')}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            mode === 'name'
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-[var(--color-card)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
          }`}
        >
          Caută după numele școlii
        </button>
      </div>

      {mode === 'street' ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Introduceți strada și, opțional, numărul (ex: Șos. Pantelimon 260)"
              className="w-full pl-12 pr-4 py-4 bg-[var(--color-card)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl shadow-sm text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent placeholder:text-gray-400"
            />
          </div>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="px-4 py-4 bg-[var(--color-card)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            aria-label="Sector"
          >
            <option value="">Toate sectoarele</option>
            {['1', '2', '3', '4', '5', '6'].map((s) => (
              <option key={s} value={s}>Sector {s}</option>
            ))}
          </select>
        </div>
      ) : mode === 'number' ? (
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <input
            type="text"
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Introduceți numărul școlii (ex: 82)"
            className="w-full pl-12 pr-4 py-4 bg-[var(--color-card)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl shadow-sm text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent placeholder:text-gray-400"
          />
        </div>
      ) : (
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Introduceți numele școlii (ex: Bolintineanu)"
            className="w-full pl-12 pr-4 py-4 bg-[var(--color-card)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl shadow-sm text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent placeholder:text-gray-400"
          />
        </div>
      )}

      {queryReady && (
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-[var(--color-text-light)] px-1">Se caută...</p>
          ) : results.length === 0 && touched ? (
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-light)]">
              {mode === 'street' && suggestions.length > 0 ? (
                <>
                  <p className="mb-2">Nu am găsit exact „{street}”. Poate ați vrut să scrieți:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => pickSuggestion(s)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        {titleCase(s)}
                      </button>
                    ))}
                  </div>
                </>
              ) : mode === 'street' ? (
                <>
                  Nu am găsit strada „{street}”. Încercați o formă mai scurtă a numelui (fără „Strada/Bulevardul”)
                  sau selectați sectorul. Datele provin din circumscripțiile oficiale ISMB.
                </>
              ) : mode === 'number' ? (
                <>
                  Nu am găsit nicio școală cu numărul {number}. Verificați numărul sau încercați căutarea după stradă.
                </>
              ) : (
                <>
                  Nu am găsit nicio școală cu numele „{name}”. Încercați doar partea distinctivă a numelui
                  (ex: „Bolintineanu” în loc de „Liceul Teoretic Dimitrie Bolintineanu”).
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[var(--color-text-light)] px-1">
                {mode === 'street'
                  ? (resolved
                      ? 'Adresa dvs. este arondată la:'
                      : `${results.length} ${results.length === 1 ? 'potrivire' : 'potriviri'}. Verificați intervalul de numere al străzii dumneavoastră.`)
                  : mode === 'number'
                  ? `${results.length} ${results.length === 1 ? 'rezultat' : 'rezultate'} pentru numărul ${number}.`
                  : `${results.length} ${results.length === 1 ? 'rezultat' : 'rezultate'} pentru „${name}”.`}
              </p>
              {results.map((r, i) => (
                <Link
                  key={`${r.slug}-${i}`}
                  href={`/circumscriptii/${r.slug}`}
                  className="block bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--color-primary)]">{r.school_name}</span>
                    {r.sector && <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Sector {r.sector}</span>}
                    {r.type !== 'gimnaziu' && <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{TYPE_BADGE[r.type] || r.type}</span>}
                  </div>
                  <div className="text-sm text-[var(--color-text-light)] mt-1">{r.street}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
