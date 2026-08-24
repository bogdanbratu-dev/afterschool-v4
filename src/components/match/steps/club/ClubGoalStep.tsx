'use client';

import { motion } from 'framer-motion';
import { GOAL_OPTIONS } from '@/lib/clubMatchConstants';
import type { ClubStepProps } from '../../clubTypes';

export default function ClubGoalStep({ draft, update }: ClubStepProps) {
  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">Ce îți dorești pentru copil?</h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">Care e principalul tău obiectiv cu această activitate?</p>
      <div className="flex flex-col gap-2.5">
        {GOAL_OPTIONS.map((o) => (
          <motion.button
            key={o.value}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => update({ goal: o.value })}
            className={`text-left px-5 py-3.5 rounded-xl border-2 font-medium transition-colors ${
              draft.goal === o.value
                ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]'
            }`}
          >
            {o.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
