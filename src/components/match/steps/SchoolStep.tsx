'use client';

import { useState, useEffect } from 'react';
import type { StepProps } from '../types';

interface Result {
  slug: string;
  school_name: string;
  sector: number | null;
  street: string;
  lat: number | null;
  lng: number | null;
}

export default function SchoolStep({ draft, update }: StepProps) {
  const [query, setQuery] = useState(draft.schoolName || '');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const trimmedQuery = query.trim();
  const numberQuery = trimmedQuery.match(/^nr\.?\s*(\d+)$/i)?.[1] || (/^\d+$/.test(trimmedQuery) ? trimmedQuery : null);
  const searchMinLength = numberQuery ? 1 : 3;

  useEffect(() => {
    if (draft.schoolName && query === draft.schoolName) { setResults([]); return; }
    const trimmed = query.trim();
    const numQuery = trimmed.match(/^nr\.?\s*(\d+)$/i)?.[1] || (/^\d+$/.test(trimmed) ? trimmed : null);
    const minLength = numQuery ? 1 : 3;
    if (trimmed.length < minLength) { setResults([]); return; }
    setLoading(true);
    setTouched(true);
    const timer = setTimeout(() => {
      const param = numQuery ? `number=${encodeURIComponent(numQuery)}` : `name=${encodeURIComponent(trimmed)}`;
      fetch(`/api/circumscriptii?${param}`)
        .then((r) => r.json())
        .then((d) => { setResults((d.results || []).filter((r: Result) => r.lat && r.lng)); setLoading(false); })
        .catch(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function pick(r: Result) {
    if (r.lat == null || r.lng == null) return;
    setQuery(r.school_name);
    setResults([]);
    update({ lat: r.lat, lng: r.lng, schoolName: r.school_name, locationLabel: r.school_name });
  }

  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">Școala copilului</h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">Căutăm afterschool-uri aproape de școala lui.</p>

      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (draft.lat != null) update({ lat: null, lng: null }); }}
          placeholder="Numele sau numărul școlii (ex: Bolintineanu sau 82)"
          className="w-full pl-12 pr-4 py-4 bg-[var(--color-card)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-gray-400"
        />
      </div>

      {draft.lat != null && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-green-dark)] bg-green-50 px-3 py-2 rounded-lg">
          <span>✅</span> Am găsit școala: <strong>{draft.schoolName}</strong>
        </div>
      )}

      {trimmedQuery.length >= searchMinLength && draft.lat == null && (
        <div className="mt-3">
          {loading ? (
            <p className="text-sm text-[var(--color-text-light)]">Se caută...</p>
          ) : results.length === 0 && touched ? (
            <p className="text-sm text-[var(--color-text-light)]">Nu am găsit nicio școală cu acest nume. Încearcă doar o parte din nume.</p>
          ) : (
            <div className="space-y-2">
              {results.map((r) => (
                <button
                  key={r.slug}
                  type="button"
                  onClick={() => pick(r)}
                  className="w-full text-left bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-3 hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="font-semibold text-[var(--color-primary)]">{r.school_name}</div>
                  <div className="text-xs text-[var(--color-text-light)]">{r.street}{r.sector ? ` · Sector ${r.sector}` : ''}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
