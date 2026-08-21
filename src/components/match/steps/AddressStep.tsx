'use client';

import { useState, useEffect } from 'react';
import { geocodeApprox } from '@/lib/knownLocations';
import type { StepProps } from '../types';

export default function AddressStep({ draft, update }: StepProps) {
  const [text, setText] = useState(draft.locationLabel || '');
  const [sector, setSector] = useState('');

  useEffect(() => {
    if (text.trim().length < 3 && !sector) { return; }
    const timer = setTimeout(() => {
      const { lat, lng } = geocodeApprox(text, sector);
      update({ lat, lng, locationLabel: text.trim() || `Sector ${sector}` });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, sector]);

  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">Adresa sau zona ta</h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">Căutăm grădinițe aproape de tine.</p>

      <div className="relative mb-3">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex: Piața Victoriei, Drumul Taberei..."
          className="w-full pl-12 pr-4 py-4 bg-[var(--color-card)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-gray-400"
        />
      </div>

      <select
        value={sector}
        onChange={(e) => setSector(e.target.value)}
        className="w-full px-4 py-3 bg-[var(--color-card)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        <option value="">Sau alege doar sectorul</option>
        {['1', '2', '3', '4', '5', '6'].map((s) => <option key={s} value={s}>Sector {s}</option>)}
      </select>

      {draft.lat != null && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-green-dark)] bg-green-50 px-3 py-2 rounded-lg">
          <span>✅</span> Zonă setată: <strong>{draft.locationLabel}</strong>
        </div>
      )}
    </div>
  );
}
