'use client';

import { motion } from 'framer-motion';
import { CLUB_AGE_OPTIONS } from '@/lib/clubMatchConstants';
import type { ClubStepProps } from '../../clubTypes';

export default function ClubAgeStep({ draft, update }: ClubStepProps) {
  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">Vârsta copilului</h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">Arătăm doar activități potrivite pentru vârsta lui.</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {CLUB_AGE_OPTIONS.map((age) => (
          <motion.button
            key={age}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => update({ age })}
            className={`py-4 rounded-2xl border-2 font-display font-bold text-lg transition-colors ${
              draft.age === age
                ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]'
            }`}
          >
            {age} ani
          </motion.button>
        ))}
      </div>
    </div>
  );
}
