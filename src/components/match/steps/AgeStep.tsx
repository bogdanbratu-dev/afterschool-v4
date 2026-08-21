'use client';

import { motion } from 'framer-motion';
import { AGE_OPTIONS_AFTERSCHOOL, AGE_OPTIONS_KINDERGARTEN } from '@/lib/matchConstants';
import type { StepProps } from '../types';

export default function AgeStep({ draft, update }: StepProps) {
  const options = draft.listingType === 'kindergarten' ? AGE_OPTIONS_KINDERGARTEN : AGE_OPTIONS_AFTERSCHOOL;

  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">Vârsta copilului</h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">Arătăm doar programe potrivite pentru vârsta lui.</p>
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        {options.map((age) => (
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
