'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { logMatchProgress } from '@/lib/logMatchProgress';
import { EMPTY_DRAFT, type MatchDraft } from './types';
import ListingTypeStep from './steps/ListingTypeStep';
import SchoolStep from './steps/SchoolStep';
import AddressStep from './steps/AddressStep';
import AgeStep from './steps/AgeStep';
import BudgetStep from './steps/BudgetStep';
import ScheduleStep from './steps/ScheduleStep';
import PrioritiesStep from './steps/PrioritiesStep';

type StepId = 'listingType' | 'location' | 'age' | 'budget' | 'schedule' | 'priorities';

const WIZARD_STEPS: StepId[] = ['listingType', 'location', 'age', 'budget', 'schedule', 'priorities'];

function isStepValid(stepId: StepId, draft: MatchDraft): boolean {
  switch (stepId) {
    case 'listingType': return draft.listingType != null;
    case 'location': return draft.lat != null && draft.lng != null;
    case 'age': return draft.age != null;
    case 'budget': return draft.budgetPicked;
    case 'schedule': return draft.scheduleTime != null;
    case 'priorities': return true;
  }
}

export default function MatchWizard({ sessionId, onComplete }: { sessionId: string; onComplete: (draft: MatchDraft) => void }) {
  const [draft, setDraft] = useState<MatchDraft>(EMPTY_DRAFT);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const steps = WIZARD_STEPS;
  const stepId = steps[index];
  const valid = isStepValid(stepId, draft);
  const isLast = index === steps.length - 1;

  useEffect(() => {
    logMatchProgress({
      sessionId, stepId, stepIndex: index, totalSteps: steps.length,
      listingType: draft.listingType ?? null, draft,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  function update(patch: Partial<MatchDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function goNext() {
    if (!valid) return;
    if (isLast) { onComplete(draft); return; }
    setDirection(1);
    setIndex((i) => i + 1);
  }

  function goBack() {
    if (index === 0) return;
    setDirection(-1);
    setIndex((i) => i - 1);
  }

  function renderStep() {
    switch (stepId) {
      case 'listingType': return <ListingTypeStep draft={draft} update={update} />;
      case 'location': return draft.listingType === 'kindergarten' ? <AddressStep draft={draft} update={update} /> : <SchoolStep draft={draft} update={update} />;
      case 'age': return <AgeStep draft={draft} update={update} />;
      case 'budget': return <BudgetStep draft={draft} update={update} />;
      case 'schedule': return <ScheduleStep draft={draft} update={update} />;
      case 'priorities': return <PrioritiesStep draft={draft} update={update} />;
    }
  }

  const progressPct = Math.round(((index + 1) / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[var(--color-bg)] md:static md:z-auto md:my-8 sm:md:my-10 md:mx-auto md:max-w-xl md:h-auto md:rounded-[28px] md:shadow-md md:border md:border-[var(--color-border)] md:overflow-hidden">
      {/* Header */}
      <div className="safe-top flex-shrink-0 bg-[var(--color-card)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={index === 0 ? undefined : goBack}
            className={`p-1.5 -ml-1.5 rounded-lg transition-colors ${index === 0 ? 'invisible' : 'text-[var(--color-text-light)] hover:bg-[var(--color-bg)]'}`}
            aria-label="Înapoi"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 text-center text-xs font-semibold text-[var(--color-text-light)]">
            Pasul {index + 1} din {steps.length}
          </div>
          <Link href="/" className="p-1.5 -mr-1.5 rounded-lg text-[var(--color-text-light)] hover:bg-[var(--color-bg)]" aria-label="Închide">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
        <div className="h-1.5 bg-[var(--color-border)]">
          <motion.div
            className="h-full bg-[var(--color-primary)]"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={stepId}
            custom={direction}
            initial={{ x: direction * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -40, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="safe-bottom flex-shrink-0 bg-[var(--color-card)] border-t border-[var(--color-border)] px-5 py-3 md:px-8">
        <button
          type="button"
          onClick={goNext}
          disabled={!valid}
          className="w-full py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm transition-colors"
        >
          {isLast ? 'Vezi potrivirile →' : 'Continuă'}
        </button>
      </div>
    </div>
  );
}
