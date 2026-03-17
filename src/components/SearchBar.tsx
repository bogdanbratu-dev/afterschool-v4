'use client';

import { useState, useEffect, useRef } from 'react';

interface School {
  id: number;
  number: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface AfterSchool {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface SearchBarProps {
  onSearch: (lat: number, lng: number, label: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [mode, setMode] = useState<'school' | 'address' | 'afterschool'>('school');
  const [query, setQuery] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [address, setAddress] = useState('');
  const [afterschoolQuery, setAfterschoolQuery] = useState('');
  const [afterschools, setAfterschools] = useState<AfterSchool[]>([]);
  const [showAfterSchoolDropdown, setShowAfterSchoolDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const afterschoolDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'school' && query.length > 0) {
      const timer = setTimeout(() => {
        fetch(`/api/schools?q=${encodeURIComponent(query)}`)
          .then(r => r.json())
          .then(data => {
            setSchools(data);
            setShowDropdown(true);
          });
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowDropdown(false);
    }
  }, [query, mode]);

  useEffect(() => {
    if (mode === 'afterschool' && afterschoolQuery.length > 1) {
      const timer = setTimeout(() => {
        fetch(`/api/afterschools?name=${encodeURIComponent(afterschoolQuery)}`)
          .then(r => r.json())
          .then(data => {
            setAfterschools(data);
            setShowAfterSchoolDropdown(true);
          });
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowAfterSchoolDropdown(false);
    }
  }, [afterschoolQuery, mode]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (afterschoolDropdownRef.current && !afterschoolDropdownRef.current.contains(e.target as Node)) {
        setShowAfterSchoolDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSchoolSelect = (school: School) => {
    setQuery(`Scoala nr. ${school.number} - ${school.name}`);
    setShowDropdown(false);
    onSearch(school.lat, school.lng, `Scoala nr. ${school.number}`);
  };

  const handleAfterSchoolSelect = (as: AfterSchool) => {
    setAfterschoolQuery(as.name);
    setShowAfterSchoolDropdown(false);
    onSearch(as.lat, as.lng, as.name);
  };

  const handleAddressSearch = () => {
    if (!address.trim()) return;
    // Use a simple geocoding approach - map known Bucharest streets to approximate coordinates
    // In production, you'd use a geocoding API
    const knownLocations: Record<string, [number, number]> = {
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
    };

    const normalized = address.toLowerCase().trim();
    for (const [key, coords] of Object.entries(knownLocations)) {
      if (normalized.includes(key)) {
        onSearch(coords[0], coords[1], address);
        return;
      }
    }

    // Default to center of Bucharest if address not recognized
    const centerLat = 44.4268;
    const centerLng = 26.1025;
    onSearch(centerLat, centerLng, address);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Mode Toggle */}
      <div className="flex mb-4 bg-[var(--color-card)] rounded-lg shadow-sm border border-[var(--color-border)] overflow-hidden">
        <button
          onClick={() => setMode('school')}
          className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 ${
            mode === 'school' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-light)] hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="hidden xs:inline">Scoala</span>
          <span className="inline xs:hidden text-[10px] leading-tight text-center">Scoala</span>
        </button>
        <button
          onClick={() => setMode('address')}
          className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 ${
            mode === 'address' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-light)] hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] sm:text-sm leading-tight text-center">Adresa</span>
        </button>
        <button
          onClick={() => setMode('afterschool')}
          className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 ${
            mode === 'afterschool' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-light)] hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[10px] sm:text-sm leading-tight text-center">Afterschool</span>
        </button>
      </div>

      {/* Search Input */}
      {mode === 'school' ? (
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Introduceti numarul scolii (ex: 17, 170, 195...)"
              className="w-full pl-12 pr-4 py-4 bg-[var(--color-card)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent placeholder:text-gray-400"
            />
          </div>
          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {schools.length > 0 ? (
                schools.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => handleSchoolSelect(school)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-[var(--color-border)] last:border-0"
                  >
                    <span className="font-semibold text-[var(--color-primary)]">Nr. {school.number}</span>
                    <span className="text-[var(--color-text-main)] ml-2">{school.name}</span>
                    <div className="text-sm text-[var(--color-text-light)]">{school.address}</div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-[var(--color-text-light)]">
                  Nu s-a gasit nicio scoala cu numarul &quot;{query}&quot;
                </div>
              )}
            </div>
          )}
        </div>
      ) : mode === 'afterschool' ? (
        <div className="relative" ref={afterschoolDropdownRef}>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={afterschoolQuery}
              onChange={(e) => setAfterschoolQuery(e.target.value)}
              placeholder="Introduceti numele afterschool-ului (ex: Young Academics...)"
              className="w-full pl-12 pr-4 py-4 bg-[var(--color-card)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent placeholder:text-gray-400"
            />
          </div>
          {showAfterSchoolDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {afterschools.length > 0 ? (
                afterschools.map((as) => (
                  <button
                    key={as.id}
                    onClick={() => handleAfterSchoolSelect(as)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-[var(--color-border)] last:border-0"
                  >
                    <span className="font-semibold text-[var(--color-primary)]">{as.name}</span>
                    <div className="text-sm text-[var(--color-text-light)]">{as.address}</div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-[var(--color-text-light)]">
                  Nu s-a gasit niciun afterschool cu numele &quot;{afterschoolQuery}&quot;
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
              placeholder="Introduceti adresa sau zona (ex: Piata Victoriei, Drumul Taberei...)"
              className="w-full pl-12 pr-4 py-4 bg-[var(--color-card)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={handleAddressSearch}
            className="px-6 py-4 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm font-medium"
          >
            Cauta
          </button>
        </div>
      )}
    </div>
  );
}
