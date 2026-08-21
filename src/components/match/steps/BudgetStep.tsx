'use client';

import { motion } from 'framer-motion';
import { BUDGET_BUCKETS } from '@/lib/matchConstants';
import type { StepProps } from '../types';

export default function BudgetStep({ draft, update }: StepProps) {
  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">Bugetul lunar</h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">Cât ești dispus(ă) să plătești pe lună?</p>
      <div className="flex flex-col gap-2.5">
        {BUDGET_BUCKETS.map((b) => {
          const selected = draft.budgetPicked && draft.budget === b.value;
          return (
            <motion.button
              key={b.label}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => update({ budget: b.value, budgetPicked: true })}
              className={`text-left px-5 py-3.5 rounded-xl border-2 font-medium transition-colors ${
                selected
                  ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]'
              }`}
            >
              {b.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
