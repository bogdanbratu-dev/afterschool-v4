'use client';

import { useState } from 'react';
import MatchWizard from '@/components/match/MatchWizard';
import { logSearch } from '@/lib/logSearch';
import MatchResultCard from '@/components/match/MatchResultCard';
import NearMissSection from '@/components/match/NearMissSection';
import type { MatchDraft } from '@/components/match/types';
import type { CriterionResult, HardFilterFailure, MatchListingType } from '@/lib/matchScoring';

interface ResultListing {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  is_premium: number;
  is_featured: number;
  price_min: number | null;
  price_max: number | null;
}

interface MatchResultItem {
  listing: ResultListing;
  score: number;
  breakdown: CriterionResult[];
  failedHardFilters: HardFilterFailure[];
  distanceKm: number;
  recommendReason: string;
}

interface MatchResponse {
  matches: MatchResultItem[];
  nearMisses: MatchResultItem[];
}

type ViewState = { phase: 'wizard' } | { phase: 'loading'; listingType: MatchListingType } | { phase: 'error' } | { phase: 'results'; listingType: MatchListingType; data: MatchResponse; matchContext: unknown };

function draftToAnswers(draft: MatchDraft) {
  return {
    listingType: draft.listingType as MatchListingType,
    lat: draft.lat as number,
    lng: draft.lng as number,
    locationLabel: draft.locationLabel,
    schoolName: draft.schoolName,
    age: draft.age as number,
    budget: draft.budget,
    budgetRequired: draft.budgetRequired,
    scheduleTime: draft.scheduleTime,
    scheduleRequired: draft.scheduleRequired,
    desiredActivities: draft.desiredActivities,
    requiredActivities: draft.requiredActivities,
  };
}

export default function PotrivirePage() {
  const [state, setState] = useState<ViewState>({ phase: 'wizard' });

  async function handleComplete(draft: MatchDraft) {
    const listingType = draft.listingType as MatchListingType;
    setState({ phase: 'loading', listingType });
    const answers = draftToAnswers(draft);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error('request failed');
      const data: MatchResponse = await res.json();
      logSearch({
        query: `${listingType === 'kindergarten' ? 'Grădiniță' : 'Afterschool'} – ${draft.schoolName || draft.locationLabel || 'zonă nespecificată'}`,
        source: 'potrivire',
        lat: draft.lat ?? null,
        lng: draft.lng ?? null,
        resolved: data.matches.length > 0,
      });
      setState({ phase: 'results', listingType, data, matchContext: answers });
    } catch {
      setState({ phase: 'error' });
    }
  }

  if (state.phase === 'wizard') {
    return (
      <>
        <div className="hidden md:block max-w-xl mx-auto px-6 pt-8">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text-main)] mb-2">
            Potrivire Afterschool &amp; Grădiniță în București
          </h1>
          <p className="text-sm text-[var(--color-text-light)]">
            Răspunde la 6 întrebări despre școala sau adresa copilului, vârstă, buget și program. Primești gratuit un
            top personalizat cu afterschool-urile sau grădinițele potrivite din București, fiecare cu scorul de
            potrivire explicat pe criterii: distanță, preț, program și activități.
          </p>
        </div>
        <MatchWizard onComplete={handleComplete} />
      </>
    );
  }

  if (state.phase === 'loading') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mb-4" />
        <p className="font-display text-lg font-bold text-[var(--color-text-main)]">Calculăm potrivirile...</p>
        <p className="text-sm text-[var(--color-text-light)] mt-1">Comparăm răspunsurile tale cu {state.listingType === 'kindergarten' ? 'grădinițele' : 'afterschool-urile'} din zonă.</p>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-lg font-bold text-[var(--color-text-main)] mb-2">A apărut o eroare</p>
        <p className="text-sm text-[var(--color-text-light)] mb-6">Nu am putut calcula potrivirile. Te rugăm încearcă din nou.</p>
        <button
          type="button"
          onClick={() => setState({ phase: 'wizard' })}
          className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-xl transition-colors"
        >
          Reia chestionarul
        </button>
      </div>
    );
  }

  const { listingType, data, matchContext } = state;
  const noun = listingType === 'kindergarten' ? 'grădinițe' : 'afterschool-uri';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text-main)]">Potrivirile tale</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-1">
            {data.matches.length > 0 ? `${data.matches.length} ${noun} potrivite cu ce cauți` : `Nu am găsit ${noun} care să corespundă complet criteriilor tale`}
          </p>
        </div>
        <button type="button" onClick={() => setState({ phase: 'wizard' })} className="flex-shrink-0 text-sm font-semibold text-[var(--color-primary)] hover:underline whitespace-nowrap">
          Reia
        </button>
      </div>

      {data.matches.length > 0 ? (
        <div className="space-y-4">
          {data.matches.map((item, i) => (
            <MatchResultCard
              key={item.listing.id}
              listing={item.listing}
              listingType={listingType}
              score={item.score}
              breakdown={item.breakdown}
              distanceKm={item.distanceKm}
              recommendReason={item.recommendReason}
              rank={i + 1}
              matchContext={matchContext}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 text-center">
          <p className="text-sm text-[var(--color-text-light)]">Încearcă să relaxezi unele criterii obligatorii sau bugetul pentru mai multe rezultate.</p>
        </div>
      )}

      <NearMissSection items={data.nearMisses} listingType={listingType} />
    </div>
  );
}
