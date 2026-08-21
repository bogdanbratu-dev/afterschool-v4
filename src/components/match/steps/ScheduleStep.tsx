'use client';

import { motion } from 'framer-motion';
import { SCHEDULE_TIME_OPTIONS } from '@/lib/matchConstants';
import type { StepProps } from '../types';

export default function ScheduleStep({ draft, update }: StepProps) {
  const isKindergarten = draft.listingType === 'kindergarten';
  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">
        {isKindergarten ? 'Program dorit' : 'Ora până la care ai nevoie de supraveghere'}
      </h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">
        {isKindergarten ? 'Până la ce oră ai nevoie ca grădinița să aibă program?' : 'Până la ce oră poți cel mai devreme să-ți iei copilul?'}
      </p>
      <div className="grid grid-cols-4 gap-2.5">
        {SCHEDULE_TIME_OPTIONS.map((t) => (
          <motion.button
            key={t}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => update({ scheduleTime: t })}
            className={`py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${
              draft.scheduleTime === t
                ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]'
            }`}
          >
            {t}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
