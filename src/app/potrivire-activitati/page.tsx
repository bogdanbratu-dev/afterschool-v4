'use client';

import { useState } from 'react';
import ClubMatchWizard from '@/components/match/ClubMatchWizard';
import { logSearch } from '@/lib/logSearch';
import { logMatchProgress } from '@/lib/logMatchProgress';
import MatchResultCard from '@/components/match/MatchResultCard';
import NearMissSection from '@/components/match/NearMissSection';
import { CLUB_CATEGORY_LABELS } from '@/lib/clubs';
import type { ClubMatchDraft } from '@/components/match/clubTypes';
import type { CriterionResult, HardFilterFailure } from '@/lib/matchScoring';

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
  schedule: string | null;
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

type ViewState = { phase: 'wizard' } | { phase: 'loading' } | { phase: 'error' } | { phase: 'results'; data: MatchResponse; matchContext: unknown };

function draftToAnswers(draft: ClubMatchDraft, sessionId: string) {
  return {
    listingType: 'club' as const,
    lat: draft.lat as number,
    lng: draft.lng as number,
    locationLabel: draft.locationLabel,
    age: draft.age as number,
    budget: draft.budget,
    budgetRequired: false,
    scheduleTime: null,
    scheduleRequired: false,
    desiredActivities: [],
    requiredActivities: [],
    category: draft.category ?? undefined,
    energy: draft.energy ?? undefined,
    social: draft.social ?? undefined,
    goal: draft.goal ?? undefined,
    competition: draft.competition ?? undefined,
    matchSessionId: sessionId,
  };
}

function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function PotrivireHeader() {
  return (
    <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <a href="/" className="text-[var(--color-primary)] font-bold text-lg">ActivKids</a>
        <a href="/" className="text-sm text-[var(--color-text-light)] hover:text-[var(--color-text)] px-3 py-1.5">← Acasă</a>
      </div>
    </header>
  );
}

export default function PotrivireActivitatiPage() {
  const [state, setState] = useState<ViewState>({ phase: 'wizard' });
  const [started, setStarted] = useState(false);
  const [sessionId] = useState(() => makeSessionId());

  async function handleComplete(draft: ClubMatchDraft) {
    setState({ phase: 'loading' });
    const answers = draftToAnswers(draft, sessionId);
    try {
      const res = await fetch('/api/match-activitati', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error('request failed');
      const data: MatchResponse = await res.json();
      logSearch({
        query: `Activitate – ${draft.category ? CLUB_CATEGORY_LABELS[draft.category] : ''} – ${draft.locationLabel || 'zonă nespecificată'}`,
        source: 'potrivire-activitati',
        lat: draft.lat ?? null,
        lng: draft.lng ?? null,
        resolved: data.matches.length > 0,
      });
      logMatchProgress({ sessionId, completed: true });
      setState({ phase: 'results', data, matchContext: answers });
    } catch {
      setState({ phase: 'error' });
    }
  }

  if (state.phase === 'wizard') {
    if (!started) {
      return (
        <>
        <PotrivireHeader />
        <div className="max-w-xl mx-auto px-6 py-10 sm:py-14">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🏆</div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text-main)] mb-2">
              Găsește activitatea potrivită pentru copilul tău
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-text-light)] max-w-md mx-auto">
              Răspunde la câteva întrebări despre interesele, personalitatea, vârsta și bugetul copilului. Primești
              gratuit un top personalizat cu activități (înot, arte marțiale, dansuri, robotică și altele) din
              București, fiecare cu scorul de potrivire explicat.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { n: 1, text: 'Răspunzi la câteva întrebări scurte' },
              { n: 2, text: 'Primești un top personalizat, cu scor explicat' },
              { n: 3, text: 'Alegi și contactezi direct' },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="w-11 h-11 mx-auto mb-2 rounded-full bg-blue-50 text-[var(--color-primary)] flex items-center justify-center text-lg font-bold">
                  {step.n}
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-text-light)]">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {[
              '🎯 100% personalizat',
              '📊 Scor explicat pe criterii',
              '🔓 Fără cont necesar',
              '🤝 Fără presiune, alegi tu',
              '⏱️ ~2 minute',
              '🔒 Fără obligații',
            ].map((badge) => (
              <div key={badge} className="text-center text-xs text-[var(--color-text-light)] bg-blue-50 rounded-lg py-1.5 px-2">
                {badge}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStarted(true)}
            className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold text-base rounded-xl shadow-sm transition-colors"
          >
            Începe chestionarul →
          </button>

          <p className="text-xs text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-6">
            🏫 Ai un club sau o școală de activități? <a href="/promovare" className="underline font-semibold">Actualizează profilul</a> — cu
            cât e mai complet (preț, vârstă, categorie), cu atât apare mai des în recomandările din
            Potrivire Activități.
          </p>
        </div>
        </>
      );
    }
    return (
      <>
        <PotrivireHeader />
        <ClubMatchWizard sessionId={sessionId} onComplete={handleComplete} />
      </>
    );
  }

  if (state.phase === 'loading') {
    return (
      <>
      <PotrivireHeader />
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mb-4" />
        <p className="font-display text-lg font-bold text-[var(--color-text-main)]">Calculăm recomandările...</p>
        <p className="text-sm text-[var(--color-text-light)] mt-1">Comparăm răspunsurile tale cu activitățile din zonă.</p>
      </div>
      </>
    );
  }

  if (state.phase === 'error') {
    return (
      <>
      <PotrivireHeader />
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-lg font-bold text-[var(--color-text-main)] mb-2">A apărut o eroare</p>
        <p className="text-sm text-[var(--color-text-light)] mb-6">Nu am putut calcula recomandările. Te rugăm încearcă din nou.</p>
        <button
          type="button"
          onClick={() => setState({ phase: 'wizard' })}
          className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-xl transition-colors"
        >
          Reia chestionarul
        </button>
      </div>
      </>
    );
  }

  const { data, matchContext } = state;

  return (
    <>
    <PotrivireHeader />
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text-main)]">Recomandările tale</h1>
          <p className="text-sm text-[var(--color-text-light)] mt-1">
            {data.matches.length > 0 ? `${data.matches.length} activități potrivite cu ce cauți` : 'Nu am găsit activități care să corespundă complet criteriilor tale'}
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
              listingType="club"
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
          <p className="text-sm text-[var(--color-text-light)]">Încearcă să relaxezi unele criterii sau bugetul pentru mai multe rezultate.</p>
        </div>
      )}

      <NearMissSection items={data.nearMisses} listingType="club" />
    </div>
    </>
  );
}
